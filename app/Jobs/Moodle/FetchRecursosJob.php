<?php

namespace App\Jobs\Moodle;

use App\Models\User;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAcademicService;
use App\Services\Moodle\MoodleAsyncSectionCache;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchRecursosJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $timeout = 240;

    public function __construct(
        public readonly int $userId,
        public readonly ?int $requestedSubjectId = null,
    ) {}

    public function handle(
        MoodleUserAcademicCache $academicCache,
        MoodleAcademicService $academicService,
        MoodleEphemeralSessionService $sessionService,
        MoodleAsyncSectionCache $asyncCache,
    ): void {
        $user = User::query()->find($this->userId);

        if (! $user) {
            return;
        }

        if (! $sessionService->hasActiveSession($user)) {
            $asyncCache->markError('recursos', $user->id, 'Tu sesión de Moodle no está activa. Vuelve a conectar tu cuenta.', $this->scope());

            return;
        }

        try {
            $payload = $academicCache->getForUser($user);
            $courses = is_array($payload['courses'] ?? null) ? $payload['courses'] : [];
            $selectedSubjectId = $this->resolveSelectedSubjectId($courses);
            $resources = [];

            if ($selectedSubjectId !== null) {
                $session = $sessionService->reopenForUser($user);

                try {
                    $resources = $academicService->getResourcesByCourse($session, $selectedSubjectId);
                } finally {
                    $session->close();
                }
            }

            $asyncCache->markDone('recursos', $user->id, [
                'academicPayload' => $payload,
                'selectedSubjectId' => $selectedSubjectId,
                'resources' => $resources,
            ], $this->scope());
        } catch (MoodleAuthenticationException|MoodleRequestException $exception) {
            $asyncCache->markError('recursos', $user->id, $exception->getMessage(), $this->scope());
        } catch (\Throwable $exception) {
            Log::error('Error al obtener recursos en segundo plano.', [
                'user_id' => $user->id,
                'requested_subject_id' => $this->requestedSubjectId,
                'message' => $exception->getMessage(),
            ]);

            $asyncCache->markError('recursos', $user->id, 'No se pudieron cargar los recursos en este momento.', $this->scope());
        }
    }

    private function scope(): string
    {
        return $this->requestedSubjectId !== null && $this->requestedSubjectId > 0
            ? 'subject:'.$this->requestedSubjectId
            : 'subject:auto';
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     */
    private function resolveSelectedSubjectId(array $courses): ?int
    {
        $validIds = [];

        foreach ($courses as $course) {
            if (! is_array($course)) {
                continue;
            }

            $courseId = (int) ($course['id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            $validIds[] = $courseId;
        }

        if ($validIds === []) {
            return null;
        }

        if ($this->requestedSubjectId !== null && in_array($this->requestedSubjectId, $validIds, true)) {
            return $this->requestedSubjectId;
        }

        return $validIds[0];
    }
}
