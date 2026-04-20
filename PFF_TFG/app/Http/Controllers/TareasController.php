<?php

namespace App\Http\Controllers;

use App\Jobs\Moodle\FetchTareasJob;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\AcademicCalendarExportService;
use App\Services\Moodle\MoodleAcademicRules;
use App\Services\Moodle\MoodleAccessUrlService;
use App\Services\Moodle\MoodleAsyncSectionCache;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleUserAcademicCache;
use App\Services\Moodle\SpanishDateParser;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;

class TareasController extends Controller
{
    private const MOODLE_SESSION_EXPIRED_MESSAGE = 'Tu sesión de Moodle se cerró por inactividad. Debes volver a iniciar sesión porque los datos temporales se han eliminado.';

    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
        private readonly SpanishDateParser $dateParser,
        private readonly MoodleAcademicRules $rules,
        private readonly AcademicCalendarExportService $calendarExportService,
        private readonly MoodleEphemeralSessionService $sessionService,
        private readonly MoodleAsyncSectionCache $asyncCache,
        private readonly MoodleAccessUrlService $accessUrl,
    ) {
    }

    public function index(Request $request): InertiaResponse
    {
        $user = $request->user();
        $moodleConnected = $this->sessionService->hasActiveSession($user);
        $loading = false;

        $studentName = $user?->name;
        $profileAvatarUrl = null;
        $pageError = null;

        $subjectCards = [];
        $tasksByDate = [];
        $summary = [
            'pending' => 0,
            'upcoming' => 0,
            'complianceRate' => 0,
        ];
        $initialSubjectId = null;
        $calendar = [
            'initialMonth' => CarbonImmutable::now()->startOfMonth()->format('Y-m'),
            'selectedDate' => CarbonImmutable::now()->format('Y-m-d'),
        ];

        if (! $moodleConnected && is_string($user?->moodle_username) && trim((string) $user->moodle_username) !== '') {
            $pageError = self::MOODLE_SESSION_EXPIRED_MESSAGE;
        }

        if ($moodleConnected) {
            $state = $this->asyncCache->getState('tareas', (int) $user->id);

            if ($state['status'] === 'done') {
                try {
                    $data = is_array($state['data'] ?? null) ? $state['data'] : [];
                    $payload = is_array($data['academicPayload'] ?? null) ? $data['academicPayload'] : [];

                    if ($payload === []) {
                        throw new \RuntimeException('Sin payload asíncrono de tareas.');
                    }

                    $courses = is_array($payload['courses'] ?? null) ? $payload['courses'] : [];
                    $tasks = is_array($payload['tasks'] ?? null) ? $payload['tasks'] : [];

                    $profileAvatarUrl = is_string($payload['profileAvatarUrl'] ?? null)
                        ? $payload['profileAvatarUrl']
                        : null;
                    $studentName = is_string($payload['studentName'] ?? null) && trim((string) $payload['studentName']) !== ''
                        ? (string) $payload['studentName']
                        : $studentName;

                    $normalizedTasks = $this->normalizeTasks($tasks);
                    $subjectCards = $this->buildSubjectCards($courses, $normalizedTasks);
                    $tasksByDate = $this->buildTasksByDate($normalizedTasks);
                    $summary = $this->buildSummary($normalizedTasks);
                    $calendar = $this->buildCalendarDefaults($normalizedTasks, $tasksByDate);
                    $initialSubjectId = $this->resolveInitialSubjectId($request, $subjectCards);
                } catch (MoodleAuthenticationException $exception) {
                    $pageError = $exception->getMessage();
                } catch (MoodleRequestException $exception) {
                    $pageError = $exception->getMessage();
                } catch (\Throwable) {
                    $pageError = 'No se pudieron cargar las tareas en este momento.';
                }
            } elseif ($state['status'] === 'error') {
                $pageError = is_string($state['error'] ?? null) && trim((string) $state['error']) !== ''
                    ? (string) $state['error']
                    : 'No se pudieron cargar las tareas en este momento.';
            } else {
                $loading = true;

                if ($state['status'] !== 'pending') {
                    $this->asyncCache->markPending('tareas', (int) $user->id);
                    FetchTareasJob::dispatch((int) $user->id);
                }
            }
        }

        return Inertia::render('tareas', [
            'moodleConnected' => $moodleConnected,
            'studentName' => $studentName,
            'profileAvatarUrl' => $profileAvatarUrl,
            'subjectCards' => $subjectCards,
            'tasksByDate' => $tasksByDate,
            'summary' => $summary,
            'initialSubjectId' => $initialSubjectId,
            'calendar' => $calendar,
            'pageError' => $pageError,
            'loading' => $loading,
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $this->sessionService->hasActiveSession($user)) {
            return response()->json([
                'status' => 'error',
                'data' => null,
                'error' => self::MOODLE_SESSION_EXPIRED_MESSAGE,
                'updated_at' => time(),
            ]);
        }

        $state = $this->asyncCache->getState('tareas', (int) $user->id);

        if ($state['status'] === 'idle') {
            $this->asyncCache->markPending('tareas', (int) $user->id);
            FetchTareasJob::dispatch((int) $user->id);
            $state = $this->asyncCache->getState('tareas', (int) $user->id);
        }

        return response()->json($state);
    }

    public function exportAllIcs(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = $this->sessionService->hasActiveSession($user);

        if (! $moodleConnected) {
            abort(403, 'Debes conectar tu cuenta de Moodle para exportar el calendario.');
        }

        try {
            $payload = $this->cache->getForUser($user);
        } catch (MoodleAuthenticationException) {
            abort(403, 'No se pudo autenticar la cuenta Moodle para exportar el calendario.');
        } catch (MoodleRequestException) {
            abort(503, 'No se pudieron obtener las tareas en este momento.');
        }

        $tasks = is_array($payload['tasks'] ?? null) ? $payload['tasks'] : [];
        $calendar = $this->calendarExportService->buildCalendar($tasks, (int) $user->id);
        $filename = 'organizt-tareas-'.CarbonImmutable::now()->format('Y-m-d').'.ics';

        return response($calendar, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $subjectCards
     */
    private function resolveInitialSubjectId(Request $request, array $subjectCards): ?int
    {
        $requestedSubjectId = (int) $request->integer('subject_id');
        if ($requestedSubjectId <= 0) {
            return null;
        }

        foreach ($subjectCards as $subject) {
            if ((int) ($subject['id'] ?? 0) === $requestedSubjectId) {
                return $requestedSubjectId;
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<int, array<string, mixed>>
     */
    private function normalizeTasks(array $tasks): array
    {
        $normalized = [];
        $now = CarbonImmutable::now();

        foreach ($tasks as $index => $task) {
            if (! is_array($task)) {
                continue;
            }

            $title = trim((string) ($task['nombre'] ?? ''));
            if ($title === '') {
                continue;
            }

            $dueDate = $this->resolveTaskDate($task);
            $dueIso = $dueDate?->format('Y-m-d');
            $courseId = (int) ($task['asignatura_id'] ?? 0);
            $courseName = trim((string) ($task['asignatura_nombre'] ?? ''));
            $unitName = $this->normalizeUnitName($task['tema'] ?? null);
            $status = $this->resolveTaskStatus($task, $dueDate, $now);

            $normalized[] = [
                'id' => sprintf('tsk-%d-%d', max($courseId, 0), $index + 1),
                'courseId' => $courseId,
                'courseName' => $courseName !== '' ? $courseName : 'Sin asignatura',
                'unitName' => $unitName,
                'name' => $title,
                'dueIso' => $dueIso,
                'dueLabel' => $this->buildDueLabel($dueDate, (string) ($task['fecha_entrega'] ?? '')),
                'statusKey' => $status['key'],
                'statusLabel' => $status['label'],
                'statusTone' => $status['tone'],
                'isOverdue' => $status['isOverdue'],
                'url' => $this->accessUrl->toAccessibleUrl(
                    is_string($task['url'] ?? null) ? (string) $task['url'] : null,
                ),
            ];
        }

        usort($normalized, function (array $a, array $b): int {
            $aDate = is_string($a['dueIso'] ?? null) ? (string) $a['dueIso'] : '';
            $bDate = is_string($b['dueIso'] ?? null) ? (string) $b['dueIso'] : '';

            if ($aDate !== '' && $bDate !== '') {
                return strcmp($aDate, $bDate);
            }

            if ($aDate === '' && $bDate === '') {
                return strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
            }

            return $aDate === '' ? 1 : -1;
        });

        return $normalized;
    }

    /**
     * @param  array<int, array<string, mixed>>  $normalizedTasks
     * @return array<string, array<int, array<string, mixed>>>
     */
    private function buildTasksByDate(array $normalizedTasks): array
    {
        $byDate = [];

        foreach ($normalizedTasks as $task) {
            $dateIso = is_string($task['dueIso'] ?? null) ? (string) $task['dueIso'] : '';
            if ($dateIso === '') {
                continue;
            }

            $byDate[$dateIso] ??= [];
            $byDate[$dateIso][] = [
                'id' => (string) ($task['id'] ?? ''),
                'name' => (string) ($task['name'] ?? 'Actividad'),
                'courseName' => (string) ($task['courseName'] ?? 'Sin asignatura'),
                'unitName' => (string) ($task['unitName'] ?? 'General'),
                'statusKey' => (string) ($task['statusKey'] ?? 'pending'),
                'statusLabel' => (string) ($task['statusLabel'] ?? 'Sin entregar'),
                'statusTone' => (string) ($task['statusTone'] ?? 'pending'),
                'dueLabel' => (string) ($task['dueLabel'] ?? 'SIN FECHA'),
                'url' => is_string($task['url'] ?? null) ? (string) $task['url'] : null,
            ];
        }

        ksort($byDate);

        return $byDate;
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @param  array<int, array<string, mixed>>  $normalizedTasks
     * @return array<int, array<string, mixed>>
     */
    private function buildSubjectCards(array $courses, array $normalizedTasks): array
    {
        $tasksByCourse = [];
        foreach ($normalizedTasks as $task) {
            $courseId = (int) ($task['courseId'] ?? 0);
            $tasksByCourse[$courseId] ??= [];
            $tasksByCourse[$courseId][] = $task;
        }

        $cards = [];
        foreach ($courses as $course) {
            if (! is_array($course)) {
                continue;
            }

            $courseId = (int) ($course['id'] ?? 0);
            $courseTasks = $tasksByCourse[$courseId] ?? [];
            $unitsMap = [];

            foreach ($courseTasks as $task) {
                $unitName = (string) ($task['unitName'] ?? 'General');
                $unitsMap[$unitName] ??= [];
                $unitsMap[$unitName][] = $task;
            }

            $units = [];
            foreach ($unitsMap as $unitName => $unitTasks) {
                $units[] = [
                    'name' => $unitName,
                    'tasks' => $unitTasks,
                ];
            }

            usort($units, fn (array $a, array $b): int => strcmp((string) $a['name'], (string) $b['name']));

            $total = count($courseTasks);
            $pending = count(array_filter($courseTasks, fn (array $task): bool => (string) ($task['statusKey'] ?? '') === 'pending'));
            $upcoming = count(array_filter($courseTasks, fn (array $task): bool => (string) ($task['statusKey'] ?? '') === 'pending' && ! (bool) ($task['isOverdue'] ?? false)));
            $completed = max($total - $pending, 0);

            $cards[] = [
                'id' => $courseId,
                'code' => (string) ($course['codigo'] ?? ('CRS-'.$courseId)),
                'subject' => (string) ($course['nombre'] ?? 'Asignatura'),
                'teacher' => (string) ($course['docente'] ?? 'Docente no disponible'),
                'image' => is_string($course['imagen'] ?? null) && trim((string) $course['imagen']) !== '' ? (string) $course['imagen'] : null,
                'totalTasks' => $total,
                'pendingTasks' => $pending,
                'upcomingTasks' => $upcoming,
                'completionRate' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
                'units' => $units,
            ];
        }

        usort($cards, function (array $a, array $b): int {
            $aTotal = (int) ($a['totalTasks'] ?? 0);
            $bTotal = (int) ($b['totalTasks'] ?? 0);
            if ($aTotal !== $bTotal) {
                return $bTotal <=> $aTotal;
            }

            $aPending = (int) ($a['pendingTasks'] ?? 0);
            $bPending = (int) ($b['pendingTasks'] ?? 0);
            if ($aPending !== $bPending) {
                return $bPending <=> $aPending;
            }

            return strcmp((string) ($a['subject'] ?? ''), (string) ($b['subject'] ?? ''));
        });

        return $cards;
    }

    /**
     * @param  array<int, array<string, mixed>>  $normalizedTasks
     * @return array{pending:int,upcoming:int,complianceRate:int}
     */
    private function buildSummary(array $normalizedTasks): array
    {
        $total = count($normalizedTasks);
        $pending = count(array_filter($normalizedTasks, fn (array $task): bool => (string) ($task['statusKey'] ?? '') === 'pending'));
        $upcoming = count(array_filter($normalizedTasks, fn (array $task): bool => (string) ($task['statusKey'] ?? '') === 'pending' && ! (bool) ($task['isOverdue'] ?? false)));
        $completed = max($total - $pending, 0);

        return [
            'pending' => $pending,
            'upcoming' => $upcoming,
            'complianceRate' => $total > 0 ? (int) round(($completed / $total) * 100) : 0,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $normalizedTasks
     * @param  array<string, array<int, array<string, mixed>>>  $tasksByDate
     * @return array{initialMonth:string,selectedDate:string}
     */
    private function buildCalendarDefaults(array $normalizedTasks, array $tasksByDate): array
    {
        $now = CarbonImmutable::now();

        $firstTaskWithDate = null;
        foreach ($normalizedTasks as $task) {
            $iso = is_string($task['dueIso'] ?? null) ? (string) $task['dueIso'] : '';
            if ($iso === '') {
                continue;
            }

            try {
                $firstTaskWithDate = CarbonImmutable::parse($iso);
                break;
            } catch (\Throwable) {
                continue;
            }
        }

        $month = ($firstTaskWithDate ?? $now)->startOfMonth()->format('Y-m');
        $todayIso = $now->format('Y-m-d');

        if (isset($tasksByDate[$todayIso])) {
            return [
                'initialMonth' => $now->startOfMonth()->format('Y-m'),
                'selectedDate' => $todayIso,
            ];
        }

        foreach (array_keys($tasksByDate) as $dateIso) {
            if (str_starts_with($dateIso, $month)) {
                return [
                    'initialMonth' => $month,
                    'selectedDate' => $dateIso,
                ];
            }
        }

        $firstAvailableDate = array_key_first($tasksByDate);

        return [
            'initialMonth' => $month,
            'selectedDate' => is_string($firstAvailableDate) ? $firstAvailableDate : $now->format('Y-m-d'),
        ];
    }

    private function normalizeUnitName(mixed $rawUnit): string
    {
        $unitName = trim((string) $rawUnit);

        return $unitName !== '' ? $unitName : 'General';
    }

    /**
     * @param  array<string, mixed>  $task
     * @return array{key:string,label:string,tone:string,isOverdue:bool}
     */
    private function resolveTaskStatus(array $task, ?CarbonImmutable $dueDate, CarbonImmutable $now): array
    {
        $feedbackText = trim((string) ($task['retroalimentacion'] ?? ''));
        $isGraded = (bool) ($task['calificada'] ?? false)
            || $this->rules->hasMeaningfulFeedback($feedbackText);

        if ($isGraded) {
            return [
                'key' => 'graded',
                'label' => 'Calificado',
                'tone' => 'graded',
                'isOverdue' => false,
            ];
        }

        $isDelivered = (bool) ($task['entregada'] ?? false);

        if ($isDelivered) {
            return [
                'key' => 'delivered',
                'label' => 'Entregado',
                'tone' => 'delivered',
                'isOverdue' => false,
            ];
        }

        $isOverdue = $dueDate !== null && $dueDate->startOfDay()->lt($now->startOfDay());

        if ($isOverdue) {
            return [
                'key' => 'expired',
                'label' => 'Expirada',
                'tone' => 'expired',
                'isOverdue' => true,
            ];
        }

        $isCritical = $dueDate !== null && $dueDate->startOfDay()->lte($now->addDays(2)->startOfDay());

        return [
            'key' => 'pending',
            'label' => 'Sin entregar',
            'tone' => $isCritical ? 'critical' : 'pending',
            'isOverdue' => false,
        ];
    }

    private function buildDueLabel(?CarbonImmutable $dueDate, string $rawLabel): string
    {
        if ($dueDate !== null) {
            return mb_strtoupper($dueDate->translatedFormat('d M Y'));
        }

        $cleanRaw = trim($rawLabel);

        return $cleanRaw !== '' ? mb_strtoupper($cleanRaw) : 'SIN FECHA';
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function resolveTaskDate(array $task): ?CarbonImmutable
    {
        $dateIso = (string) ($task['fecha_iso'] ?? '');

        if ($dateIso !== '') {
            try {
                return CarbonImmutable::parse($dateIso);
            } catch (\Throwable) {
                // Ignore and fallback to fecha_entrega parsing.
            }
        }

        $rawDate = is_string($task['fecha_entrega'] ?? null) ? (string) $task['fecha_entrega'] : null;
        $parsedIso = $this->dateParser->toIso($rawDate);

        if (! $parsedIso) {
            return null;
        }

        try {
            return CarbonImmutable::parse($parsedIso);
        } catch (\Throwable) {
            return null;
        }
    }
}
