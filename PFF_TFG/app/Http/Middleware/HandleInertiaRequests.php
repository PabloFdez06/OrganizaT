<?php

namespace App\Http\Middleware;

use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleNotificationCenter;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    public function __construct(
        private readonly MoodleEphemeralSessionService $sessionService,
        private readonly MoodleUserAcademicCache $cache,
        private readonly MoodleNotificationCenter $notificationCenter,
    ) {
    }

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'moodleNotifications' => function () use ($request): array {
                $user = $request->user();

                if (! $user) {
                    return [
                        'unreadCount' => 0,
                        'items' => [],
                    ];
                }

                if (! $this->sessionService->hasActiveSession($user)) {
                    return [
                        'unreadCount' => 0,
                        'items' => [],
                    ];
                }

                try {
                    $payload = $this->cache->getCachedForUser($user);

                    if (! is_array($payload)) {
                        return [
                            'unreadCount' => 0,
                            'items' => [],
                        ];
                    }

                    $tasks = is_array($payload['tasks'] ?? null) ? $payload['tasks'] : [];
                    $messages = is_array($payload['messages'] ?? null) ? $payload['messages'] : [];

                    return $this->notificationCenter->buildForUser($user, $tasks, $messages);
                } catch (\Throwable) {
                    return [
                        'unreadCount' => 0,
                        'items' => [],
                    ];
                }
            },
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
