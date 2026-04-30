<?php

namespace App\Http\Controllers;

use App\Jobs\Moodle\FetchRecursosJob;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAccessUrlService;
use App\Services\Moodle\MoodleAsyncSectionCache;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RecursosController extends Controller
{
    private const MOODLE_SESSION_EXPIRED_MESSAGE = 'Tu sesión de Moodle se cerró por inactividad. Debes volver a iniciar sesión porque los datos temporales se han eliminado.';

    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
        private readonly MoodleEphemeralSessionService $sessionService,
        private readonly MoodleAsyncSectionCache $asyncCache,
        private readonly MoodleAccessUrlService $accessUrl,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = $this->sessionService->hasActiveSession($user);
        $loading = false;
        $requestedSubjectId = (int) $request->integer('subject_id');
        $scope = $requestedSubjectId > 0
            ? 'subject:'.$requestedSubjectId
            : 'subject:auto';

        $studentName = $user?->name;
        $profileAvatarUrl = null;
        $pageError = null;
        $subjects = [];
        $selectedSubject = null;
        $selectedSubjectId = null;
        $summary = [
            'totalResources' => 0,
            'formatDistribution' => [
                'documents' => 0,
                'multimedia' => 0,
                'links' => 0,
            ],
            'metadata' => [
                'links' => 0,
                'images' => 0,
                'files' => 0,
                'folders' => 0,
                'others' => 0,
            ],
        ];

        if (! $moodleConnected && is_string($user?->moodle_username) && trim((string) $user->moodle_username) !== '') {
            $pageError = self::MOODLE_SESSION_EXPIRED_MESSAGE;
        }

        if ($moodleConnected) {
            $state = $this->asyncCache->getState('recursos', (int) $user->id, $scope);

            if ($state['status'] === 'done') {
                try {
                    $data = is_array($state['data'] ?? null) ? $state['data'] : [];
                    $payload = is_array($data['academicPayload'] ?? null) ? $data['academicPayload'] : [];

                    if ($payload === []) {
                        throw new \RuntimeException('Sin payload asincrono de recursos.');
                    }

                    $courses = is_array($payload['courses'] ?? null) ? $payload['courses'] : [];
                    $resources = is_array($data['resources'] ?? null) ? $data['resources'] : [];

                    $profileAvatarUrl = is_string($payload['profileAvatarUrl'] ?? null)
                        ? $payload['profileAvatarUrl']
                        : null;
                    $studentName = is_string($payload['studentName'] ?? null) && trim((string) $payload['studentName']) !== ''
                        ? (string) $payload['studentName']
                        : $studentName;

                    $subjects = $this->buildSubjects($courses);

                    $jobSelectedSubjectId = isset($data['selectedSubjectId']) ? (int) $data['selectedSubjectId'] : 0;
                    $selectedSubjectId = $jobSelectedSubjectId > 0 ? $jobSelectedSubjectId : null;

                    if ($selectedSubjectId === null && $subjects !== []) {
                        $selectedSubjectId = (int) ($subjects[0]['id'] ?? 0);
                    }

                    if ($selectedSubjectId !== null) {
                        $selectedSubject = $this->buildSelectedSubject($subjects, $selectedSubjectId, $resources);
                        $summary = $this->buildSummary($resources);
                    }
                } catch (MoodleAuthenticationException $exception) {
                    $pageError = $exception->getMessage();
                } catch (MoodleRequestException $exception) {
                    $pageError = $exception->getMessage();
                } catch (\Throwable) {
                    $pageError = 'No se pudieron cargar los recursos en este momento.';
                }
            } elseif ($state['status'] === 'error') {
                $pageError = is_string($state['error'] ?? null) && trim((string) $state['error']) !== ''
                    ? (string) $state['error']
                    : 'No se pudieron cargar los recursos en este momento.';
            } else {
                $loading = true;

                if ($state['status'] !== 'pending') {
                    $this->asyncCache->markPending('recursos', (int) $user->id, $scope);
                    FetchRecursosJob::dispatch((int) $user->id, $requestedSubjectId > 0 ? $requestedSubjectId : null);
                }
            }
        }

        return Inertia::render('recursos', [
            'moodleConnected' => $moodleConnected,
            'studentName' => $studentName,
            'profileAvatarUrl' => $profileAvatarUrl,
            'subjects' => $subjects,
            'selectedSubject' => $selectedSubject,
            'selectedSubjectId' => $selectedSubjectId,
            'summary' => $summary,
            'pageError' => $pageError,
            'loading' => $loading,
        ]);
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $requestedSubjectId = (int) $request->integer('subject_id');
        $scope = $requestedSubjectId > 0
            ? 'subject:'.$requestedSubjectId
            : 'subject:auto';

        if (! $this->sessionService->hasActiveSession($user)) {
            return response()->json([
                'status' => 'error',
                'data' => null,
                'error' => self::MOODLE_SESSION_EXPIRED_MESSAGE,
                'updated_at' => time(),
            ]);
        }

        $state = $this->asyncCache->getState('recursos', (int) $user->id, $scope);

        if ($state['status'] === 'idle') {
            $this->asyncCache->markPending('recursos', (int) $user->id, $scope);
            FetchRecursosJob::dispatch((int) $user->id, $requestedSubjectId > 0 ? $requestedSubjectId : null);
            $state = $this->asyncCache->getState('recursos', (int) $user->id, $scope);
        }

        return response()->json($state);
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @return array<int, array<string, mixed>>
     */
    private function buildSubjects(array $courses): array
    {
        $subjects = [];

        foreach ($courses as $course) {
            if (! is_array($course)) {
                continue;
            }

            $courseId = (int) ($course['id'] ?? 0);

            if ($courseId <= 0) {
                continue;
            }

            $subjects[] = [
                'id' => $courseId,
                'code' => (string) ($course['codigo'] ?? ('CRS-'.$courseId)),
                'subject' => (string) ($course['nombre'] ?? 'Asignatura'),
                'teacher' => (string) ($course['docente'] ?? 'Docente no disponible'),
            ];
        }

        usort($subjects, function (array $a, array $b): int {
            return strcmp((string) ($a['subject'] ?? ''), (string) ($b['subject'] ?? ''));
        });

        return $subjects;
    }

    /**
     * @param  array<int, array<string, mixed>>  $subjects
     */
    private function resolveSelectedSubjectId(Request $request, array $subjects): ?int
    {
        $requestedId = (int) $request->integer('subject_id');

        if ($requestedId > 0) {
            foreach ($subjects as $subject) {
                if ((int) ($subject['id'] ?? 0) === $requestedId) {
                    return $requestedId;
                }
            }
        }

        if ($subjects === []) {
            return null;
        }

        return (int) ($subjects[0]['id'] ?? 0);
    }

    /**
     * @param  array<int, array<string, mixed>>  $subjects
     * @param  array<int, array<string, string|null>>  $resources
     * @return array<string, mixed>
     */
    private function buildSelectedSubject(array $subjects, int $selectedSubjectId, array $resources): ?array
    {
        $subject = null;

        foreach ($subjects as $item) {
            if ((int) ($item['id'] ?? 0) === $selectedSubjectId) {
                $subject = $item;
                break;
            }
        }

        if (! is_array($subject)) {
            return null;
        }

        $regularByUnit = [];
        $folderChildrenByUnit = [];
        $standaloneFoldersByUnit = [];

        foreach ($resources as $index => $resource) {
            $name = trim((string) ($resource['nombre'] ?? ''));
            $unitName = $this->normalizeUnitName($resource['unidad'] ?? null);

            if ($name === '') {
                continue;
            }

            $kind = $this->normalizeKind((string) ($resource['tipo'] ?? 'other'));
            $bucket = $this->normalizeBucket((string) ($resource['bucket'] ?? ''), $kind);
            $module = is_string($resource['modulo'] ?? null) ? (string) $resource['modulo'] : null;
            $folderName = is_string($resource['contenedor'] ?? null)
                ? trim((string) $resource['contenedor'])
                : null;

            $resolvedUrl = $this->buildResolvedUrl(
                is_string($resource['url'] ?? null) ? (string) $resource['url'] : null,
                $kind,
                $module,
            );
            $downloadUrl = $this->buildDownloadUrl($resolvedUrl, $kind, $module);

            $normalizedResource = [
                'id' => sprintf('res-%d-%d', $selectedSubjectId, $index + 1),
                'name' => $name,
                'kind' => $kind,
                'kindLabel' => $this->kindLabel($kind, is_string($resource['tipo_label'] ?? null) ? (string) $resource['tipo_label'] : null),
                'bucket' => $bucket,
                'sizeLabel' => is_string($resource['tamano'] ?? null) ? trim((string) $resource['tamano']) : null,
                'extension' => is_string($resource['extension'] ?? null) ? trim((string) $resource['extension']) : null,
                'url' => $resolvedUrl,
                'downloadUrl' => $downloadUrl,
                'module' => $module,
                'folderName' => $folderName,
                'children' => null,
            ];

            if ($kind === 'folder') {
                $folderKey = mb_strtolower($name);
                $standaloneFoldersByUnit[$unitName] ??= [];
                $standaloneFoldersByUnit[$unitName][$folderKey] = $normalizedResource;

                continue;
            }

            if (is_string($folderName) && $folderName !== '') {
                $folderKey = mb_strtolower($folderName);
                $folderChildrenByUnit[$unitName] ??= [];
                $folderChildrenByUnit[$unitName][$folderKey] ??= [
                    'name' => $folderName,
                    'items' => [],
                ];
                $folderChildrenByUnit[$unitName][$folderKey]['items'][] = [
                    ...$normalizedResource,
                    'folderName' => null,
                ];

                continue;
            }

            $regularByUnit[$unitName] ??= [];
            $regularByUnit[$unitName][] = $normalizedResource;
        }

        $unitsMap = [];
        $unitNames = array_unique(array_merge(
            array_keys($regularByUnit),
            array_keys($folderChildrenByUnit),
            array_keys($standaloneFoldersByUnit),
        ));

        foreach ($unitNames as $unitName) {
            $unitResources = $regularByUnit[$unitName] ?? [];
            $folders = $standaloneFoldersByUnit[$unitName] ?? [];
            $folderChildren = $folderChildrenByUnit[$unitName] ?? [];

            foreach ($folderChildren as $folderKey => $folderGroup) {
                $children = is_array($folderGroup['items'] ?? null) ? $folderGroup['items'] : [];

                usort($children, static fn (array $a, array $b): int => strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? '')));

                $baseFolder = $folders[$folderKey] ?? null;
                $folderName = $baseFolder['name'] ?? (is_string($folderGroup['name'] ?? null) ? (string) $folderGroup['name'] : 'Carpeta');

                $unitResources[] = [
                    'id' => is_string($baseFolder['id'] ?? null) ? (string) $baseFolder['id'] : sprintf('folder-%d-%s', $selectedSubjectId, md5($unitName.'|'.$folderKey)),
                    'name' => $folderName,
                    'kind' => 'folder',
                    'kindLabel' => 'Carpeta',
                    'bucket' => 'folders',
                    'sizeLabel' => null,
                    'extension' => null,
                    'url' => is_string($baseFolder['url'] ?? null) ? (string) $baseFolder['url'] : null,
                    'downloadUrl' => null,
                    'module' => 'folder',
                    'folderName' => null,
                    'children' => $children,
                ];

                unset($folders[$folderKey]);
            }

            foreach ($folders as $folder) {
                $unitResources[] = [
                    ...$folder,
                    'bucket' => 'folders',
                    'children' => [],
                ];
            }

            $unitsMap[$unitName] = $unitResources;
        }

        $units = [];

        foreach ($unitsMap as $unitName => $unitResources) {
            usort($unitResources, static fn (array $a, array $b): int => strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? '')));

            $units[] = [
                'name' => $unitName,
                'resources' => $unitResources,
            ];
        }

        usort($units, static fn (array $a, array $b): int => strcmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? '')));

        return [
            ...$subject,
            'resourceCount' => array_sum(array_map(static fn (array $unit): int => count($unit['resources']), $units)),
            'units' => $units,
        ];
    }

    private function normalizeUnitName(mixed $rawUnit): string
    {
        $unitName = trim((string) $rawUnit);

        return $unitName !== '' ? $unitName : 'General';
    }

    /**
     * @param  array<int, array<string, string|null>>  $resources
     * @return array<string, mixed>
     */
    private function buildSummary(array $resources): array
    {
        $totalResources = 0;
        $documents = 0;
        $multimedia = 0;
        $links = 0;

        $metadata = [
            'links' => 0,
            'images' => 0,
            'files' => 0,
            'folders' => 0,
            'others' => 0,
        ];

        foreach ($resources as $resource) {
            $name = trim((string) ($resource['nombre'] ?? ''));

            if ($name === '') {
                continue;
            }

            $totalResources++;

            $kind = $this->normalizeKind((string) ($resource['tipo'] ?? 'other'));
            $bucket = $this->normalizeBucket((string) ($resource['bucket'] ?? ''), $kind);

            if ($kind === 'document' || $kind === 'archive') {
                $documents++;
            }

            if ($kind === 'multimedia') {
                $multimedia++;
            }

            if ($kind === 'external_link') {
                $links++;
            }

            if (isset($metadata[$bucket])) {
                $metadata[$bucket]++;
            }
        }

        return [
            'totalResources' => $totalResources,
            'formatDistribution' => [
                'documents' => $documents,
                'multimedia' => $multimedia,
                'links' => $links,
            ],
            'metadata' => $metadata,
        ];
    }

    private function normalizeKind(string $kind): string
    {
        return match ($kind) {
            'document', 'archive', 'folder', 'multimedia', 'external_link', 'image' => $kind,
            default => 'other',
        };
    }

    private function normalizeBucket(string $bucket, string $kind): string
    {
        if (in_array($bucket, ['links', 'images', 'files', 'folders', 'others'], true)) {
            return $bucket;
        }

        return match ($kind) {
            'external_link' => 'links',
            'image' => 'images',
            'document', 'archive' => 'files',
            'folder' => 'folders',
            default => 'others',
        };
    }

    private function kindLabel(string $kind, ?string $fallbackLabel): string
    {
        if ($fallbackLabel !== null && trim($fallbackLabel) !== '') {
            return trim($fallbackLabel);
        }

        return match ($kind) {
            'document' => 'Documento',
            'archive' => 'Archivo',
            'folder' => 'Carpeta',
            'multimedia' => 'Multimedia',
            'external_link' => 'Enlace externo',
            'image' => 'Imagen',
            default => 'Recurso',
        };
    }

    private function buildResolvedUrl(?string $url, string $kind, ?string $module): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        $normalizedUrl = $this->accessUrl->toAbsoluteUrl(trim($url), $module);

        if (! is_string($normalizedUrl) || trim($normalizedUrl) === '') {
            return null;
        }

        $resolved = $normalizedUrl;

        if ($kind === 'external_link' && str_contains($normalizedUrl, '/mod/url/view.php')) {
            $resolved = $this->appendQueryParam($normalizedUrl, 'redirect', '1');
        }

        return $this->accessUrl->toAccessibleUrl($resolved);
    }

    private function buildDownloadUrl(?string $url, string $kind, ?string $module): ?string
    {
        if (! is_string($url) || trim($url) === '') {
            return null;
        }

        if (! in_array($kind, ['document', 'archive', 'image', 'multimedia'], true)) {
            return null;
        }

        $normalizedUrl = $this->accessUrl->toAbsoluteUrl(trim($url), $module);

        if (! is_string($normalizedUrl) || trim($normalizedUrl) === '') {
            return null;
        }

        if (str_contains($normalizedUrl, '/pluginfile.php') || str_contains($normalizedUrl, '/webservice/pluginfile.php')) {
            $downloadUrl = $this->appendQueryParam($normalizedUrl, 'forcedownload', '1');

            return $this->accessUrl->toAccessibleUrl($downloadUrl);
        }

        // Evita descargar HTML de vistas tipo /mod/*/view.php (termina como view.htm en navegador).
        return null;
    }

    private function appendQueryParam(string $url, string $key, string $value): string
    {
        $parts = parse_url($url);

        if (! is_array($parts)) {
            return $url;
        }

        $query = [];

        if (isset($parts['query']) && is_string($parts['query'])) {
            parse_str($parts['query'], $query);
        }

        $query[$key] = $value;

        $scheme = isset($parts['scheme']) ? $parts['scheme'].'://' : '';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $user = $parts['user'] ?? '';
        $pass = isset($parts['pass']) ? ':'.$parts['pass'] : '';
        $auth = $user !== '' ? $user.$pass.'@' : '';
        $path = $parts['path'] ?? '';
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';
        $queryString = http_build_query($query);

        return $scheme.$auth.$host.$port.$path.($queryString !== '' ? '?'.$queryString : '').$fragment;
    }
}
