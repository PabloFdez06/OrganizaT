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
    ) {
    }

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
            default => 'Actualizacion academica - '.$title,
        };

        return new Envelope(subject: $subject.' ('.$course.')');
    }

    public function content(): Content
    {
        $rawUrl = trim((string) ($this->notification['url'] ?? '/tareas'));
        $appUrl = rtrim((string) config('app.url', 'http://localhost'), '/');
        $appName = trim((string) config('app.name', 'Campus'));
        $trigger = trim((string) ($this->notification['trigger'] ?? 'system'));
        $level = trim((string) ($this->notification['level'] ?? 'info'));

        $url = preg_match('/^https?:\/\//i', $rawUrl)
            ? $rawUrl
            : $appUrl.'/'.ltrim($rawUrl, '/');

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
                'appName' => $appName,
                'triggerLabel' => $triggerLabel,
                'introText' => $introText,
                'badgeBackground' => $badgeStyles['background'],
                'badgeText' => $badgeStyles['text'],
            ],
        );
    }
}
