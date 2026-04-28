<?php

namespace App\Services\Moodle;

use App\Jobs\Moodle\SendMoodleNotificationEmailJob;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

class MoodleNotificationCenter
{
    private const MAX_ITEMS = 8;
    private const EVENTS_TTL_SECONDS = 1209600;
    private const SNAPSHOT_TTL_SECONDS = 1209600;
    private const DISMISSED_TTL_SECONDS = 1209600;
    private const EMAILED_TTL_SECONDS = 1209600;

    public function __construct(
        private readonly MoodleAccessUrlService $accessUrl,
    ) {
    }

    public function markAllAsRead(User $user): void
    {
        $feed = $this->getEventFeed($user);
        $ids = [];

        foreach ($feed as $item) {
            if (! is_array($item)) {
                continue;
            }

            $id = is_string($item['id'] ?? null) ? trim((string) $item['id']) : '';
            if ($id !== '') {
                $ids[] = $id;
            }
        }

        $this->markItemsAsRead($user, $ids);
    }

    /**
     * @param  array<int, string>  $ids
     */
    public function markItemsAsRead(User $user, array $ids): void
    {
        $current = $this->getDismissedIds($user);
        $nowIso = CarbonImmutable::now()->toIso8601String();

        foreach ($ids as $id) {
            $normalizedId = trim((string) $id);
            if ($normalizedId === '') {
                continue;
            }

            $current[$normalizedId] = $nowIso;
        }

        Cache::put($this->dismissedKey($user), $current, now()->addSeconds(self::DISMISSED_TTL_SECONDS));
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @param  array<int, array<string, mixed>>  $messages
     * @return array{unreadCount:int,items:array<int,array<string,mixed>>}
     */
    public function buildForUser(User $user, array $tasks, array $messages = [], bool $dispatchEmails = false): array
    {
        $preferences = $this->resolvePreferences($user);
        $now = CarbonImmutable::now();
        $snapshot = $this->buildSnapshot($tasks);
        $previousSnapshot = $this->getSnapshot($user);
        $eventFeed = $this->getEventFeed($user);

        $eventFeed = $this->appendDiffEvents($eventFeed, $snapshot, $previousSnapshot, $now);
        $eventFeed = $this->appendMessageEvents($eventFeed, $messages, $now);
        $eventFeed = $this->pruneEventFeed($eventFeed, $now);

        Cache::put($this->snapshotKey($user), $snapshot, now()->addSeconds(self::SNAPSHOT_TTL_SECONDS));
        Cache::put($this->eventsKey($user), $eventFeed, now()->addSeconds(self::EVENTS_TTL_SECONDS));

        $items = $eventFeed;

        foreach ($tasks as $task) {
            if (! is_array($task)) {
                continue;
            }

            if (! (bool) ($task['pendiente'] ?? false)) {
                continue;
            }

            $dueAt = $this->resolveDueAt($task);
            if (! $dueAt) {
                continue;
            }

            $remainingMinutes = $now->diffInMinutes($dueAt, false);
            $entry = $this->buildNotificationFromTask($task, $dueAt, $remainingMinutes, $preferences, $now);
            $customEntry = $this->buildCustomThresholdNotification($task, $dueAt, $remainingMinutes, $preferences);

            if ($entry === null) {
                if ($customEntry !== null) {
                    $items[] = $customEntry;
                }

                continue;
            }

            $items[] = $entry;

            if ($customEntry !== null) {
                $items[] = $customEntry;
            }
        }

        $items = $this->deduplicateById($items);

        usort($items, static function (array $a, array $b): int {
            $severity = [
                'critical' => 0,
                'warning' => 1,
                'info' => 2,
            ];

            $aSeverity = $severity[(string) ($a['level'] ?? 'info')] ?? 9;
            $bSeverity = $severity[(string) ($b['level'] ?? 'info')] ?? 9;

            if ($aSeverity !== $bSeverity) {
                return $aSeverity <=> $bSeverity;
            }

            $aCreated = strtotime((string) ($a['createdAt'] ?? '')) ?: 0;
            $bCreated = strtotime((string) ($b['createdAt'] ?? '')) ?: 0;

            if ($aCreated !== $bCreated) {
                return $bCreated <=> $aCreated;
            }

            return strcmp((string) ($a['id'] ?? ''), (string) ($b['id'] ?? ''));
        });

        $items = array_slice($items, 0, self::MAX_ITEMS);
        $dismissed = $this->getDismissedIds($user);

        $mapped = array_map(function (array $item) use ($dismissed): array {
            $id = (string) ($item['id'] ?? '');
            $isRead = isset($dismissed[$id]);
            $url = is_string($item['url'] ?? null) ? (string) $item['url'] : '/dashboard';
            $resolvedUrl = $this->accessUrl->toAccessibleUrl($url) ?? '/dashboard';

            return [
                'id' => $id,
                'title' => (string) ($item['title'] ?? 'Notificación'),
                'message' => (string) ($item['message'] ?? ''),
                'course' => (string) ($item['course'] ?? 'Sistema'),
                'level' => (string) ($item['level'] ?? 'info'),
                'dueLabel' => (string) ($item['dueLabel'] ?? ''),
                'url' => $resolvedUrl,
                'trigger' => (string) ($item['trigger'] ?? 'system'),
                'category' => (string) ($item['category'] ?? 'MENSAJE DEL SISTEMA'),
                'meta' => (string) ($item['meta'] ?? ''),
                'isRead' => $isRead,
            ];
        }, $items);

        $unreadCount = count(array_filter($mapped, static fn (array $item): bool => ! (bool) ($item['isRead'] ?? false)));

        if ($dispatchEmails) {
            $this->dispatchEmailNotifications($user, $mapped, $preferences);
        }

        return [
            'unreadCount' => $unreadCount,
            'items' => $mapped,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    private function deduplicateById(array $items): array
    {
        $unique = [];

        foreach ($items as $item) {
            $id = is_string($item['id'] ?? null) ? (string) $item['id'] : '';

            if ($id === '') {
                continue;
            }

            $unique[$id] = $item;
        }

        return array_values($unique);
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<string, array<string, string>>
     */
    private function buildSnapshot(array $tasks): array
    {
        $snapshot = [];

        foreach ($tasks as $task) {
            if (! is_array($task)) {
                continue;
            }

            $key = $this->taskKey($task);
            if ($key === null) {
                continue;
            }

            $snapshot[$key] = [
                'title' => trim((string) ($task['nombre'] ?? 'Actividad')),
                'course' => trim((string) ($task['asignatura_nombre'] ?? 'Asignatura')),
                'due_iso' => trim((string) ($task['fecha_iso'] ?? '')),
                'grade' => trim((string) ($task['calificacion'] ?? '')),
                'feedback' => trim((string) ($task['retroalimentacion'] ?? '')),
                'url' => trim((string) ($task['url'] ?? '')),
            ];
        }

        return $snapshot;
    }

    /**
     * @return array<string, array<string, string>>
     */
    private function getSnapshot(User $user): array
    {
        $cached = Cache::get($this->snapshotKey($user));

        return is_array($cached) ? $cached : [];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function getEventFeed(User $user): array
    {
        $cached = Cache::get($this->eventsKey($user));

        return is_array($cached) ? $cached : [];
    }

    /**
     * @return array<string, string>
     */
    private function getDismissedIds(User $user): array
    {
        $cached = Cache::get($this->dismissedKey($user));

        if (! is_array($cached)) {
            return [];
        }

        $filtered = [];
        foreach ($cached as $id => $value) {
            if (! is_string($id) || $id === '') {
                continue;
            }

            $filtered[$id] = is_string($value) ? $value : CarbonImmutable::now()->toIso8601String();
        }

        return $filtered;
    }

    /**
     * @param  array<int, array<string, mixed>>  $eventFeed
     * @param  array<string, array<string, string>>  $snapshot
     * @param  array<string, array<string, string>>  $previousSnapshot
     * @return array<int, array<string, mixed>>
     */
    private function appendDiffEvents(array $eventFeed, array $snapshot, array $previousSnapshot, CarbonImmutable $now): array
    {
        if ($previousSnapshot === []) {
            return $eventFeed;
        }

        foreach ($snapshot as $taskKey => $current) {
            $previous = $previousSnapshot[$taskKey] ?? null;

            if ($previous === null) {
                $eventFeed[] = $this->buildEventItem(
                    type: 'new_task',
                    title: $current['title'] !== '' ? $current['title'] : 'Nueva actividad',
                    course: $current['course'] !== '' ? $current['course'] : 'Asignatura',
                    message: 'Se ha creado una nueva tarea en Moodle.',
                    url: $current['url'] !== '' ? $current['url'] : '/dashboard',
                    meta: 'NUEVA TAREA',
                    category: 'NUEVA TAREA',
                    level: 'info',
                    fingerprint: $taskKey.'|new_task',
                    createdAt: $now,
                );

                continue;
            }

            if (($current['due_iso'] ?? '') !== '' && ($previous['due_iso'] ?? '') !== '' && $current['due_iso'] !== $previous['due_iso']) {
                $eventFeed[] = $this->buildEventItem(
                    type: 'deadline_changed',
                    title: $current['title'] !== '' ? $current['title'] : 'Fecha de entrega actualizada',
                    course: $current['course'] !== '' ? $current['course'] : 'Asignatura',
                    message: 'La fecha de entrega fue modificada por el profesor.',
                    url: $current['url'] !== '' ? $current['url'] : '/dashboard',
                    meta: 'NUEVA FECHA',
                    category: 'ENTREGA MODIFICADA',
                    level: 'warning',
                    fingerprint: $taskKey.'|deadline_changed|'.$current['due_iso'],
                    createdAt: $now,
                );
            }

            $hasGradeNow = $this->hasMeaningfulValue($current['grade'] ?? '');
            $hadGradeBefore = $this->hasMeaningfulValue($previous['grade'] ?? '');

            if ($hasGradeNow && ! $hadGradeBefore) {
                $eventFeed[] = $this->buildEventItem(
                    type: 'new_grade',
                    title: $current['title'] !== '' ? $current['title'] : 'Nueva calificación',
                    course: $current['course'] !== '' ? $current['course'] : 'Asignatura',
                    message: 'Se ha publicado una nueva calificación.',
                    url: $current['url'] !== '' ? $current['url'] : '/dashboard',
                    meta: 'NOTA: '.trim((string) $current['grade']),
                    category: 'NUEVA CALIFICACIÓN',
                    level: 'info',
                    fingerprint: $taskKey.'|new_grade|'.trim((string) $current['grade']),
                    createdAt: $now,
                );
            }

            $hasFeedbackNow = $this->hasMeaningfulValue($current['feedback'] ?? '');
            $hadFeedbackBefore = $this->hasMeaningfulValue($previous['feedback'] ?? '');

            if ($hasFeedbackNow && ! $hadFeedbackBefore) {
                $eventFeed[] = $this->buildEventItem(
                    type: 'new_feedback',
                    title: $current['title'] !== '' ? $current['title'] : 'Nueva retroalimentación',
                    course: $current['course'] !== '' ? $current['course'] : 'Asignatura',
                    message: 'Hay nueva retroalimentación del profesor en esta actividad.',
                    url: $current['url'] !== '' ? $current['url'] : '/dashboard',
                    meta: 'NUEVO FEEDBACK',
                    category: 'NUEVA RETROALIMENTACIÓN',
                    level: 'info',
                    fingerprint: $taskKey.'|new_feedback|'.md5((string) $current['feedback']),
                    createdAt: $now,
                );
            }
        }

        return $eventFeed;
    }

    /**
     * @param  array<int, array<string, mixed>>  $eventFeed
     * @param  array<int, array<string, mixed>>  $messages
     * @return array<int, array<string, mixed>>
     */
    private function appendMessageEvents(array $eventFeed, array $messages, CarbonImmutable $now): array
    {
        foreach ($messages as $message) {
            if (! is_array($message)) {
                continue;
            }

            $messageId = trim((string) ($message['id'] ?? ''));

            if ($messageId === '') {
                continue;
            }

            $sender = trim((string) ($message['sender'] ?? 'Moodle'));
            $title = trim((string) ($message['title'] ?? 'Nuevo mensaje en Moodle'));
            $content = trim((string) ($message['message'] ?? 'Has recibido un nuevo mensaje en Moodle.'));
            $course = trim((string) ($message['course'] ?? 'Mensajeria Moodle'));
            $url = trim((string) ($message['url'] ?? ''));

            $eventFeed[] = $this->buildEventItem(
                type: 'moodle_message',
                title: $title !== '' ? $title : 'Nuevo mensaje en Moodle',
                course: $course !== '' ? $course : 'Mensajeria Moodle',
                message: $content !== '' ? $content : 'Has recibido un nuevo mensaje en Moodle.',
                url: $url !== '' ? $url : '/dashboard',
                meta: 'DE: '.($sender !== '' ? $sender : 'Moodle'),
                category: 'MENSAJERIA MOODLE',
                level: 'info',
                fingerprint: $messageId,
                createdAt: $this->resolveEventCreatedAt($message['createdAt'] ?? null, $now),
            );
        }

        return $eventFeed;
    }

    private function resolveEventCreatedAt(mixed $value, CarbonImmutable $fallback): CarbonImmutable
    {
        if (is_int($value) && $value > 0) {
            return CarbonImmutable::createFromTimestamp($value);
        }

        if (is_string($value) && trim($value) !== '') {
            try {
                return CarbonImmutable::parse($value);
            } catch (\Throwable) {
                return $fallback;
            }
        }

        return $fallback;
    }

    /**
     * @param  array<int, array<string, mixed>>  $eventFeed
     * @return array<int, array<string, mixed>>
     */
    private function pruneEventFeed(array $eventFeed, CarbonImmutable $now): array
    {
        $result = [];
        $seen = [];

        foreach ($eventFeed as $item) {
            if (! is_array($item)) {
                continue;
            }

            $id = is_string($item['id'] ?? null) ? trim((string) $item['id']) : '';
            if ($id === '' || isset($seen[$id])) {
                continue;
            }

            $createdAt = is_string($item['createdAt'] ?? null) ? (string) $item['createdAt'] : null;
            if ($createdAt === null) {
                continue;
            }

            try {
                $created = CarbonImmutable::parse($createdAt);
            } catch (\Throwable) {
                continue;
            }

            if ($created->diffInDays($now, false) > 10) {
                continue;
            }

            $seen[$id] = true;
            $result[] = $item;
        }

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    private function buildEventItem(
        string $type,
        string $title,
        string $course,
        string $message,
        string $url,
        string $meta,
        string $category,
        string $level,
        string $fingerprint,
        CarbonImmutable $createdAt,
    ): array {
        return [
            'id' => md5($type.'|'.$fingerprint),
            'title' => $title,
            'message' => $message,
            'course' => $course,
            'level' => $level,
            'dueLabel' => $createdAt->locale('es')->translatedFormat('D, d M · H:i'),
            'url' => $url !== '' ? $url : '/dashboard',
            'trigger' => $type,
            'category' => $category,
            'meta' => $meta,
            'createdAt' => $createdAt->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function taskKey(array $task): ?string
    {
        $courseId = (int) ($task['asignatura_id'] ?? 0);
        $title = trim((string) ($task['nombre'] ?? ''));

        if ($courseId <= 0 || $title === '') {
            return null;
        }

        return $courseId.'|'.mb_strtolower($title);
    }

    private function hasMeaningfulValue(string $value): bool
    {
        $normalized = mb_strtolower(trim($value));

        if ($normalized === '') {
            return false;
        }

        $emptyMarkers = [
            '-',
            '--',
            'sin calificar',
            'sin calificacion',
            'sin retroalimentacion',
            'pendiente',
            'no disponible',
            'none',
        ];

        return ! in_array($normalized, $emptyMarkers, true);
    }

    private function snapshotKey(User $user): string
    {
        return 'moodle:notifications:snapshot:'.$user->id;
    }

    private function eventsKey(User $user): string
    {
        return 'moodle:notifications:events:'.$user->id;
    }

    private function dismissedKey(User $user): string
    {
        return 'moodle:notifications:dismissed:'.$user->id;
    }

    private function emailedKey(User $user): string
    {
        return 'moodle:notifications:emailed:'.$user->id;
    }

    /**
     * @return array<string, bool|int>
     */
    private function resolvePreferences(User $user): array
    {
        $defaults = [
            '48h_antes' => true,
            '24h_antes' => true,
            'mismo_dia' => true,
            'recordatorio_personalizado' => false,
            'recordatorio_personalizado_minutos' => 180,
            'email' => true,
            'push' => false,
            'email_48h' => true,
            'email_24h' => true,
            'email_same_day' => true,
            'email_custom' => true,
            'email_overdue' => true,
            'email_new_task' => true,
            'email_deadline_changed' => true,
            'email_new_grade' => true,
            'email_new_feedback' => true,
            'email_moodle_message' => true,
        ];

        $saved = is_array($user->moodle_notification_preferences) ? $user->moodle_notification_preferences : [];

        $merged = array_merge($defaults, $saved);
        $merged['48h_antes'] = (bool) ($merged['48h_antes'] ?? true);
        $merged['24h_antes'] = (bool) ($merged['24h_antes'] ?? true);
        $merged['mismo_dia'] = (bool) ($merged['mismo_dia'] ?? true);
        $merged['recordatorio_personalizado'] = (bool) ($merged['recordatorio_personalizado'] ?? false);
        $merged['recordatorio_personalizado_minutos'] = max(1, (int) ($merged['recordatorio_personalizado_minutos'] ?? 180));
        $merged['email'] = (bool) ($merged['email'] ?? true);
        $merged['push'] = (bool) ($merged['push'] ?? false);
        $merged['email_48h'] = (bool) ($merged['email_48h'] ?? true);
        $merged['email_24h'] = (bool) ($merged['email_24h'] ?? true);
        $merged['email_same_day'] = (bool) ($merged['email_same_day'] ?? true);
        $merged['email_custom'] = (bool) ($merged['email_custom'] ?? true);
        $merged['email_overdue'] = (bool) ($merged['email_overdue'] ?? true);
        $merged['email_new_task'] = (bool) ($merged['email_new_task'] ?? true);
        $merged['email_deadline_changed'] = (bool) ($merged['email_deadline_changed'] ?? true);
        $merged['email_new_grade'] = (bool) ($merged['email_new_grade'] ?? true);
        $merged['email_new_feedback'] = (bool) ($merged['email_new_feedback'] ?? true);
        $merged['email_moodle_message'] = (bool) ($merged['email_moodle_message'] ?? true);

        return $merged;
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function resolveDueAt(array $task): ?CarbonImmutable
    {
        $iso = is_string($task['fecha_iso'] ?? null) ? trim((string) $task['fecha_iso']) : '';

        if ($iso === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($iso);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $task
     * @param  array<string, bool|int>  $preferences
     * @return array<string, mixed>|null
     */
    private function buildNotificationFromTask(
        array $task,
        CarbonImmutable $dueAt,
        int $remainingMinutes,
        array $preferences,
        CarbonImmutable $now,
    ): ?array {
        if ($this->isCustomReminderInWindow($remainingMinutes, $preferences)) {
            return null;
        }

        $trigger = null;
        $level = 'info';
        $category = 'RECORDATORIO';
        $meta = '';
        $createdAt = $now;

        if ($remainingMinutes < 0) {
            $trigger = 'overdue';
            $level = 'critical';
            $category = 'ENTREGA VENCIDA';
            $meta = 'FUERA DE PLAZO';
            $createdAt = $dueAt;
        } elseif ((bool) ($preferences['mismo_dia'] ?? true) && $remainingMinutes <= 12 * 60) {
            $trigger = 'same_day';
            $level = 'critical';
            $category = 'ENTREGA CRÍTICA';
            $meta = 'CIERRA HOY';
            $createdAt = $dueAt->subHours(12);
        } elseif ((bool) ($preferences['24h_antes'] ?? true) && $remainingMinutes <= 24 * 60) {
            $trigger = '24h';
            $level = 'warning';
            $category = 'RECORDATORIO 24H';
            $meta = 'CIERRA EN MENOS DE 24H';
            $createdAt = $dueAt->subHours(24);
        } elseif ((bool) ($preferences['48h_antes'] ?? true) && $remainingMinutes <= 48 * 60) {
            $trigger = '48h';
            $level = 'info';
            $category = 'RECORDATORIO 48H';
            $meta = 'CIERRA EN MENOS DE 48H';
            $createdAt = $dueAt->subHours(48);
        }

        if ($trigger === null) {
            return null;
        }

        $title = trim((string) ($task['titulo'] ?? $task['nombre'] ?? 'Entrega pendiente'));
        if ($title === '') {
            $title = 'Entrega pendiente';
        }

        $course = trim((string) ($task['asignatura_nombre'] ?? 'Asignatura'));

        $dueLabel = $dueAt->locale('es')->translatedFormat('D, d M · H:i');

        $message = match ($trigger) {
            'overdue' => 'La fecha de entrega ya ha vencido. Revisa la actividad cuanto antes.',
            'same_day' => 'Entrega programada para hoy. Prioriza esta tarea.',
            '24h' => 'Queda menos de 24 horas para la entrega.',
            '48h' => 'Quedan menos de 48 horas para la entrega.',
            default => 'Tienes una entrega pendiente.',
        };

        $taskUrl = is_string($task['url'] ?? null) ? trim((string) $task['url']) : '';

        return [
            'id' => md5($course.'|'.$title.'|'.$dueAt->toIso8601String().'|'.$trigger),
            'title' => $title,
            'message' => $message,
            'course' => $course,
            'level' => $level,
            'dueLabel' => $dueLabel,
            'url' => $taskUrl !== '' ? $taskUrl : '/dashboard',
            'trigger' => $trigger,
            'category' => $category,
            'meta' => $meta,
            'remainingMinutes' => $remainingMinutes,
            'createdAt' => $createdAt->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, mixed>  $task
     * @param  array<string, bool|int>  $preferences
     * @return array<string, mixed>|null
     */
    private function buildCustomThresholdNotification(
        array $task,
        CarbonImmutable $dueAt,
        int $remainingMinutes,
        array $preferences,
    ): ?array {
        $customEnabled = (bool) ($preferences['recordatorio_personalizado'] ?? false);

        if (! $customEnabled) {
            return null;
        }

        $customMinutes = max(1, (int) ($preferences['recordatorio_personalizado_minutos'] ?? 180));

        if ($remainingMinutes < 0 || $remainingMinutes > $customMinutes) {
            return null;
        }

        $title = trim((string) ($task['titulo'] ?? $task['nombre'] ?? 'Entrega pendiente'));
        if ($title === '') {
            $title = 'Entrega pendiente';
        }

        $course = trim((string) ($task['asignatura_nombre'] ?? 'Asignatura'));
        $taskUrl = is_string($task['url'] ?? null) ? trim((string) $task['url']) : '';

        return [
            'id' => md5($course.'|'.$title.'|'.$dueAt->toIso8601String().'|custom'),
            'title' => $title,
            'message' => 'Quedan '.$customMinutes.' minutos o menos para la entrega configurada en tu recordatorio personalizado.',
            'course' => $course,
            'level' => 'info',
            'dueLabel' => $dueAt->locale('es')->translatedFormat('D, d M · H:i'),
            'url' => $taskUrl !== '' ? $taskUrl : '/dashboard',
            'trigger' => 'custom',
            'category' => 'RECORDATORIO PERSONALIZADO',
            'meta' => 'VENTANA DE '.$customMinutes.' MIN',
            'remainingMinutes' => $remainingMinutes,
            'createdAt' => $dueAt->subMinutes($customMinutes)->toIso8601String(),
        ];
    }

    /**
     * @param  array<string, bool|int>  $preferences
     */
    private function isCustomReminderInWindow(int $remainingMinutes, array $preferences): bool
    {
        $customEnabled = (bool) ($preferences['recordatorio_personalizado'] ?? false);

        if (! $customEnabled || $remainingMinutes < 0) {
            return false;
        }

        $customMinutes = max(1, (int) ($preferences['recordatorio_personalizado_minutos'] ?? 180));

        return $remainingMinutes <= $customMinutes;
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @param  array<string, bool|int>  $preferences
     */
    private function dispatchEmailNotifications(User $user, array $items, array $preferences): void
    {
        if (! (bool) ($preferences['email'] ?? true)) {
            return;
        }

        $recipient = trim((string) ($user->email ?? ''));

        if ($recipient === '') {
            return;
        }

        $emailed = $this->getEmailedIds($user);
        $hasNewDelivery = false;

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $id = trim((string) ($item['id'] ?? ''));
            $isRead = (bool) ($item['isRead'] ?? false);
            $trigger = trim((string) ($item['trigger'] ?? 'system'));

            if ($id === '' || $isRead || isset($emailed[$id])) {
                continue;
            }

            if (! $this->shouldSendEmailForTrigger($trigger, $preferences)) {
                continue;
            }

            SendMoodleNotificationEmailJob::dispatch($user, $item);
            $hasNewDelivery = true;
        }

        if (! $hasNewDelivery) {
            return;
        }
    }

    /**
     * @param  array<string, bool|int>  $preferences
     */
    private function shouldSendEmailForTrigger(string $trigger, array $preferences): bool
    {
        $map = [
            '48h' => 'email_48h',
            '24h' => 'email_24h',
            'same_day' => 'email_same_day',
            'custom' => 'email_custom',
            'overdue' => 'email_overdue',
            'new_task' => 'email_new_task',
            'deadline_changed' => 'email_deadline_changed',
            'new_grade' => 'email_new_grade',
            'new_feedback' => 'email_new_feedback',
            'moodle_message' => 'email_moodle_message',
        ];

        $key = $map[$trigger] ?? null;

        if (! is_string($key)) {
            return true;
        }

        return (bool) ($preferences[$key] ?? true);
    }

    /**
     * @return array<string, string>
     */
    private function getEmailedIds(User $user): array
    {
        $cached = Cache::get($this->emailedKey($user));

        if (! is_array($cached)) {
            return [];
        }

        $filtered = [];

        foreach ($cached as $id => $value) {
            if (! is_string($id) || $id === '') {
                continue;
            }

            $filtered[$id] = is_string($value) ? $value : CarbonImmutable::now()->toIso8601String();
        }

        return $filtered;
    }
}
