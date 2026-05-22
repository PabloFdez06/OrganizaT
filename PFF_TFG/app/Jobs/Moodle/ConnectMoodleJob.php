<?php

namespace App\Jobs\Moodle;

use App\Models\User;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAsyncSectionCache;
use App\Services\Moodle\MoodleCasClient;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ConnectMoodleJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $timeout = 180;

    public function __construct(
        public readonly int $userId,
        public readonly string $moodleUsername,
        public readonly string $moodlePassword,
    ) {}

    public function handle(
        MoodleCasClient $client,
        MoodleEphemeralSessionService $sessionService,
        MoodleUserAcademicCache $academicCache,
        MoodleAsyncSectionCache $asyncCache,
    ): void {
        $user = User::query()->find($this->userId);

        if (! $user) {
            return;
        }

        try {
            $session = $client->login($this->moodleUsername, $this->moodlePassword);
            $sessionService->storeForUser($user, $this->moodleUsername, $session);
            $session->close();
        } catch (MoodleAuthenticationException) {
            $asyncCache->markError('moodle-connect', $user->id, 'Credenciales Moodle inválidas.');

            return;
        } catch (MoodleRequestException $exception) {
            $message = $exception->getMessage() === 'Missing Moodle/CAS configuration.'
                ? 'Falta la configuración Moodle en .env.'
                : $exception->getMessage();

            $asyncCache->markError('moodle-connect', $user->id, $message);

            return;
        } catch (\Throwable $exception) {
            Log::error('Error al conectar Moodle en segundo plano.', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);

            $asyncCache->markError('moodle-connect', $user->id, 'No se pudo conectar a Moodle en este momento.');

            return;
        }

        $user->update(['moodle_username' => $this->moodleUsername]);
        $academicCache->clearForUser($user);

        $asyncCache->markDone('moodle-connect', $user->id, ['message' => 'Cuenta Moodle conectada correctamente.']);
    }
}
