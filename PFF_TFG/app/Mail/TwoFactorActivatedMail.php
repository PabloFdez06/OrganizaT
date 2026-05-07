<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TwoFactorActivatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        $appName = trim((string) config('app.name', 'Campus'));

        return new Envelope(
            subject: 'Verificacion en dos pasos activada en tu cuenta de '.$appName,
        );
    }

    public function content(): Content
    {
        $activatedAt = $this->user->two_factor_confirmed_at?->copy()
            ->timezone((string) config('app.timezone', 'UTC'))
            ->format('d/m/Y H:i');

        return new Content(
            view: 'emails.security.two-factor-activated',
            with: [
                'recipientName' => trim((string) ($this->user->name ?? '')),
                'appName' => trim((string) config('app.name', 'Campus')),
                'securityUrl' => url('/settings/security'),
                'activatedAt' => $activatedAt ?? now()->format('d/m/Y H:i'),
            ],
        );
    }
}
