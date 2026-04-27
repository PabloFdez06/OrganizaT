<?php

namespace App\Jobs\Moodle;

use App\Mail\MoodleNotificationMail;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendMoodleNotificationEmailJob implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;


    /**
     * @var array<int, int>
     */
    public array $backoff = [30, 90, 270];

    /**
     * @param  array<string, mixed>  $notification
     */
    public function __construct(
        public readonly User $user,
        public readonly array $notification,
    ) {
    }

    public function handle(): void
    {
        $recipient = trim((string) ($this->user->email ?? ''));

        if ($recipient === '') {
            return;
        }

        $notificationId = trim((string) ($this->notification['id'] ?? ''));

        if ($notificationId === '') {
            return;
        }

        $cacheKey = $this->emailedKey($this->user->id);
        $emailed = Cache::get($cacheKey);
        $emailedIds = is_array($emailed) ? $emailed : [];

        if (isset($emailedIds[$notificationId])) {
            return;
        }

        try {
            Mail::to($recipient)->send(new MoodleNotificationMail($this->notification, $this->user));
        } catch (\Throwable $exception) {
            Log::warning('No se pudo enviar notificación Moodle por email en segundo plano.', [
                'user_id' => $this->user->id,
                'notification_id' => $notificationId,
                'message' => $exception->getMessage(),
            ]);

            throw $exception;
        }

        $emailedIds[$notificationId] = CarbonImmutable::now()->toIso8601String();

        Cache::put($cacheKey, $emailedIds, now()->addSeconds(1209600));
    }

    private function emailedKey(int $userId): string
    {
        return 'moodle:notifications:emailed:'.$userId;
    }
}
