<?php

namespace App\Services\Moodle;

use Carbon\CarbonImmutable;

class AcademicCalendarExportService
{
    public function __construct(
        private readonly MoodleAccessUrlService $accessUrl,
    ) {}

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     */
    public function buildCalendar(array $tasks, int $userId): string
    {
        $generatedAt = CarbonImmutable::now('UTC');

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//OrganizT//Academic Tasks Calendar//ES',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:OrganizT - Tareas academicas',
            'X-WR-TIMEZONE:Europe/Madrid',
        ];

        foreach ($tasks as $task) {
            if (! is_array($task)) {
                continue;
            }

            $dueDate = $this->resolveDueDate($task);
            if ($dueDate === null) {
                continue;
            }

            $taskName = trim((string) ($task['nombre'] ?? ''));
            if ($taskName === '') {
                $taskName = 'Tarea';
            }

            $courseName = trim((string) ($task['asignatura_nombre'] ?? ''));
            $summary = $courseName !== '' ? $taskName.' - '.$courseName : $taskName;

            $statusLabel = $this->resolveStatusLabel($task);
            $dueOriginal = trim((string) ($task['fecha_entrega'] ?? ''));
            $daysRemaining = $this->resolveDaysRemaining($task, $dueDate);
            $taskUrl = $this->accessUrl->toAccessibleUrl($this->normalizeString($task['url'] ?? null));

            $descriptionParts = [
                'Estado: '.$statusLabel,
                'Fecha entrega: '.($dueOriginal !== '' ? $dueOriginal : $dueDate->format('Y-m-d')),
                'Dias restantes: '.($daysRemaining !== null ? (string) $daysRemaining : 'N/D'),
            ];

            if ($taskUrl !== null) {
                $descriptionParts[] = 'URL Moodle: '.$taskUrl;
            }

            $uid = $this->buildStableUid($userId, $task, $dueDate);
            $dtStart = $dueDate->format('Ymd');
            $dtEnd = $dueDate->addDay()->format('Ymd');

            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:'.$uid;
            $lines[] = 'DTSTAMP:'.$generatedAt->format('Ymd\\THis\\Z');
            $lines[] = 'DTSTART;VALUE=DATE:'.$dtStart;
            $lines[] = 'DTEND;VALUE=DATE:'.$dtEnd;
            $lines[] = 'SUMMARY:'.$this->escapeText($summary);
            $lines[] = 'DESCRIPTION:'.$this->escapeText(implode("\n", $descriptionParts));
            if ($taskUrl !== null) {
                $lines[] = 'URL:'.$this->escapeText($taskUrl);
            }
            if ($courseName !== '') {
                $lines[] = 'CATEGORIES:'.$this->escapeText($courseName);
            }
            $lines[] = 'STATUS:CONFIRMED';
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';

        return $this->foldAndJoinLines($lines);
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function resolveDueDate(array $task): ?CarbonImmutable
    {
        $fechaIso = $this->normalizeString($task['fecha_iso'] ?? null);
        if ($fechaIso === null) {
            $fechaIso = $this->normalizeString($task['fechaiso'] ?? null);
        }

        if ($fechaIso === null) {
            return null;
        }

        try {
            return CarbonImmutable::parse($fechaIso)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function resolveStatusLabel(array $task): string
    {
        $isGraded = (bool) ($task['calificada'] ?? false);
        if ($isGraded) {
            return 'Calificada';
        }

        $isDelivered = (bool) ($task['entregada'] ?? false);
        if ($isDelivered) {
            return 'Entregada';
        }

        $isPending = (bool) ($task['pendiente'] ?? false);

        return $isPending ? 'Pendiente' : 'Sin estado';
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function resolveDaysRemaining(array $task, CarbonImmutable $dueDate): ?int
    {
        $rawDays = $task['dias_restantes'] ?? $task['diasrestantes'] ?? null;

        if (is_int($rawDays)) {
            return $rawDays;
        }

        if (is_numeric($rawDays)) {
            return (int) $rawDays;
        }

        try {
            return CarbonImmutable::now()->diffInDays($dueDate, false);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function buildStableUid(int $userId, array $task, CarbonImmutable $dueDate): string
    {
        $source = implode('|', [
            $userId,
            (string) ($task['asignatura_id'] ?? $task['asignaturaid'] ?? ''),
            trim((string) ($task['nombre'] ?? '')),
            $dueDate->format('Y-m-d'),
            (string) ($task['url'] ?? ''),
        ]);

        return hash('sha256', $source).'@organizt.local';
    }

    private function escapeText(string $value): string
    {
        $escaped = str_replace('\\', '\\\\', $value);
        $escaped = str_replace(';', '\\;', $escaped);
        $escaped = str_replace(',', '\\,', $escaped);

        return str_replace(["\r\n", "\r", "\n"], '\\n', $escaped);
    }

    /**
     * @param  array<int, string>  $lines
     */
    private function foldAndJoinLines(array $lines): string
    {
        $folded = [];

        foreach ($lines as $line) {
            $remaining = $line;

            while (strlen($remaining) > 75) {
                $folded[] = substr($remaining, 0, 75);
                $remaining = ' '.substr($remaining, 75);
            }

            $folded[] = $remaining;
        }

        return implode("\r\n", $folded)."\r\n";
    }

    private function normalizeString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
