<?php

namespace App\Jobs\Moodle;

use App\Models\User;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\MoodleAcademicService;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleNotificationCenter;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CheckUserMoodleNotificationsJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $timeout = 240;

    /**
     * @var array<int, int>
     */
    public array $backoff = [60, 180, 360];

    public function __construct(
        public readonly int $userId,
    ) {
    }

    public function handle(
        MoodleEphemeralSessionService $sessionService,
        MoodleAcademicService $academicService,
        MoodleNotificationCenter $notificationCenter,
    ): void {
        $user = User::query()->find($this->userId);

        if (! $user) {
            return;
        }

        if (! (bool) $user->moodle_background_notifications) {
            return;
        }

        $session = $sessionService->restoreSessionFromDatabase($user);

        if (! $session) {
            $sessionService->invalidateDatabaseSession($user);

            return;
        }

        try {
            $payload = $academicService->getAllAssignments($session);
            $tasks = is_array($payload['tareas'] ?? null) ? $payload['tareas'] : [];

            $notificationCenter->buildForUser($user, $tasks);
        } catch (MoodleAuthenticationException $exception) {
            $sessionService->invalidateDatabaseSession($user);

            Log::warning('Sesión Moodle inválida durante comprobación en background.', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);
        } catch (\Throwable $exception) {
            Log::error('Error en comprobación de notificaciones Moodle en background.', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            throw $exception;
        } finally {
            $session->close();
        }
    }
}
