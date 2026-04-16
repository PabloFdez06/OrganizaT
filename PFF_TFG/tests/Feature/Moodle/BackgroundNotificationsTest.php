<?php

use App\Jobs\Moodle\CheckUserMoodleNotificationsJob;
use App\Models\User;
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
