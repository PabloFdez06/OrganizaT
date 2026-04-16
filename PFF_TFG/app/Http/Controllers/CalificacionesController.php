<?php

namespace App\Http\Controllers;

use App\Jobs\Moodle\FetchCalificacionesJob;
use Barryvdh\DomPDF\Facade\Pdf;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAcademicRules;
use App\Services\Moodle\MoodleAsyncSectionCache;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\SpanishDateParser;
use App\Services\Moodle\MoodleUserAcademicCache;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class CalificacionesController extends Controller
{
    private const MOODLE_SESSION_EXPIRED_MESSAGE = 'Tu sesion de Moodle se cerro por inactividad. Debes volver a iniciar sesion porque los datos temporales se han eliminado.';

    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
        private readonly SpanishDateParser $dateParser,
        private readonly MoodleAcademicRules $rules,
        private readonly MoodleEphemeralSessionService $sessionService,
        private readonly MoodleAsyncSectionCache $asyncCache,
    ) {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = $this->sessionService->hasActiveSession($user);
        $loading = false;

        $subjectCards = [];
        $summary = [
            'subjects' => 0,
            'gradedItems' => 0,
            'subjectsWithGrades' => 0,
        ];
        $profileAvatarUrl = null;
        $pageError = null;
        $milestones = [];
        $studentName = $user?->name;

        if (! $moodleConnected && is_string($user?->moodle_username) && trim((string) $user->moodle_username) !== '') {
            $pageError = self::MOODLE_SESSION_EXPIRED_MESSAGE;
        }

        if ($moodleConnected) {
            $state = $this->asyncCache->getState('calificaciones', (int) $user->id);

            if ($state['status'] === 'done') {
                try {
                    $data = is_array($state['data'] ?? null) ? $state['data'] : [];
                    $academicPayload = is_array($data['academicPayload'] ?? null) ? $data['academicPayload'] : [];

                    if ($academicPayload === []) {
                        throw new \RuntimeException('Sin payload asincrono de calificaciones.');
                    }

                    $gradeReport = is_array($academicPayload['gradeReport'] ?? null)
                        ? $academicPayload['gradeReport']
                        : $this->cache->getGradesForUser($user);
                    $courses = is_array($academicPayload['courses'] ?? null) ? $academicPayload['courses'] : [];
                    $tasks = is_array($academicPayload['tasks'] ?? null) ? $academicPayload['tasks'] : [];

                    $profileAvatarUrl = is_string($academicPayload['profileAvatarUrl'] ?? null)
                        ? $academicPayload['profileAvatarUrl']
                        : null;
                    $studentName = is_string($academicPayload['studentName'] ?? null) && trim((string) $academicPayload['studentName']) !== ''
                        ? (string) $academicPayload['studentName']
                        : $studentName;

                    $subjectCards = $this->buildSubjectCards($courses, $tasks, is_array($gradeReport) ? $gradeReport : []);
                    $summary = $this->buildSummary($subjectCards);
                    $milestones = $this->buildMilestones($tasks);
                } catch (MoodleAuthenticationException $exception) {
                    $pageError = $exception->getMessage();
                } catch (MoodleRequestException $exception) {
                    $pageError = $exception->getMessage();
                } catch (\Throwable) {
                    $pageError = 'No se pudieron cargar las calificaciones en este momento.';
                }
            } elseif ($state['status'] === 'error') {
                $pageError = is_string($state['error'] ?? null) && trim((string) $state['error']) !== ''
                    ? (string) $state['error']
                    : 'No se pudieron cargar las calificaciones en este momento.';
            } else {
                $loading = true;

                if ($state['status'] !== 'pending') {
                    $this->asyncCache->markPending('calificaciones', (int) $user->id);
                    FetchCalificacionesJob::dispatch((int) $user->id);
                }
            }
        }

        return Inertia::render('calificaciones', [
            'moodleConnected' => $moodleConnected,
            'studentName' => $studentName,
            'profileAvatarUrl' => $profileAvatarUrl,
            'subjectCards' => $subjectCards,
            'summary' => $summary,
            'milestones' => $milestones,
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

        $state = $this->asyncCache->getState('calificaciones', (int) $user->id);

        if ($state['status'] === 'idle') {
            $this->asyncCache->markPending('calificaciones', (int) $user->id);
            FetchCalificacionesJob::dispatch((int) $user->id);
            $state = $this->asyncCache->getState('calificaciones', (int) $user->id);
        }

        return response()->json($state);
    }

    public function downloadReport(Request $request): HttpResponse
    {
        $user = $request->user();
        $moodleConnected = $this->sessionService->hasActiveSession($user);
        $subjectId = (int) $request->integer('subject_id', 0);

        if (! $moodleConnected) {
            abort(403, 'Debes conectar tu cuenta de Moodle para descargar el informe de calificaciones.');
        }

        try {
            $academicPayload = $this->cache->getForUser($user);
            $gradeReport = is_array($academicPayload['gradeReport'] ?? null)
                ? $academicPayload['gradeReport']
                : $this->cache->getGradesForUser($user);
            $courses = is_array($academicPayload['courses'] ?? null) ? $academicPayload['courses'] : [];
            $tasks = is_array($academicPayload['tasks'] ?? null) ? $academicPayload['tasks'] : [];

            $subjectCards = $this->buildSubjectCards($courses, $tasks, is_array($gradeReport) ? $gradeReport : []);

            if ($subjectId > 0) {
                $subjectCards = array_values(array_filter(
                    $subjectCards,
                    static fn (array $card): bool => (int) ($card['id'] ?? 0) === $subjectId,
                ));

                if ($subjectCards === []) {
                    abort(404, 'No se encontro la asignatura seleccionada para generar el informe.');
                }
            }

            $report = $this->buildReportPayload($subjectCards);

            $studentName = is_string($academicPayload['studentName'] ?? null) && trim((string) $academicPayload['studentName']) !== ''
                ? (string) $academicPayload['studentName']
                : (string) ($user?->name ?? 'Alumno');

            $filename = 'informe-calificaciones-'.CarbonImmutable::now()->format('Y-m-d').'.pdf';

            if ($subjectId > 0) {
                $subjectName = (string) ($subjectCards[0]['subject'] ?? 'asignatura');
                $safeSubjectName = preg_replace('/[^a-z0-9]+/i', '-', mb_strtolower($subjectName));
                $safeSubjectName = trim((string) $safeSubjectName, '-');
                $safeSubjectName = $safeSubjectName !== '' ? $safeSubjectName : 'asignatura';
                $filename = 'informe-calificaciones-'.$safeSubjectName.'-'.CarbonImmutable::now()->format('Y-m-d').'.pdf';
            }

            return Pdf::loadView('reports.calificaciones', [
                'studentName' => $studentName,
                'generatedAt' => CarbonImmutable::now(),
                'report' => $report,
            ])
                ->setPaper('a4')
                ->download($filename);
        } catch (MoodleAuthenticationException) {
            abort(403, 'No se pudo autenticar Moodle para generar el informe.');
        } catch (MoodleRequestException) {
            abort(503, 'No se pudieron recuperar las calificaciones en este momento.');
        } catch (\Throwable) {
            abort(500, 'No se pudo generar el informe de calificaciones.');
        }
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<int, array<string, string|null>>
     */
    private function buildMilestones(array $tasks): array
    {
        $now = CarbonImmutable::now();
        $upcoming = [];
        $recentDelivered = [];

        foreach ($tasks as $task) {
            if (! is_array($task)) {
                continue;
            }

            $title = trim((string) ($task['nombre'] ?? ''));
            if ($title === '') {
                continue;
            }

            $date = $this->resolveTaskDate($task);
            $days = isset($task['dias_restantes']) ? (int) $task['dias_restantes'] : null;

            if ($days === null && $date !== null) {
                $days = $now->diffInDays($date, false);
            }

            $isDelivered = (bool) ($task['entregada'] ?? false)
                || (bool) ($task['calificada'] ?? false);

            $item = [
                'title' => $title,
                'subject' => (string) ($task['asignatura_nombre'] ?? 'Sin asignatura'),
                'dateLabel' => $this->buildMilestoneDateLabel($task, $date, $days),
                'link' => is_string($task['url'] ?? null) && $task['url'] !== '' ? (string) $task['url'] : null,
                'kind' => $isDelivered ? 'entregada' : 'proxima',
                'days' => $days,
                'date' => $date,
            ];

            if (! $isDelivered && ($days === null || $days >= 0)) {
                $upcoming[] = $item;
                continue;
            }

            if ($isDelivered) {
                $recentDelivered[] = $item;
            }
        }

        usort($upcoming, function (array $a, array $b): int {
            $aDays = $a['days'];
            $bDays = $b['days'];

            if ($aDays !== null && $bDays !== null) {
                return $aDays <=> $bDays;
            }

            if ($aDays === null && $bDays === null) {
                return 0;
            }

            return $aDays === null ? 1 : -1;
        });

        usort($recentDelivered, function (array $a, array $b) use ($now): int {
            $aDate = $a['date'];
            $bDate = $b['date'];

            if (! $aDate && ! $bDate) {
                return 0;
            }

            if (! $aDate) {
                return 1;
            }

            if (! $bDate) {
                return -1;
            }

            return abs($aDate->diffInSeconds($now, false)) <=> abs($bDate->diffInSeconds($now, false));
        });

        $selected = array_slice($upcoming, 0, 4);

        if (count($selected) < 4) {
            $selected = array_merge($selected, array_slice($recentDelivered, 0, 4 - count($selected)));
        }

        return array_map(static fn (array $item): array => [
            'dateLabel' => (string) ($item['dateLabel'] ?? 'SIN FECHA'),
            'title' => (string) ($item['title'] ?? 'Actividad'),
            'subject' => (string) ($item['subject'] ?? 'Sin asignatura'),
            'link' => is_string($item['link'] ?? null) ? (string) $item['link'] : null,
            'kind' => (string) ($item['kind'] ?? 'proxima'),
        ], $selected);
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

    /**
     * @param  array<string, mixed>  $task
     */
    private function buildMilestoneDateLabel(array $task, ?CarbonImmutable $date, ?int $days): string
    {
        if ($date !== null) {
            if ($date->isToday()) {
                return 'HOY';
            }

            if ($date->isTomorrow()) {
                return 'MANANA';
            }

            return mb_strtoupper($date->translatedFormat('d M'));
        }

        if ($days !== null) {
            return $days <= 0 ? 'HOY' : 'EN '.$days.' DIAS';
        }

        $rawDate = is_string($task['fecha_entrega'] ?? null) ? trim((string) $task['fecha_entrega']) : '';

        return $rawDate !== '' ? mb_strtoupper($rawDate) : 'SIN FECHA';
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @param  array<int, array<string, mixed>>  $tasks
     * @param  array<int, array<string, mixed>>  $gradeReport
     * @return array<int, array<string, mixed>>
     */
    private function buildSubjectCards(array $courses, array $tasks, array $gradeReport): array
    {
        $cards = [];
        $variants = ['large', 'small', 'small', 'large'];

        $taskUrlByCourseAndName = [];
        foreach ($tasks as $task) {
            $courseId = (int) ($task['asignatura_id'] ?? 0);
            $taskName = mb_strtolower(trim((string) ($task['nombre'] ?? '')));
            $taskUrl = is_string($task['url'] ?? null) && $task['url'] !== '' ? (string) $task['url'] : null;

            if ($courseId <= 0 || $taskName === '' || $taskUrl === null) {
                continue;
            }

            $taskUrlByCourseAndName[$courseId][$taskName] = $taskUrl;
        }

        $reportByCourse = [];
        foreach ($gradeReport as $courseReport) {
            $courseId = (int) ($courseReport['asignatura_id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            $items = is_array($courseReport['items'] ?? null) ? $courseReport['items'] : [];
            if ($items === []) {
                continue;
            }

            $reportByCourse[$courseId] = $items;
        }

        foreach (array_values($courses) as $index => $course) {
            $courseId = (int) ($course['id'] ?? 0);
            $courseItems = $reportByCourse[$courseId] ?? [];

            $tasksForUnit = [];
            foreach ($courseItems as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $itemName = trim((string) ($item['item'] ?? ''));
                if ($itemName === '') {
                    continue;
                }

                ['grade' => $grade, 'feedback' => $feedback, 'isNumeric' => $isNumeric] = $this->resolveGradeReportEntry($item);

                if ($grade === null && $feedback === null) {
                    continue;
                }

                $taskUrl = $taskUrlByCourseAndName[$courseId][mb_strtolower($itemName)] ?? null;
                $linkTitle = $taskUrl !== null && $feedback !== null && mb_strlen($feedback) >= 120;

                $tasksForUnit[] = [
                    'name' => $itemName,
                    'grade' => $grade ?? '-',
                    'isNumeric' => $isNumeric,
                    'feedback' => $feedback,
                    'url' => $taskUrl,
                    'linkTitle' => $linkTitle,
                ];
            }

            $unitBlocks = $tasksForUnit === []
                ? []
                : [
                    [
                        'name' => 'General',
                        'tasks' => $tasksForUnit,
                    ],
                ];

            $cards[] = [
                'id' => $courseId,
                'code' => 'CRS-'.$courseId,
                'subject' => (string) ($course['nombre'] ?? 'Asignatura'),
                'teacher' => (string) ($course['docente'] ?? 'Docente no disponible'),
                'image' => is_string($course['imagen'] ?? null) && $course['imagen'] !== '' ? (string) $course['imagen'] : null,
                'gradedCount' => count($tasksForUnit),
                'units' => $unitBlocks,
                'variant' => $variants[$index % count($variants)],
                'accent' => $index % 3 === 1,
            ];
        }

        usort($cards, fn (array $a, array $b): int => $b['gradedCount'] <=> $a['gradedCount']);

        return $cards;
    }

    /**
     * @param  array<int, array<string, mixed>>  $cards
     * @return array<string, int>
     */
    private function buildSummary(array $cards): array
    {
        $subjects = count($cards);
        $gradedItems = array_sum(array_map(fn (array $card): int => (int) ($card['gradedCount'] ?? 0), $cards));
        $subjectsWithGrades = count(array_filter($cards, fn (array $card): bool => (int) ($card['gradedCount'] ?? 0) > 0));

        return [
            'subjects' => $subjects,
            'gradedItems' => $gradedItems,
            'subjectsWithGrades' => $subjectsWithGrades,
        ];
    }

    /**
     * @param array<string, mixed> $item
     * @return array{grade:?string, feedback:?string, isNumeric:bool}
     */
    private function resolveGradeReportEntry(array $item): array
    {
        $gradeText = trim((string) ($item['calificacion_texto'] ?? ''));
        $rangeText = trim((string) ($item['rango_texto'] ?? ''));
        $feedbackText = trim((string) ($item['retroalimentacion_texto'] ?? ''));

        $numeric = $this->formatGradeWithRange($gradeText, $rangeText);
        if ($numeric !== null) {
            return [
                'grade' => $numeric,
                'feedback' => $this->rules->hasMeaningfulFeedback($feedbackText) ? $feedbackText : null,
                'isNumeric' => true,
            ];
        }

        $rubric = $this->rules->extractRubricGrade($gradeText);
        if ($rubric !== null) {
            return [
                'grade' => $rubric,
                'feedback' => $this->rules->hasMeaningfulFeedback($feedbackText) ? $feedbackText : null,
                'isNumeric' => false,
            ];
        }

        if ($this->rules->hasMeaningfulFeedback($feedbackText)) {
            return [
                'grade' => '-',
                'feedback' => $feedbackText,
                'isNumeric' => false,
            ];
        }

        return [
            'grade' => null,
            'feedback' => null,
            'isNumeric' => false,
        ];
    }

    private function formatGradeWithRange(string $gradeText, string $rangeText): ?string
    {
        $gradeNormalized = trim(str_replace(',', '.', $gradeText));
        if ($gradeNormalized === '') {
            return null;
        }

        if (preg_match('/^\s*([0-9]+(?:\.[0-9]+)?)\s*$/', $gradeNormalized, $gradeMatch) !== 1) {
            return null;
        }

        $grade = $this->rules->normalizeNumberToken($gradeMatch[1]);

        if (preg_match('/([0-9]+(?:[\.,][0-9]+)?)\s*$/', $rangeText, $rangeMatch) === 1) {
            $denominator = $this->rules->normalizeNumberToken(str_replace(',', '.', $rangeMatch[1]));
            return $grade.'/'.$denominator;
        }

        return $grade.'/10';
    }

    /**
     * @param  array<int, array<string, mixed>>  $subjectCards
     * @return array<string, mixed>
     */
    private function buildReportPayload(array $subjectCards): array
    {
        $subjects = [];
        $allNumericGrades = [];
        $gradedTasksCount = 0;
        $feedbackTasksCount = 0;

        foreach ($subjectCards as $card) {
            $units = is_array($card['units'] ?? null) ? $card['units'] : [];
            $subjectTasks = [];
            $subjectNumericGrades = [];

            foreach ($units as $unit) {
                $unitName = (string) ($unit['name'] ?? 'General');
                $tasks = is_array($unit['tasks'] ?? null) ? $unit['tasks'] : [];

                foreach ($tasks as $task) {
                    $gradeDisplay = trim((string) ($task['grade'] ?? '-'));
                    $feedback = is_string($task['feedback'] ?? null) ? trim((string) $task['feedback']) : null;
                    $numericGrade = $this->parseReportNumericGrade($gradeDisplay);

                    if ($numericGrade !== null) {
                        $subjectNumericGrades[] = $numericGrade;
                        $allNumericGrades[] = $numericGrade;
                    }

                    if ($gradeDisplay !== '' && $gradeDisplay !== '-') {
                        $gradedTasksCount++;
                    }

                    if ($feedback !== null && $feedback !== '') {
                        $feedbackTasksCount++;
                    }

                    $subjectTasks[] = [
                        'unit' => $unitName,
                        'task' => (string) ($task['name'] ?? 'Actividad'),
                        'grade' => $gradeDisplay !== '' ? $gradeDisplay : '-',
                        'numericGrade' => $numericGrade,
                        'feedback' => $feedback,
                    ];
                }
            }

            $subjectAverage = count($subjectNumericGrades) > 0
                ? array_sum($subjectNumericGrades) / count($subjectNumericGrades)
                : null;

            $subjects[] = [
                'code' => (string) ($card['code'] ?? ''),
                'name' => (string) ($card['subject'] ?? 'Asignatura'),
                'teacher' => (string) ($card['teacher'] ?? 'Docente no disponible'),
                'average' => $subjectAverage,
                'tasks' => $subjectTasks,
            ];
        }

        $globalAverage = count($allNumericGrades) > 0
            ? array_sum($allNumericGrades) / count($allNumericGrades)
            : null;

        return [
            'subjects' => $subjects,
            'stats' => [
                'subjectsCount' => count($subjects),
                'gradedTasksCount' => $gradedTasksCount,
                'feedbackTasksCount' => $feedbackTasksCount,
                'globalAverage' => $globalAverage,
            ],
        ];
    }

    private function parseReportNumericGrade(string $grade): ?float
    {
        $normalized = trim(str_replace(',', '.', $grade));

        if ($normalized === '' || $normalized === '-') {
            return null;
        }

        if (preg_match('/([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/', $normalized, $ratioMatch) === 1) {
            $value = (float) $ratioMatch[1];
            $base = (float) $ratioMatch[2];

            if ($base <= 0) {
                return null;
            }

            if ($base === 10.0 && $value > 10.0 && $value <= 100.0) {
                return $value / 10;
            }

            return ($value / $base) * 10;
        }

        if (preg_match('/([0-9]+(?:\.[0-9]+)?)\s*(?:de|sobre|out\s+of)\s*([0-9]+(?:\.[0-9]+)?)/i', $normalized, $textScale) === 1) {
            $value = (float) $textScale[1];
            $base = (float) $textScale[2];

            if ($base <= 0) {
                return null;
            }

            return ($value / $base) * 10;
        }

        if (preg_match('/([0-9]+(?:\.[0-9]+)?)\s*%/', $normalized, $percentMatch) === 1) {
            return (float) $percentMatch[1] / 10;
        }

        if (preg_match('/^([0-9]+(?:\.[0-9]+)?)$/', $normalized, $plainMatch) === 1) {
            $value = (float) $plainMatch[1];

            if ($value > 10.0 && $value <= 100.0) {
                return $value / 10;
            }

            return $value;
        }

        return null;
    }

}
