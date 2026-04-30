<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MoodleNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  array<string, mixed>  $notification
     */
    public function __construct(
        public array $notification,
        public User $user,
    ) {}

    public function envelope(): Envelope
    {
        $title = trim((string) ($this->notification['title'] ?? 'Notificacion Moodle'));
        $course = trim((string) ($this->notification['course'] ?? 'Asignatura'));
        $trigger = trim((string) ($this->notification['trigger'] ?? 'system'));

        $subject = match ($trigger) {
            'new_task' => 'Nueva tarea publicada - '.$title,
            'overdue' => 'URGENTE: entrega vencida - '.$title,
            'same_day' => 'Entrega para hoy - '.$title,
            'custom' => 'Recordatorio personalizado - '.$title,
            '24h' => 'Entrega en menos de 24h - '.$title,
            '48h' => 'Entrega en menos de 48h - '.$title,
            'moodle_message' => 'Nuevo mensaje de Moodle - '.$title,
            default => 'Actualizacion academica - '.$title,
        };

        return new Envelope(subject: $subject.' ('.$course.')');
    }

    public function content(): Content
    {
        $rawUrl = trim((string) ($this->notification['url'] ?? ''));
        $appUrl = rtrim((string) config('app.url', 'http://localhost'), '/');
        $logoSrc = $this->resolveLogoSrc($appUrl);
        $appName = trim((string) config('app.name', 'Campus'));
        $trigger = trim((string) ($this->notification['trigger'] ?? 'system'));
        $level = trim((string) ($this->notification['level'] ?? 'info'));
        $dashboardUrl = $appUrl.'/dashboard';

        $url = $dashboardUrl;

        if ($rawUrl !== '') {
            if (preg_match('/^https?:\/\//i', $rawUrl) === 1) {
                $url = $rawUrl;
            } elseif (str_starts_with($rawUrl, '/')) {
                $url = $appUrl.$rawUrl;
            } else {
                $url = $appUrl.'/'.ltrim($rawUrl, '/');
            }
        }

        $triggerLabel = match ($trigger) {
            'new_task' => 'Nueva tarea',
            'overdue' => 'Entrega vencida',
            'same_day' => 'Entrega hoy',
            'custom' => 'Recordatorio personalizado',
            '24h' => 'Entrega en menos de 24h',
            '48h' => 'Entrega en menos de 48h',
            'new_grade' => 'Nueva calificacion',
            'new_feedback' => 'Nueva retroalimentacion',
            'deadline_changed' => 'Cambio de fecha',
            'moodle_message' => 'Nuevo mensaje en Moodle',
            default => 'Actualizacion academica',
        };

        $introText = match ($trigger) {
            'overdue' => 'Esta actividad esta fuera de plazo y requiere atencion inmediata.',
            'same_day' => 'La fecha limite vence hoy. Prioriza esta entrega.',
            '24h', '48h', 'custom' => 'Tienes una entrega proxima segun tu configuracion de recordatorios.',
            'new_task' => 'Se detecto una nueva actividad publicada por el profesor.',
            'new_grade' => 'Se registro una nueva calificacion en Moodle.',
            'new_feedback' => 'El profesor publico nueva retroalimentacion en una actividad.',
            'deadline_changed' => 'Se actualizo la fecha de entrega de una actividad.',
            'moodle_message' => 'Se detecto un nuevo mensaje en la mensajeria de Moodle.',
            default => 'Se detecto un nuevo evento en tu actividad academica.',
        };

        $badgeStyles = match ($level) {
            'critical' => [
                'background' => '#fee4e2',
                'text' => '#b42318',
            ],
            'warning' => [
                'background' => '#fef3c7',
                'text' => '#b45309',
            ],
            default => [
                'background' => '#ede9fe',
                'text' => '#5b21b6',
            ],
        };

        return new Content(
            view: 'emails.moodle.notification',
            with: [
                'notification' => $this->notification,
                'recipientName' => trim((string) ($this->user->name ?? '')),
                'actionUrl' => $url,
                'logoSrc' => $logoSrc,
                'appName' => $appName,
                'triggerLabel' => $triggerLabel,
                'introText' => $introText,
                'badgeBackground' => $badgeStyles['background'],
                'badgeText' => $badgeStyles['text'],
            ],
        );
    }

    private function resolveLogoSrc(string $appUrl): string
    {
        $logoPath = public_path('favicon.png');

        if (is_file($logoPath)) {
            try {
                return $this->embed($logoPath);
            } catch (\Throwable) {
                // Fallback below if embedding is not available for this transport.
            }
        }

        return $appUrl.'/favicon.png';
    }
}
