<?php

namespace App\Listeners;

use App\Mail\WelcomeAccountMail;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendWelcomeEmailAfterRegistration
{
    public function handle(Registered $event): void
    {
        $user = $event->user;

        if (! $user instanceof User) {
            return;
        }

        $recipient = trim((string) $user->email);

        if ($recipient === '') {
            return;
        }

        try {
            Mail::to($recipient)->queue(
                (new WelcomeAccountMail($user))->onQueue('mail'),
            );
        } catch (\Throwable $exception) {
            Log::warning('No se pudo encolar el correo de bienvenida tras el registro.', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
