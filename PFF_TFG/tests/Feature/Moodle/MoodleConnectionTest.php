<?php

use App\Jobs\Moodle\ConnectMoodleJob;
use App\Models\User;
use App\Services\Moodle\MoodleCasClient;
use App\Services\Moodle\MoodleSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

it('dispatches connect job and returns pending status', function (): void {
    Queue::fake();

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/moodle-connect', [
            'moodle_username' => 'alumno',
            'moodle_password' => 'secreto123',
        ]);

    $response->assertOk()->assertJson([
        'status' => 'pending',
    ]);

    Queue::assertPushed(ConnectMoodleJob::class, function ($job) use ($user) {
        return $job->userId === $user->id
            && $job->moodleUsername === 'alumno'
            && $job->moodlePassword === 'secreto123';
    });
});
