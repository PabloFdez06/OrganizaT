<?php

namespace App\Services\Moodle;

use App\Services\Moodle\Parsers\AssignmentsParser;
use App\Services\Moodle\Parsers\GradesParser;
use App\Services\Moodle\Parsers\ParticipantsParser;
use App\Services\Moodle\Parsers\ResourcesParser;
use Carbon\CarbonImmutable;

class MoodleAcademicService
{
    public function __construct(
        private readonly MoodleCasClient $client,
        private readonly AssignmentsParser $assignmentsParser,
        private readonly GradesParser $gradesParser,
        private readonly ParticipantsParser $participantsParser,
        private readonly ResourcesParser $resourcesParser,
        private readonly SpanishDateParser $dateParser,
        private readonly MoodleAcademicRules $rules,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getCourses(MoodleSession $session, bool $includeTutor = true): array
    {
        $payload = json_encode([
            [
                'index' => 0,
                'methodname' => 'core_course_get_enrolled_courses_by_timeline_classification',
                'args' => [
                    'classification' => 'all',
                    'limit' => 999,
                    'offset' => 0,
                    'sort' => 'fullname',
                    'customfieldname' => '',
                    'customfieldvalue' => '',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->client->post(
            $session,
            '/lib/ajax/service.php?sesskey='.$session->sesskey.'&info=core_course_get_enrolled_courses_by_timeline_classification',
            $payload,
            [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-Requested-With' => 'XMLHttpRequest',
            ],
            traceStep: 'courses_service',
        );

        $decoded = json_decode($response, true);
        $courses = $decoded[0]['data']['courses'] ?? [];

        if (! is_array($courses)) {
            return [];
        }

        $mapped = [];

        foreach ($courses as $course) {
            $courseId = (int) ($course['id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            $tutor = null;
            if ($includeTutor) {
                $participantsHtml = $this->client->get($session, '/user/index.php', ['id' => $courseId], traceStep: 'participants_'.$courseId);
                $tutor = $this->participantsParser->extractTutor($participantsHtml);
            }

            $mapped[] = [
                'id' => $courseId,
                'nombre' => $course['fullname'] ?? null,
                'categoria' => $course['coursecategory'] ?? null,
                'url' => $course['viewurl'] ?? null,
                'imagen' => $course['courseimage'] ?? null,
                'docente' => $tutor,
                'progreso' => isset($course['progress']) ? (int) round((float) $course['progress']) : null,
            ];
        }

        return $mapped;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAssignmentsByCourse(MoodleSession $session, int $courseId): array
    {
        $html = $this->client->get($session, '/mod/assign/index.php', ['id' => $courseId], traceStep: 'assignments_'.$courseId);

        return $this->assignmentsParser->parse($html);
    }

    /**
     * @return array<string, mixed>
     */
    public function getAllAssignments(MoodleSession $session): array
    {
        $courses = $this->getCourses($session, includeTutor: false);
        $colors = ['#E63946', '#457B9D', '#2A9D8F', '#F4A261', '#264653', '#1D3557', '#8AB17D'];

        $courseCards = [];
        $tasks = [];

        foreach ($courses as $course) {
            $courseId = (int) $course['id'];
            $color = $colors[$courseId % count($colors)];

            $courseCards[] = [
                'id' => $courseId,
                'nombre' => $course['nombre'],
                'color' => $color,
                'imagen' => $course['imagen'],
            ];

            $courseTasks = $this->getAssignmentsByCourse($session, $courseId);

            foreach ($courseTasks as $task) {
                $fechaIso = $this->dateParser->toIso($task['fecha_entrega'] ?? null);
                $statusText = mb_strtolower((string) ($task['estado'] ?? ''));
                $gradeText = mb_strtolower((string) ($task['calificacion'] ?? ''));
                $feedbackText = trim((string) ($task['retroalimentacion'] ?? ''));
                $gradeLooksLikeFeedback = $this->rules->looksLikeFeedback($gradeText);

                $entregada = $this->rules->isDeliveredFromStatus($statusText);
                $calificada = $this->rules->isExplicitGradeValue($gradeText, $gradeLooksLikeFeedback)
                    || $this->rules->hasMeaningfulFeedback($feedbackText)
                    || $this->rules->hasMeaningfulFeedback((string) ($task['calificacion'] ?? ''));
                $pendiente = ! $entregada && ! $calificada;

                $diasRestantes = null;
                if ($fechaIso) {
                    $diasRestantes = CarbonImmutable::now()->diffInDays(CarbonImmutable::parse($fechaIso), false);
                }

                $tasks[] = array_merge($task, [
                    'asignatura_id' => $courseId,
                    'asignatura_nombre' => $course['nombre'],
                    'color' => $color,
                    'fecha_iso' => $fechaIso,
                    'pendiente' => $pendiente,
                    'entregada' => $entregada,
                    'calificada' => $calificada,
                    'dias_restantes' => $diasRestantes,
                ]);
            }
        }

        return [
            'asignaturas' => $courseCards,
            'tareas' => $tasks,
        ];
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    public function getResourcesByCourse(MoodleSession $session, int $courseId): array
    {
        $resources = [];

        $resources = array_merge($resources, $this->getResourcesByCourseFromApi($session, $courseId));
        $resources = array_merge($resources, $this->getResourcesByCourseFromModuleIndexes($session, $courseId));

        if ($resources === []) {
            $resources = array_merge($resources, $this->getResourcesByCourseFromHtml($session, $courseId));
        }

        return $this->deduplicateResources($resources);
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    private function getResourcesByCourseFromApi(MoodleSession $session, int $courseId): array
    {
        try {
            $payload = json_encode([
                [
                    'index' => 0,
                    'methodname' => 'core_course_get_contents',
                    'args' => [
                        'courseid' => $courseId,
                    ],
                ],
            ], JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return [];
        }

        try {
            $response = $this->client->post(
                $session,
                '/lib/ajax/service.php?sesskey='.$session->sesskey.'&info=core_course_get_contents',
                $payload,
                [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-Requested-With' => 'XMLHttpRequest',
                ],
                traceStep: 'resources_service_'.$courseId,
            );
        } catch (\Throwable) {
            return [];
        }

        $decoded = json_decode($response, true);

        if (! is_array($decoded) || ! isset($decoded[0]['data']) || ! is_array($decoded[0]['data'])) {
            return [];
        }

        $sections = $decoded[0]['data'];

        return $this->mapResourcesFromCourseSections(is_array($sections) ? $sections : []);
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    private function getResourcesByCourseFromHtml(MoodleSession $session, int $courseId): array
    {
        try {
            $html = $this->client->get(
                $session,
                '/course/view.php',
                ['id' => $courseId],
                traceStep: 'resources_html_'.$courseId,
            );
        } catch (\Throwable) {
            return [];
        }

        $resources = $this->resourcesParser->parse($html);

        if ($resources === []) {
            return [];
        }

        return $this->enrichResourceKinds($resources);
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    private function getResourcesByCourseFromModuleIndexes(MoodleSession $session, int $courseId): array
    {
        $moduleIndexPaths = [
            'resource' => '/mod/resource/index.php',
            'url' => '/mod/url/index.php',
            'folder' => '/mod/folder/index.php',
            'page' => '/mod/page/index.php',
            'book' => '/mod/book/index.php',
            'label' => '/mod/label/index.php',
            'h5pactivity' => '/mod/h5pactivity/index.php',
            'scorm' => '/mod/scorm/index.php',
            'imscp' => '/mod/imscp/index.php',
            'lti' => '/mod/lti/index.php',
        ];

        $resources = [];

        foreach ($moduleIndexPaths as $moduleType => $path) {
            try {
                $html = $this->client->get(
                    $session,
                    $path,
                    ['id' => $courseId],
                    traceStep: 'resources_module_index_'.$moduleType.'_'.$courseId,
                );
            } catch (\Throwable) {
                continue;
            }

            $moduleResources = $this->resourcesParser->parseModuleIndex($html, $moduleType);

            if ($moduleResources === []) {
                continue;
            }

            $resources = array_merge($resources, $moduleResources);
        }

        if ($resources === []) {
            return [];
        }

        return $this->enrichResourceKinds($resources);
    }

    /**
     * @param  array<int, array<string, string|null>>  $resources
     * @return array<int, array<string, string|null>>
     */
    private function enrichResourceKinds(array $resources): array
    {
        if ($resources === []) {
            return [];
        }

        foreach ($resources as &$resource) {
            $moduleType = mb_strtolower((string) ($resource['modulo'] ?? 'resource'));
            $extension = is_string($resource['extension'] ?? null)
                ? mb_strtolower((string) $resource['extension'])
                : null;

            $kind = $this->inferResourceKind($moduleType, $extension, null);

            $resource['tipo'] = $kind;
            $resource['tipo_label'] = $this->resourceKindLabel($kind);
            $resource['bucket'] = $this->resourceBucket($kind);
        }
        unset($resource);

        return $this->deduplicateResources($resources);
    }

    /**
     * @param  array<int, mixed>  $sections
     * @return array<int, array<string, string|null>>
     */
    private function mapResourcesFromCourseSections(array $sections): array
    {
        $resources = [];

        foreach ($sections as $section) {
            if (! is_array($section)) {
                continue;
            }

            $unitName = $this->resolveSectionUnitName($section);

            $modules = is_array($section['modules'] ?? null) ? $section['modules'] : [];

            foreach ($modules as $module) {
                if (! is_array($module)) {
                    continue;
                }

                $resources = array_merge($resources, $this->mapModuleResources($module, $unitName));
            }
        }

        return $this->deduplicateResources($resources);
    }

    /**
     * @param  array<string, mixed>  $section
     */
    private function resolveSectionUnitName(array $section): string
    {
        $name = trim((string) ($section['name'] ?? ''));

        if ($name !== '' && mb_strtolower($name) !== 'general') {
            return $name;
        }

        $summary = trim(strip_tags((string) ($section['summary'] ?? '')));

        if ($summary !== '') {
            return preg_replace('/\s+/u', ' ', $summary) ?: $summary;
        }

        $sectionNumber = isset($section['section']) ? (int) $section['section'] : 0;

        if ($sectionNumber > 0) {
            return 'Tema '.$sectionNumber;
        }

        $sectionId = isset($section['id']) ? (int) $section['id'] : 0;

        if ($sectionId > 0) {
            return 'Seccion '.$sectionId;
        }

        return 'General';
    }

    /**
     * @param  array<string, mixed>  $module
     * @return array<int, array<string, string|null>>
     */
    private function mapModuleResources(array $module, string $unitName): array
    {
        $moduleType = mb_strtolower((string) ($module['modname'] ?? ''));

        if (! in_array($moduleType, ['resource', 'url', 'folder', 'page', 'book', 'label', 'h5pactivity', 'scorm', 'imscp', 'lti'], true)) {
            return [];
        }

        $moduleName = trim((string) ($module['name'] ?? ''));

        if ($moduleName === '') {
            return [];
        }

        $moduleUrl = is_string($module['url'] ?? null) ? trim((string) $module['url']) : '';
        $contents = is_array($module['contents'] ?? null) ? $module['contents'] : [];

        if ($contents === []) {
            $extension = $this->extractExtensionFromNameOrUrl($moduleName, $moduleUrl);
            $kind = $this->inferResourceKind($moduleType, $extension, null);

            return [[
                'unidad' => $unitName,
                'nombre' => $moduleName,
                'modulo' => $moduleType,
                'tipo' => $kind,
                'tipo_label' => $this->resourceKindLabel($kind),
                'bucket' => $this->resourceBucket($kind),
                'tamano' => null,
                'extension' => $extension,
                'url' => $moduleUrl !== '' ? $moduleUrl : null,
                'contenedor' => null,
            ]];
        }

        $resources = [];

        foreach ($contents as $content) {
            if (! is_array($content)) {
                continue;
            }

            $contentType = mb_strtolower((string) ($content['type'] ?? ''));

            if ($contentType !== '' && ! in_array($contentType, ['file', 'url', 'folder', 'content'], true)) {
                continue;
            }

            $contentName = trim((string) ($content['filename'] ?? $moduleName));

            if ($contentName === '') {
                $contentName = $moduleName;
            }

            $contentUrl = is_string($content['fileurl'] ?? null)
                ? trim((string) $content['fileurl'])
                : (is_string($content['contenturl'] ?? null) ? trim((string) $content['contenturl']) : '');

            $effectiveUrl = $contentUrl !== '' ? $contentUrl : $moduleUrl;
            $extension = $this->extractExtensionFromNameOrUrl($contentName, $effectiveUrl);
            $kind = $this->inferResourceKind($moduleType, $extension, is_string($content['mimetype'] ?? null) ? (string) $content['mimetype'] : null);

            $resources[] = [
                'unidad' => $unitName,
                'nombre' => $contentName,
                'modulo' => $moduleType,
                'tipo' => $kind,
                'tipo_label' => $this->resourceKindLabel($kind),
                'bucket' => $this->resourceBucket($kind),
                'tamano' => $this->formatBytes(is_numeric($content['filesize'] ?? null) ? (float) $content['filesize'] : null),
                'extension' => $extension,
                'url' => $effectiveUrl !== '' ? $effectiveUrl : null,
                'contenedor' => $moduleType === 'folder' ? $moduleName : null,
            ];
        }

        return $resources;
    }

    /**
     * @param  array<int, array<string, string|null>>  $resources
     * @return array<int, array<string, string|null>>
     */
    private function deduplicateResources(array $resources): array
    {
        $unique = [];

        foreach ($resources as $resource) {
            $unit = trim((string) ($resource['unidad'] ?? 'General'));
            $name = trim((string) ($resource['nombre'] ?? ''));
            $url = trim((string) ($resource['url'] ?? ''));
            $kind = trim((string) ($resource['tipo'] ?? 'other'));

            if ($name === '') {
                continue;
            }

            $key = mb_strtolower($unit.'|'.$name.'|'.$url.'|'.$kind);
            $unique[$key] = $resource;
        }

        return array_values($unique);
    }

    private function extractExtensionFromNameOrUrl(string $name, string $url): ?string
    {
        $fromName = pathinfo($name, PATHINFO_EXTENSION);

        if (is_string($fromName) && $fromName !== '') {
            return mb_strtolower($fromName);
        }

        $path = parse_url($url, PHP_URL_PATH);

        if (! is_string($path) || $path === '') {
            return null;
        }

        $fromPath = pathinfo($path, PATHINFO_EXTENSION);

        return is_string($fromPath) && $fromPath !== '' ? mb_strtolower($fromPath) : null;
    }

    private function inferResourceKind(string $moduleType, ?string $extension, ?string $mimeType): string
    {
        $safeMime = mb_strtolower((string) $mimeType);

        if ($moduleType === 'url' || $moduleType === 'lti') {
            return 'external_link';
        }

        if ($moduleType === 'folder') {
            return 'folder';
        }

        if (str_starts_with($safeMime, 'image/')) {
            return 'image';
        }

        if (str_starts_with($safeMime, 'video/') || str_starts_with($safeMime, 'audio/')) {
            return 'multimedia';
        }

        if ($extension !== null) {
            if (in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'], true)) {
                return 'image';
            }

            if (in_array($extension, ['mp4', 'webm', 'mov', 'mp3', 'wav', 'ogg'], true)) {
                return 'multimedia';
            }

            if (in_array($extension, ['zip', 'rar', '7z', 'tar', 'gz'], true)) {
                return 'archive';
            }

            if (in_array($extension, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'odt'], true)) {
                return 'document';
            }
        }

        if (in_array($moduleType, ['h5pactivity', 'scorm', 'imscp'], true)) {
            return 'multimedia';
        }

        if (in_array($moduleType, ['resource', 'book', 'page', 'label'], true)) {
            return 'document';
        }

        return 'other';
    }

    private function resourceKindLabel(string $kind): string
    {
        return match ($kind) {
            'document' => 'Documento',
            'archive' => 'Archivo comprimido',
            'folder' => 'Carpeta',
            'multimedia' => 'Contenido multimedia',
            'external_link' => 'Enlace externo',
            'image' => 'Imagen',
            default => 'Recurso',
        };
    }

    private function resourceBucket(string $kind): string
    {
        return match ($kind) {
            'external_link' => 'links',
            'image' => 'images',
            'document', 'archive' => 'files',
            'folder' => 'folders',
            default => 'others',
        };
    }

    private function formatBytes(?float $bytes): ?string
    {
        if ($bytes === null || $bytes <= 0) {
            return null;
        }

        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 1).' GB';
        }

        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 1).' MB';
        }

        if ($bytes >= 1024) {
            return round($bytes / 1024, 1).' KB';
        }

        return (string) round($bytes).' B';
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @return array<int, array<int, array<string, string|null>>>
     */
    public function getResourcesForCourses(MoodleSession $session, array $courses): array
    {
        $resourcesByCourse = [];

        foreach ($courses as $course) {
            $courseId = (int) ($course['id'] ?? 0);

            if ($courseId <= 0) {
                continue;
            }

            $resourcesByCourse[$courseId] = $this->getResourcesByCourse($session, $courseId);
        }

        return $resourcesByCourse;
    }

    /**
     * @return array<string, mixed>
     */
    public function getAllResources(MoodleSession $session): array
    {
        $courses = $this->getCourses($session, includeTutor: false);
        $resources = [];
        $coursesSummary = [];

        foreach ($courses as $course) {
            $courseId = (int) ($course['id'] ?? 0);

            if ($courseId <= 0) {
                continue;
            }

            $courseResources = $this->getResourcesByCourse($session, $courseId);

            $coursesSummary[] = [
                'id' => $courseId,
                'nombre' => (string) ($course['nombre'] ?? 'Asignatura'),
                'total_recursos' => count($courseResources),
            ];

            foreach ($courseResources as $resource) {
                $resources[] = array_merge($resource, [
                    'asignatura_id' => $courseId,
                    'asignatura_nombre' => (string) ($course['nombre'] ?? 'Asignatura'),
                ]);
            }
        }

        return [
            'asignaturas' => $coursesSummary,
            'recursos' => $resources,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getGrades(MoodleSession $session): array
    {
        $courses = $this->getCourses($session, includeTutor: false);
        $result = [];

        foreach ($courses as $course) {
            $courseId = (int) $course['id'];
            $html = $this->client->get($session, '/grade/report/user/index.php', ['id' => $courseId], traceStep: 'grades_'.$courseId);

            $result[] = [
                'asignatura_id' => $courseId,
                'asignatura_nombre' => $course['nombre'],
                'items' => $this->gradesParser->parse($html),
            ];
        }

        return $result;
    }
}
