<?php

use App\Models\User;
use App\Services\Moodle\MoodleCasClient;
use App\Services\Moodle\MoodleEphemeralSessionService;
use App\Services\Moodle\MoodleSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('persists and restores moodle background session from database', function (): void {
    $user = User::factory()->create([
        'moodle_background_notifications' => true,
    ]);

    $storedSession = new MoodleSession(curl_init(), 'sess-123', 42);
    $restoredSession = new MoodleSession(curl_init(), 'sess-restored', 42);

    $client = Mockery::mock(MoodleCasClient::class);
    $client->shouldReceive('exportCookies')
        ->once()
        ->with($storedSession)
        ->andReturn([
            ['name' => 'MoodleSession', 'value' => 'cookie-value'],
        ]);
    $client->shouldReceive('resume')
        ->once()
        ->andReturn($restoredSession);

    $service = new MoodleEphemeralSessionService($client);

    $service->persistSessionToDatabase($user, $storedSession);

    $user->refresh();

    expect($user->moodle_session_data)->not->toBeNull();
    expect($user->moodle_session_data)->not->toContain('sess-123');
    expect($user->moodle_session_expires_at)->not->toBeNull();

    $session = $service->restoreSessionFromDatabase($user);

    expect($session)->toBe($restoredSession);
});

it('invalidates persisted session and does not restore when consent is disabled', function (): void {
    $user = User::factory()->create([
        'moodle_background_notifications' => false,
        'moodle_session_data' => 'encrypted-session',
        'moodle_session_expires_at' => now()->addHour(),
    ]);

    $client = Mockery::mock(MoodleCasClient::class);
    $client->shouldNotReceive('resume');

    $service = new MoodleEphemeralSessionService($client);

    $session = $service->restoreSessionFromDatabase($user);

    expect($session)->toBeNull();

    $service->invalidateDatabaseSession($user);

    $user->refresh();

    expect($user->moodle_session_data)->toBeNull();
    expect($user->moodle_session_expires_at)->toBeNull();
});
