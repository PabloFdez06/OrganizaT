<?php

use App\Jobs\Moodle\CheckUserMoodleNotificationsJob;
use App\Jobs\Moodle\SendMoodleNotificationEmailJob;
use App\Models\User;
use App\Services\Moodle\MoodleNotificationCenter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

it('updates background notifications preference and clears persisted session when disabled', function (): void {
    $user = User::factory()->create([
        'moodle_background_notifications' => true,
        'moodle_session_data' => 'encrypted-session',
        'moodle_session_expires_at' => now()->addHour(),
    ]);

    $response = $this->actingAs($user)->post(route('moodle.preferences.background_notifications.update'), [
        'moodle_background_notifications' => false,
    ]);

    $response->assertRedirect();

    $user->refresh();

    expect((bool) $user->moodle_background_notifications)->toBeFalse();
    expect($user->moodle_session_data)->toBeNull();
    expect($user->moodle_session_expires_at)->toBeNull();
});

it('queues notification checks only for eligible users with active persisted session', function (): void {
    Queue::fake();

    $eligible = User::factory()->create([
        'moodle_background_notifications' => true,
        'moodle_session_data' => 'encrypted-session-a',
        'moodle_session_expires_at' => now()->addMinutes(30),
    ]);

    User::factory()->create([
        'moodle_background_notifications' => false,
        'moodle_session_data' => 'encrypted-session-b',
        'moodle_session_expires_at' => now()->addMinutes(30),
    ]);

    User::factory()->create([
        'moodle_background_notifications' => true,
        'moodle_session_data' => null,
        'moodle_session_expires_at' => now()->addMinutes(30),
    ]);

    User::factory()->create([
        'moodle_background_notifications' => true,
        'moodle_session_data' => 'encrypted-session-c',
        'moodle_session_expires_at' => now()->subMinute(),
    ]);

    $this->artisan('moodle:check-notifications')
        ->assertSuccessful();

    Queue::assertPushed(CheckUserMoodleNotificationsJob::class, function (CheckUserMoodleNotificationsJob $job) use ($eligible): bool {
        return $job->userId === (int) $eligible->id;
    });

    Queue::assertPushed(CheckUserMoodleNotificationsJob::class, 1);
});

it('stores emailed notification ids in database after dispatch', function (): void {
    Queue::fake();

    $user = User::factory()->create([
        'email' => 'moodle-notify@example.com',
    ]);

    $dueAt = now()->addHours(6)->startOfMinute();
    $task = [
        'pendiente' => true,
        'fecha_iso' => $dueAt->toIso8601String(),
        'titulo' => 'Entrega final',
        'asignatura_nombre' => 'Matematicas',
        'url' => '/course/1',
    ];

    $expectedId = md5('Matematicas|Entrega final|'.$dueAt->toIso8601String().'|same_day');

    app(MoodleNotificationCenter::class)->buildForUser($user, [$task], [], true);

    $this->assertDatabaseHas('moodle_notification_emails', [
        'user_id' => $user->id,
        'notification_id' => $expectedId,
    ]);

    Queue::assertPushed(SendMoodleNotificationEmailJob::class, 1);
});

it('does not dispatch duplicate email jobs for the same notification id', function (): void {
    Queue::fake();

    $user = User::factory()->create([
        'email' => 'moodle-notify@example.com',
    ]);

    $dueAt = now()->addHours(6)->startOfMinute();
    $task = [
        'pendiente' => true,
        'fecha_iso' => $dueAt->toIso8601String(),
        'titulo' => 'Entrega final',
        'asignatura_nombre' => 'Matematicas',
        'url' => '/course/1',
    ];

    $expectedId = md5('Matematicas|Entrega final|'.$dueAt->toIso8601String().'|same_day');

    $notificationCenter = app(MoodleNotificationCenter::class);

    $notificationCenter->buildForUser($user, [$task], [], true);
    $notificationCenter->buildForUser($user, [$task], [], true);

    $this->assertDatabaseHas('moodle_notification_emails', [
        'user_id' => $user->id,
        'notification_id' => $expectedId,
    ]);
    $this->assertDatabaseCount('moodle_notification_emails', 1);

    Queue::assertPushed(SendMoodleNotificationEmailJob::class, 1);
});

it('handles existing emailed id with insertOrIgnore semantics', function (): void {
    Queue::fake();

    $user = User::factory()->create([
        'email' => 'moodle-notify@example.com',
    ]);

    $dueAt = now()->addHours(6)->startOfMinute();
    $task = [
        'pendiente' => true,
        'fecha_iso' => $dueAt->toIso8601String(),
        'titulo' => 'Entrega final',
        'asignatura_nombre' => 'Matematicas',
        'url' => '/course/1',
    ];

    $expectedId = md5('Matematicas|Entrega final|'.$dueAt->toIso8601String().'|same_day');

    DB::table('moodle_notification_emails')->insert([
        'user_id' => $user->id,
        'notification_id' => $expectedId,
        'sent_at' => now(),
    ]);

    app(MoodleNotificationCenter::class)->buildForUser($user, [$task], [], true);

    $this->assertDatabaseHas('moodle_notification_emails', [
        'user_id' => $user->id,
        'notification_id' => $expectedId,
    ]);
    $this->assertDatabaseCount('moodle_notification_emails', 1);

    Queue::assertNotPushed(SendMoodleNotificationEmailJob::class);
});

it('prunes emailed records older than the configured threshold', function (): void {
    $user = User::factory()->create();

    DB::table('moodle_notification_emails')->insert([
        [
            'user_id' => $user->id,
            'notification_id' => 'old-id',
            'sent_at' => now()->subDays(31),
        ],
        [
            'user_id' => $user->id,
            'notification_id' => 'recent-id',
            'sent_at' => now()->subDays(5),
        ],
    ]);

    $deleted = app(MoodleNotificationCenter::class)->pruneEmailedRecords(30);

    expect($deleted)->toBe(1);

    $this->assertDatabaseMissing('moodle_notification_emails', [
        'user_id' => $user->id,
        'notification_id' => 'old-id',
    ]);
    $this->assertDatabaseHas('moodle_notification_emails', [
        'user_id' => $user->id,
        'notification_id' => 'recent-id',
    ]);
});
