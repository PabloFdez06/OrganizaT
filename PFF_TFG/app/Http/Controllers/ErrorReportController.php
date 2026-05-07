<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreNotFoundIncidentRequest;
use App\Mail\NotFoundIncidentReportMail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ErrorReportController extends Controller
{
    public function store(StoreNotFoundIncidentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $recipients = $this->resolveIncidentRecipients();

        if ($recipients === []) {
            return back()->withErrors([
                'incident_report' => 'No se pudo enviar el reporte porque no hay correo de soporte configurado.',
            ]);
        }

        $mailer = $this->resolveDeliveryMailer();

        if ($mailer === null) {
            return back()->withErrors([
                'incident_report' => 'No se pudo enviar el reporte porque el mailer no está configurado para entrega real.',
            ]);
        }

        try {
            Mail::mailer($mailer)->to($recipients)->send(
                new NotFoundIncidentReportMail(
                    reporterName: (string) $validated['name'],
                    reporterEmail: (string) $validated['email'],
                    description: (string) $validated['description'],
                    errorUrl: (string) $validated['error_url'],
                    reportedAt: now()->utc()->toIso8601String(),
                ),
            );
        } catch (\Throwable $exception) {
            Log::warning('No se pudo enviar el reporte de incidencia 404.', [
                'error_url' => (string) $validated['error_url'],
                'reporter_email' => (string) $validated['email'],
                'mailer' => $mailer,
                'recipients_count' => count($recipients),
                'message' => $exception->getMessage(),
            ]);

            return back()->withErrors([
                'incident_report' => 'No se pudo enviar el reporte en este momento. Inténtalo de nuevo.',
            ]);
        }

        Log::info('Reporte de incidencia 404 enviado correctamente.', [
            'error_url' => (string) $validated['error_url'],
            'mailer' => $mailer,
            'recipients_count' => count($recipients),
        ]);

        return back()->with('success', 'Reporte enviado correctamente. Revisaremos la incidencia lo antes posible.');
    }

    /**
     * @return array<int, string>
     */
    private function resolveIncidentRecipients(): array
    {
        $defaultMailer = trim((string) config('mail.default', 'smtp'));
        $candidates = [
            trim((string) config('mail.from.address', '')),
            trim((string) config("mail.mailers.{$defaultMailer}.username", '')),
            trim((string) config('mail.mailers.smtp.username', '')),
        ];

        $recipients = [];

        foreach ($candidates as $candidate) {
            if ($candidate === '' || ! filter_var($candidate, FILTER_VALIDATE_EMAIL)) {
                continue;
            }

            if (! in_array($candidate, $recipients, true)) {
                $recipients[] = $candidate;
            }
        }

        return $recipients;
    }

    private function resolveDeliveryMailer(): ?string
    {
        $defaultMailer = trim((string) config('mail.default', 'smtp'));

        if ($defaultMailer !== '' && ! in_array($defaultMailer, ['log', 'array'], true)) {
            return $defaultMailer;
        }

        $smtpHost = trim((string) config('mail.mailers.smtp.host', ''));
        $smtpUsername = trim((string) config('mail.mailers.smtp.username', ''));
        $smtpPassword = trim((string) config('mail.mailers.smtp.password', ''));

        if ($smtpHost !== '' && $smtpUsername !== '' && $smtpPassword !== '') {
            return 'smtp';
        }

        return null;
    }
}
