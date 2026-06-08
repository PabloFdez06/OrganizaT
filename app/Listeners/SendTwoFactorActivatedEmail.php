<?php

namespace App\Listeners;

use App\Mail\TwoFactorActivatedMail;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;

class SendTwoFactorActivatedEmail
{
    public function handle(TwoFactorAuthenticationConfirmed $event): void
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
                (new TwoFactorActivatedMail($user))->onQueue('mail'),
            );
        } catch (\Throwable $exception) {
            Log::warning('No se pudo encolar el correo de activacion de verificacion en dos pasos.', [
                'user_id' => $user->id,
                'message' => $exception->getMessage(),
            ]);
        }
    }
}
