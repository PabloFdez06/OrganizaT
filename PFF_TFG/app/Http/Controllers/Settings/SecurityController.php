<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Jobs\Moodle\SendMoodleNotificationEmailJob;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Actions\DisableTwoFactorAuthentication;
use Laravel\Fortify\Actions\EnableTwoFactorAuthentication;
use Laravel\Fortify\Actions\GenerateNewRecoveryCodes;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class SecurityController extends Controller
{
    private const MOODLE_SESSION_EXPIRED_MESSAGE = 'Tu sesión de Moodle se cerró por inactividad. Debes volver a iniciar sesión porque los datos temporales se han eliminado.';

    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
        private readonly MoodleEphemeralSessionService $sessionService,
    ) {}

    /**
     * Show the user's configuration settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        $cacheFreshMinutes = max(1, (int) ceil(max(60, (int) config('services.moodle.cache_ttl_seconds', 300)) / 60));
        $cacheStaleMinutes = max($cacheFreshMinutes, (int) ceil(max(60, (int) config('services.moodle.cache_stale_ttl_seconds', 900)) / 60));

        // Memoised Moodle data loader — runs at most once per request, only when a Moodle prop is needed.
        // Wrapping Moodle props in closures means Inertia skips them entirely on 2FA partial reloads,
        // preventing expensive Moodle API calls (and the resulting 502) on those lightweight requests.
        $moodleData = null;
        $loadMoodleData = function () use ($user, &$moodleData): array {
            if ($moodleData !== null) {
                return $moodleData;
            }

            $connected = $this->sessionService->hasActiveSession($user);

            if (! $connected) {
                $moodleData = [
                    'connected' => false,
                    'payload' => [],
                    'syncMessage' => is_string($user?->moodle_username) && trim((string) $user->moodle_username) !== ''
                        ? self::MOODLE_SESSION_EXPIRED_MESSAGE
                        : null,
                    'syncLabel' => null,
                ];

                return $moodleData;
            }

            try {
                $payload = $this->cache->getForUser($user);
                $moodleData = [
                    'connected' => true,
                    'payload' => is_array($payload) ? $payload : [],
                    'syncMessage' => null,
                    'syncLabel' => now()->format('H:i'),
                ];
            } catch (MoodleAuthenticationException|MoodleRequestException $exception) {
                $moodleData = [
                    'connected' => true,
                    'payload' => [],
                    'syncMessage' => $exception->getMessage(),
                    'syncLabel' => null,
                ];
            } catch (\Throwable) {
                $moodleData = [
                    'connected' => true,
                    'payload' => [],
                    'syncMessage' => 'No se pudo obtener la sincronización de Moodle en este momento.',
                    'syncLabel' => null,
                ];
            }

            return $moodleData;
        };

        return Inertia::render('settings/security', [
            // ── Moodle-related props (closures) ─────────────────────────────────────
            // These are only evaluated when the prop is actually included in the response.
            // On 2FA partial reloads (only: [twoFactorEnabled, ...]) they are skipped entirely.
            'moodleConnected' => fn () => $loadMoodleData()['connected'],

            'moodleBackgroundNotifications' => fn () => (bool) ($user?->moodle_background_notifications ?? false),

            'profile' => function () use ($user, $loadMoodleData): array {
                $data = $loadMoodleData();
                $payload = $data['payload'];

                $profile = [
                    'fullName' => $user?->name,
                    'email' => $user?->email,
                    'course' => null,
                    'academicYear' => null,
                    'avatarUrl' => null,
                ];

                if ($data['connected'] && ! empty($payload)) {
                    $profile['fullName'] = is_string($payload['studentName'] ?? null) && trim((string) $payload['studentName']) !== ''
                        ? (string) $payload['studentName']
                        : $profile['fullName'];
                    $profile['email'] = is_string($payload['studentEmail'] ?? null) && trim((string) $payload['studentEmail']) !== ''
                        ? (string) $payload['studentEmail']
                        : $profile['email'];
                    $profile['course'] = is_string($payload['academicCourse'] ?? null) && trim((string) $payload['academicCourse']) !== ''
                        ? (string) $payload['academicCourse']
                        : null;
                    $profile['academicYear'] = is_string($payload['academicYear'] ?? null) && trim((string) $payload['academicYear']) !== ''
                        ? (string) $payload['academicYear']
                        : null;
                    $profile['avatarUrl'] = is_string($payload['profileAvatarUrl'] ?? null) && trim((string) $payload['profileAvatarUrl']) !== ''
                        ? (string) $payload['profileAvatarUrl']
                        : null;
                }

                return $profile;
            },

            'syncStatus' => function () use ($loadMoodleData): array {
                $data = $loadMoodleData();

                return [
                    'lastSyncLabel' => $data['syncLabel'],
                    'message' => $data['syncMessage'],
                ];
            },

            'preferences' => function () use ($user): array {
                $saved = is_array($user?->moodle_notification_preferences)
                    ? $user->moodle_notification_preferences
                    : [];

                return array_merge($this->defaultPreferences(), $saved);
            },

            'cacheConfig' => fn () => [
                'asignaturasMinutes' => $cacheFreshMinutes,
                'tareasMinutes' => $cacheFreshMinutes,
                'staleMinutes' => $cacheStaleMinutes,
            ],

            'quickSubjects' => function () use ($user, $loadMoodleData): array {
                $data = $loadMoodleData();
                $courses = $data['connected'] && ! empty($data['payload']) && is_array($data['payload']['courses'] ?? null)
                    ? $data['payload']['courses']
                    : [];

                $availableQuickSubjects = collect($courses)
                    ->map(fn (array $course): array => [
                        'id' => (int) ($course['id'] ?? 0),
                        'title' => trim((string) ($course['nombre'] ?? 'Asignatura')),
                    ])
                    ->filter(fn (array $course): bool => $course['id'] > 0 && $course['title'] !== '')
                    ->values()
                    ->all();

                $selectedQuickSubjects = collect(is_array($user?->dashboard_quick_subject_ids) ? $user->dashboard_quick_subject_ids : [])
                    ->map(fn (mixed $value): int => (int) $value)
                    ->filter(fn (int $value): bool => $value > 0)
                    ->unique()
                    ->values()
                    ->all();

                if (count($selectedQuickSubjects) !== 4) {
                    $selectedQuickSubjects = [];
                }

                return [
                    'available' => $availableQuickSubjects,
                    'selected' => $selectedQuickSubjects,
                    'selectionLimit' => 4,
                ];
            },

            // ── 2FA props (eager) ────────────────────────────────────────────────────
            // Cheap — always evaluated. These are the props used by 2FA partial reloads.
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'twoFactorEnabled' => $user?->hasEnabledTwoFactorAuthentication() ?? false,
            'twoFactorPendingConfirmation' => !is_null($user?->two_factor_secret) && is_null($user?->two_factor_confirmed_at),
            'requiresConfirmation' => Fortify::confirmsTwoFactorAuthentication(),
            'twoFactorQrCodeSvg' => $this->getTwoFactorQrCodeSvg($user),
            'twoFactorSecretKey' => $this->getTwoFactorSecretKey($user),
        ]);
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);

        return back();
    }

    public function updatePreferences(Request $request): RedirectResponse
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

        $savedPreferences = is_array($request->user()->moodle_notification_preferences)
            ? $request->user()->moodle_notification_preferences
            : [];

        $merged = array_merge($this->defaultPreferences(), $savedPreferences, $data);

        if (! $merged['recordatorio_personalizado']) {
            $merged['recordatorio_personalizado_minutos'] = $this->defaultPreferences()['recordatorio_personalizado_minutos'];
        }

        $request->user()->update([
            'moodle_notification_preferences' => $merged,
        ]);

        return back()->with('success', 'Preferencias actualizadas.');
    }

    public function sendTestEmail(Request $request): RedirectResponse
    {
        $user = $request->user();
        $recipient = trim((string) ($user?->email ?? ''));

        if ($recipient === '') {
            return back()->with('error', 'No se pudo enviar el test: el usuario no tiene correo configurado.');
        }

        $now = now();
        $dueAt = $now->copy()->addDays(2)->setHour(23)->setMinute(59);

        $notification = [
            'id' => 'test-mail-'.(string) $user->id.'-'.$now->timestamp,
            'title' => 'Tarea simulada: Entrega de práctica',
            'message' => 'Esto es una simulación de nueva tarea creada por el profesor para validar tus notificaciones por correo.',
            'course' => 'Desarrollo de Aplicaciones Web',
            'level' => 'info',
            'dueLabel' => $dueAt->locale('es')->translatedFormat('D, d M · H:i'),
            'url' => '/tareas',
            'trigger' => 'new_task',
            'category' => 'SIMULACIÓN · NUEVA TAREA',
            'meta' => 'PRUEBA DE EMAIL',
            'isRead' => false,
        ];

        try {
            SendMoodleNotificationEmailJob::dispatch($user, $notification)->onQueue('mail');

            return back()->with('success', 'Correo de simulación encolado para envío a '.$recipient.'.');
        } catch (\Throwable $exception) {
            if ((bool) config('app.debug', false)) {
                return back()->with('error', 'No se pudo encolar el correo de prueba. Detalle: '.$exception->getMessage());
            }

            return back()->with('error', 'No se pudo encolar el correo de prueba. Revisa la configuración de colas.');
        }
    }

    public function updateQuickSubjects(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'subject_ids' => ['nullable', 'array', 'max:4'],
            'subject_ids.*' => ['integer', 'distinct', 'min:1'],
        ]);

        $subjectIds = collect($validated['subject_ids'] ?? [])
            ->map(fn (mixed $value): int => (int) $value)
            ->filter(fn (int $value): bool => $value > 0)
            ->unique()
            ->values();

        if ($subjectIds->count() !== 4) {
            $request->user()->update([
                'dashboard_quick_subject_ids' => null,
            ]);

            return back()->with('success', 'Vista rápida en modo automático: se mostrarán 4 asignaturas por defecto.');
        }

        $user = $request->user();
        $moodleConnected = $this->sessionService->hasActiveSession($user);

        if (! $moodleConnected) {
            return back()->withErrors([
                'subject_ids' => 'Conecta Moodle para configurar las asignaturas de la vista rápida.',
            ]);
        }

        try {
            $payload = $this->cache->getForUser($user);
        } catch (\Throwable) {
            return back()->withErrors([
                'subject_ids' => 'No se pudieron validar las asignaturas en este momento. Inténtalo de nuevo.',
            ]);
        }

        $availableIds = collect(is_array($payload['courses'] ?? null) ? $payload['courses'] : [])
            ->map(fn (array $course): int => (int) ($course['id'] ?? 0))
            ->filter(fn (int $value): bool => $value > 0)
            ->all();

        $invalidSelection = $subjectIds->first(fn (int $subjectId): bool => ! in_array($subjectId, $availableIds, true));

        if ($invalidSelection !== null) {
            return back()->withErrors([
                'subject_ids' => 'La selección contiene asignaturas no disponibles para tu cuenta.',
            ]);
        }

        $user->update([
            'dashboard_quick_subject_ids' => $subjectIds->all(),
        ]);

        return back()->with('success', 'Asignaturas de vista rápida actualizadas correctamente.');
    }

    public function disconnectMoodle(Request $request): RedirectResponse
    {
        $this->sessionService->clearForUser($request->user());
        $this->cache->clearForUser($request->user());

        $request->user()->update([
            'moodle_username' => null,
        ]);

        return back()->with('success', 'Sesión de Moodle cerrada correctamente.');
    }

    public function destroyAccount(Request $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * Enable two-factor authentication for the user (GET, behind password.confirm middleware).
     */
    public function setup(Request $request, EnableTwoFactorAuthentication $enable): RedirectResponse
    {
        $enable($request->user(), false);

        return redirect()->route('security.edit');
    }

    /**
     * Disable two-factor authentication for the user.
     */
    public function disable(Request $request, DisableTwoFactorAuthentication $disable): RedirectResponse
    {
        $disable($request->user());

        return back()->with('status', 'two-factor-authentication-disabled');
    }

    /**
     * Regenerate the user's two-factor authentication recovery codes.
     */
    public function recoveryCodes(Request $request, GenerateNewRecoveryCodes $generate): RedirectResponse
    {
        $generate($request->user());

        return back()->with('status', 'recovery-codes-generated');
    }

    /**
     * Get the QR code SVG for the user's 2FA setup if a secret exists.
     */
    private function getTwoFactorQrCodeSvg(mixed $user): ?string
    {
        if (is_null($user?->two_factor_secret)) {
            return null;
        }

        try {
            return $user->twoFactorQrCodeSvg();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Get the plain-text secret key for the user's 2FA setup if a secret exists.
     */
    private function getTwoFactorSecretKey(mixed $user): ?string
    {
        if (is_null($user?->two_factor_secret)) {
            return null;
        }

        try {
            return Fortify::currentEncrypter()->decrypt($user->two_factor_secret);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @return array<string, bool|int>
     */
    private function defaultPreferences(): array
    {
        return [
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
    }
}
