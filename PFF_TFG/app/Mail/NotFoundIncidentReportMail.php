<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NotFoundIncidentReportMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $reporterName,
        public readonly string $reporterEmail,
        public readonly string $description,
        public readonly string $errorUrl,
        public readonly string $reportedAt,
    ) {}

    public function envelope(): Envelope
    {
        $appName = trim((string) config('app.name', 'OrganizaT'));

        return new Envelope(
            subject: 'Nuevo reporte de incidencia 404 - '.$appName,
            replyTo: [
                [
                    'address' => $this->reporterEmail,
                    'name' => $this->reporterName,
                ],
            ],
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.support.not-found-incident-report',
            with: [
                'appName' => trim((string) config('app.name', 'OrganizaT')),
                'reporterName' => $this->reporterName,
                'reporterEmail' => $this->reporterEmail,
                'description' => $this->description,
                'errorUrl' => $this->errorUrl,
                'reportedAt' => $this->reportedAt,
            ],
        );
    }
}
