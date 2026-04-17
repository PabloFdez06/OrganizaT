<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Http\Requests\Moodle\UpdateBackgroundNotificationsRequest;
use App\Services\Moodle\MoodleEphemeralSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MoodlePreferencesController extends Controller
{
    public function __construct(
        private readonly MoodleEphemeralSessionService $sessionService,
    ) {
    }

    /**
     * @var array<string, bool|int>
     */
    private array $defaults = [
        '48h_antes' => true,
        '24h_antes' => true,
        'mismo_dia' => true,
        'recordatorio_personalizado' => false,
        'recordatorio_personalizado_minutos' => 180,
        'email' => true,
        'push' => false,
        'email_48h' => true,
        'email_24h' => true,
        'email_same_day' => true,
        'email_custom' => true,
        'email_overdue' => true,
        'email_new_task' => true,
        'email_deadline_changed' => true,
        'email_new_grade' => true,
        'email_new_feedback' => true,
        'email_moodle_message' => true,
    ];

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $saved = is_array($user->moodle_notification_preferences) ? $user->moodle_notification_preferences : [];

        return response()->json(array_merge($this->defaults, $saved));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            '48h_antes' => ['sometimes', 'boolean'],
            '24h_antes' => ['sometimes', 'boolean'],
            'mismo_dia' => ['sometimes', 'boolean'],
            'recordatorio_personalizado' => ['sometimes', 'boolean'],
            'recordatorio_personalizado_minutos' => ['sometimes', 'integer', 'min:1', 'max:10080'],
            'email' => ['sometimes', 'boolean'],
            'push' => ['sometimes', 'boolean'],
            'email_48h' => ['sometimes', 'boolean'],
            'email_24h' => ['sometimes', 'boolean'],
            'email_same_day' => ['sometimes', 'boolean'],
            'email_custom' => ['sometimes', 'boolean'],
            'email_overdue' => ['sometimes', 'boolean'],
            'email_new_task' => ['sometimes', 'boolean'],
            'email_deadline_changed' => ['sometimes', 'boolean'],
            'email_new_grade' => ['sometimes', 'boolean'],
            'email_new_feedback' => ['sometimes', 'boolean'],
            'email_moodle_message' => ['sometimes', 'boolean'],
        ]);

        $saved = is_array($request->user()->moodle_notification_preferences)
            ? $request->user()->moodle_notification_preferences
            : [];

        $merged = array_merge($this->defaults, $saved, $data);

        if (! $merged['recordatorio_personalizado']) {
            $merged['recordatorio_personalizado_minutos'] = $this->defaults['recordatorio_personalizado_minutos'];
        }

        $request->user()->update(['moodle_notification_preferences' => $merged]);

        return response()->json([
            'message' => 'Preferencias guardadas correctamente.',
            'data' => $merged,
        ]);
    }

    public function updateBackgroundNotifications(UpdateBackgroundNotificationsRequest $request): JsonResponse|RedirectResponse
    {
        $enabled = (bool) $request->boolean('moodle_background_notifications');
        $user = $request->user();

        $user->update([
            'moodle_background_notifications' => $enabled,
        ]);

        if (! $enabled) {
            $this->sessionService->invalidateDatabaseSession($user);
        }

        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json([
                'message' => 'Preferencia de notificaciones en background actualizada correctamente.',
                'data' => [
                    'moodle_background_notifications' => $enabled,
                ],
            ]);
        }

        return back()->with('success', 'Preferencia de notificaciones en background actualizada correctamente.');
    }
}
