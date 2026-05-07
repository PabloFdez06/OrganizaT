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
        $recipient = $this->resolveIncidentRecipient();

        if ($recipient === '') {
            return back()->withErrors([
                'incident_report' => 'No se pudo enviar el reporte porque no hay correo de soporte configurado.',
            ]);
        }

        try {
            Mail::to($recipient)->send(
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
                'message' => $exception->getMessage(),
            ]);

            return back()->withErrors([
                'incident_report' => 'No se pudo enviar el reporte en este momento. Inténtalo de nuevo.',
            ]);
        }

        return back()->with('success', 'Reporte enviado correctamente. Revisaremos la incidencia lo antes posible.');
    }

    private function resolveIncidentRecipient(): string
    {
        $fromAddress = trim((string) config('mail.from.address', ''));

        if ($fromAddress !== '') {
            return $fromAddress;
        }

        $defaultMailer = trim((string) config('mail.default', 'smtp'));
        $defaultUsername = trim((string) config("mail.mailers.{$defaultMailer}.username", ''));

        if ($defaultUsername !== '') {
            return $defaultUsername;
        }

        return trim((string) config('mail.mailers.smtp.username', ''));
    }
}
