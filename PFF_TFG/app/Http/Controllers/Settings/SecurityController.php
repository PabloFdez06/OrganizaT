<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class SecurityController extends Controller
{
    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
    ) {
    }

    /**
     * Show the user's configuration settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);
        $courses = [];

        $profile = [
            'fullName' => $user?->name,
            'email' => $user?->email,
            'course' => null,
            'academicYear' => null,
            'avatarUrl' => null,
        ];

        $syncStatus = [
            'lastSyncLabel' => null,
            'message' => null,
        ];

        if ($moodleConnected) {
            try {
                $payload = $this->cache->getForUser($user);

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
                $courses = is_array($payload['courses'] ?? null) ? $payload['courses'] : [];
                $syncStatus['lastSyncLabel'] = now()->format('H:i');
            } catch (MoodleAuthenticationException|MoodleRequestException $exception) {
                $syncStatus['message'] = $exception->getMessage();
            } catch (\Throwable) {
                $syncStatus['message'] = 'No se pudo obtener la sincronización de Moodle en este momento.';
            }
        }

        $savedPreferences = is_array($user?->moodle_notification_preferences)
            ? $user->moodle_notification_preferences
            : [];

        $preferences = array_merge($this->defaultPreferences(), $savedPreferences);

        $cacheFreshMinutes = max(1, (int) ceil(max(60, (int) config('services.moodle.cache_ttl_seconds', 300)) / 60));
        $cacheStaleMinutes = max($cacheFreshMinutes, (int) ceil(max(60, (int) config('services.moodle.cache_stale_ttl_seconds', 900)) / 60));

        $availableQuickSubjects = collect($courses)
            ->map(function (array $course): array {
                return [
                    'id' => (int) ($course['id'] ?? 0),
                    'title' => trim((string) ($course['nombre'] ?? 'Asignatura')),
                ];
            })
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

        return Inertia::render('settings/security', [
            'moodleConnected' => $moodleConnected,
            'profile' => $profile,
            'syncStatus' => $syncStatus,
            'preferences' => $preferences,
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'twoFactorEnabled' => $user?->hasEnabledTwoFactorAuthentication() ?? false,
            'cacheConfig' => [
                'asignaturasMinutes' => $cacheFreshMinutes,
                'tareasMinutes' => $cacheFreshMinutes,
                'staleMinutes' => $cacheStaleMinutes,
            ],
            'quickSubjects' => [
                'available' => $availableQuickSubjects,
                'selected' => $selectedQuickSubjects,
                'selectionLimit' => 4,
            ],
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
        ]);

        $merged = array_merge($this->defaultPreferences(), $data);

        if (! $merged['recordatorio_personalizado']) {
            $merged['recordatorio_personalizado_minutos'] = $this->defaultPreferences()['recordatorio_personalizado_minutos'];
        }

        $request->user()->update([
            'moodle_notification_preferences' => $merged,
        ]);

        return back()->with('success', 'Preferencias actualizadas.');
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
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);

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
        $this->cache->clearForUser($request->user());

        $request->user()->update([
            'moodle_username' => null,
            'moodle_password' => null,
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
        ];
    }
}
