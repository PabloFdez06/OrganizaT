<?php

use App\Models\User;
use App\Services\Moodle\MoodleUserAcademicCache;

it('downloads a valid ics file for authenticated users with moodle connected', function (): void {
    $this->mock(MoodleUserAcademicCache::class, function ($mock): void {
        $mock->shouldReceive('getForUser')
            ->once()
            ->andReturn([
                'tasks' => [
                    [
                        'nombre' => 'Entrega practica 1',
                        'asignatura_nombre' => 'Matematicas',
                        'asignatura_id' => 100,
                        'fecha_iso' => '2026-04-12',
                        'fecha_entrega' => '12 abril 2026',
                        'pendiente' => true,
                        'entregada' => false,
                        'calificada' => false,
                        'dias_restantes' => 5,
                        'url' => 'https://moodle.example.test/task/1',
                    ],
                ],
            ]);
    });

    $user = User::factory()->create([
        'moodle_username' => 'alumno',
        'moodle_password' => 'secret-pass',
    ]);

    $response = $this->actingAs($user)->get(route('tareas.export_all_ics'));

    $response->assertOk();
    expect((string) $response->headers->get('content-type'))->toContain('text/calendar');
    expect((string) $response->headers->get('content-disposition'))->toContain('.ics');
    expect((string) $response->getContent())->toContain('BEGIN:VCALENDAR');
    expect((string) $response->getContent())->toContain('BEGIN:VEVENT');
});

it('returns forbidden when authenticated user has no moodle connection', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('tareas.export_all_ics'));

    $response->assertForbidden();
});

it('redirects guests to login for the export endpoint', function (): void {
    $response = $this->get(route('tareas.export_all_ics'));

    $response->assertRedirect(route('login'));
});

it('omits tasks without valid date when generating the calendar', function (): void {
    $this->mock(MoodleUserAcademicCache::class, function ($mock): void {
        $mock->shouldReceive('getForUser')
            ->once()
            ->andReturn([
                'tasks' => [
                    [
                        'nombre' => 'Tarea sin fecha',
                        'asignatura_nombre' => 'Historia',
                        'pendiente' => true,
                    ],
                    [
                        'nombre' => 'Tarea con fecha',
                        'asignatura_nombre' => 'Historia',
                        'fecha_iso' => '2026-05-02',
                        'fecha_entrega' => '2 mayo 2026',
                        'pendiente' => true,
                    ],
                ],
            ]);
    });

    $user = User::factory()->create([
        'moodle_username' => 'alumno',
        'moodle_password' => 'secret-pass',
    ]);

    $response = $this->actingAs($user)->get(route('tareas.export_all_ics'));

    $response->assertOk();
    $content = (string) $response->getContent();

    expect($content)->toContain('BEGIN:VCALENDAR');
    expect($content)->toContain('SUMMARY:Tarea con fecha - Historia');
    expect($content)->not->toContain('SUMMARY:Tarea sin fecha - Historia');
});
