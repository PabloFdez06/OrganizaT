<?php

namespace App\Console\Commands;

use App\Jobs\Moodle\CheckUserMoodleNotificationsJob;
use App\Models\User;
use App\Services\Moodle\MoodleNotificationCenter;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckMoodleNotificationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'moodle:check-notifications';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verifica notificaciones Moodle en background para usuarios con sesión persistida válida.';

    /**
     * Execute the console command.
     */
    public function handle(MoodleNotificationCenter $notificationCenter): int
    {
        $processed = 0;

        $notificationCenter->pruneEmailedRecords(30);

        User::query()
            ->where('moodle_background_notifications', true)
            ->whereNotNull('moodle_session_data')
            ->whereNotNull('moodle_session_expires_at')
            ->where('moodle_session_expires_at', '>', now())
            ->select(['id'])
            ->chunkById(100, function ($users) use (&$processed): void {
                foreach ($users as $user) {
                    CheckUserMoodleNotificationsJob::dispatch((int) $user->id);
                    $processed++;
                }
            });

        $message = sprintf('moodle:check-notifications procesó %d usuario(s).', $processed);

        $this->info($message);

        Log::info($message);

        return self::SUCCESS;
    }
}
