<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Services\Moodle\MoodleNotificationCenter;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MoodleNotificationsController extends Controller
{
    public function __construct(
        private readonly MoodleNotificationCenter $notificationCenter,
        private readonly MoodleUserAcademicCache $cache,
    ) {
    }

    public function markAllAsRead(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user) {
            try {
                $payload = $this->cache->getForUser($user);
                $tasks = is_array($payload['tasks'] ?? null) ? $payload['tasks'] : [];
                $notifications = $this->notificationCenter->buildForUser($user, $tasks);
                $ids = collect(is_array($notifications['items'] ?? null) ? $notifications['items'] : [])
                    ->map(fn (array $item): string => trim((string) ($item['id'] ?? '')))
                    ->filter(fn (string $id): bool => $id !== '')
                    ->values()
                    ->all();

                $this->notificationCenter->markItemsAsRead($user, $ids);
            } catch (\Throwable) {
                $this->notificationCenter->markAllAsRead($user);
            }
        }

        return back();
    }
}
