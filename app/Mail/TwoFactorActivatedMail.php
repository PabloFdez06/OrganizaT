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
        $displayTimezone = (string) config('app.display_timezone', 'Europe/Madrid');
        $confirmationDateTime = $this->user->two_factor_confirmed_at?->copy() ?? now();
        $confirmationDateTime = $confirmationDateTime->timezone($displayTimezone);

        return new Content(
            view: 'emails.security.two-factor-activated',
            with: [
                'recipientName' => trim((string) ($this->user->name ?? '')),
                'appName' => trim((string) config('app.name', 'Campus')),
                'securityUrl' => url('/settings/security'),
                'activatedAt' => $confirmationDateTime->format('d/m/Y H:i'),
                'activatedAtTimezone' => $confirmationDateTime->format('T'),
            ],
        );
    }
}
