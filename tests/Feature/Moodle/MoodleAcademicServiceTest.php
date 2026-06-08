<?php

use App\Jobs\Moodle\FetchAsignaturasJob;
use App\Models\User;
use App\Services\Moodle\MoodleEphemeralSessionService;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

it('renders asignaturas in loading mode and dispatches async job when state is idle', function (): void {
    Queue::fake();

    $user = User::factory()->create([
        'moodle_username' => 'alumno',
    ]);

    $sessionService = Mockery::mock(MoodleEphemeralSessionService::class);
    $sessionService->shouldReceive('hasActiveSession')
        ->atLeast()
        ->once()
        ->andReturnTrue();

    app()->instance(MoodleEphemeralSessionService::class, $sessionService);

    $this->actingAs($user)
        ->get(route('asignaturas.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('asignaturas')
            ->where('loading', true)
            ->where('courseCards', [])
        );

    Queue::assertPushed(FetchAsignaturasJob::class, function (FetchAsignaturasJob $job) use ($user): bool {
        return $job->userId === (int) $user->id;
    });
});

it('returns pending status and dispatches job when requesting asignaturas status from idle state', function (): void {
    Queue::fake();

    $user = User::factory()->create([
        'moodle_username' => 'alumno',
    ]);

    $sessionService = Mockery::mock(MoodleEphemeralSessionService::class);
    $sessionService->shouldReceive('hasActiveSession')
        ->atLeast()
        ->once()
        ->andReturnTrue();

    app()->instance(MoodleEphemeralSessionService::class, $sessionService);

    $response = $this->actingAs($user)->get(route('asignaturas.status'));

    $response
        ->assertOk()
        ->assertJsonPath('status', 'pending');

    Queue::assertPushed(FetchAsignaturasJob::class, function (FetchAsignaturasJob $job) use ($user): bool {
        return $job->userId === (int) $user->id;
    });
});
