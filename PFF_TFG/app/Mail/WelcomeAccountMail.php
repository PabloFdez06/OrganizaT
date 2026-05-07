<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeAccountMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        $appName = trim((string) config('app.name', 'Campus'));

        return new Envelope(
            subject: 'Bienvenido a '.$appName.' - Gracias por confiar en nosotros',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.account.welcome',
            with: [
                'recipientName' => trim((string) ($this->user->name ?? '')),
                'appName' => trim((string) config('app.name', 'Campus')),
                'dashboardUrl' => url('/dashboard'),
                'securityUrl' => url('/settings/security'),
            ],
        );
    }
}
