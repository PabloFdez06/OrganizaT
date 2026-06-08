<?php

namespace App\Jobs\Moodle;

use App\Models\User;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAsyncSectionCache;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class FetchDashboardDataJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $timeout = 180;

    public function __construct(
        public readonly int $userId,
    ) {}

    public function handle(
        MoodleUserAcademicCache $academicCache,
        MoodleEphemeralSessionService $sessionService,
        MoodleAsyncSectionCache $asyncCache,
    ): void {
        $user = User::query()->find($this->userId);

        if (! $user) {
            return;
        }

        if (! $sessionService->hasActiveSession($user)) {
            $asyncCache->markError('dashboard', $user->id, 'Tu sesión de Moodle no está activa. Vuelve a conectar tu cuenta.');

            return;
        }

        try {
            $payload = $academicCache->getForUser($user);

            $asyncCache->markDone('dashboard', $user->id, [
                'academicPayload' => $payload,
            ]);
        } catch (MoodleAuthenticationException|MoodleRequestException $exception) {
            $asyncCache->markError('dashboard', $user->id, $exception->getMessage());
        } catch (\Throwable $exception) {
            Log::error('Error al obtener datos del dashboard en segundo plano.', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            $asyncCache->markError('dashboard', $user->id, 'No se pudieron cargar los datos del dashboard en este momento.');
        }
    }
}
