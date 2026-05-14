<?php

use App\Http\Controllers\AsignaturasController;
use App\Http\Controllers\CalificacionesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ErrorReportController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\Moodle\MoodleConnectionController;
use App\Http\Controllers\Moodle\MoodleConsoleController;
use App\Http\Controllers\Moodle\MoodleDataController;
use App\Http\Controllers\Moodle\MoodleMediaController;
use App\Http\Controllers\Moodle\MoodleNotificationsController;
use App\Http\Controllers\Moodle\MoodlePreferencesController;
use App\Http\Controllers\RecursosController;
use App\Http\Controllers\TareasController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

Route::get('/', function (): Response|RedirectResponse {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('welcome');
})->name('home');

Route::post('errors/not-found/report', [ErrorReportController::class, 'store'])
    ->middleware('throttle:6,1')
    ->name('errors.not-found.report');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('dashboard/status', [DashboardController::class, 'status'])->name('dashboard.status');
    Route::post('dashboard/matrix', [DashboardController::class, 'updateMatrix'])->name('dashboard.matrix.update');
    Route::get('panel', [DashboardController::class, 'index'])->name('panel');
    Route::get('asignaturas', [AsignaturasController::class, 'index'])->name('asignaturas.index');
    Route::get('asignaturas/status', [AsignaturasController::class, 'status'])->name('asignaturas.status');
    Route::get('calificaciones', [CalificacionesController::class, 'index'])->name('calificaciones.index');
    Route::get('calificaciones/status', [CalificacionesController::class, 'status'])->name('calificaciones.status');
    Route::get('calificaciones/report', [CalificacionesController::class, 'downloadReport'])->name('calificaciones.report');
    Route::get('tareas', [TareasController::class, 'index'])->name('tareas.index');
    Route::get('tareas/status', [TareasController::class, 'status'])->name('tareas.status');
    Route::get('recursos', [RecursosController::class, 'index'])->name('recursos.index');
    Route::get('recursos/status', [RecursosController::class, 'status'])->name('recursos.status');
    Route::get('tareas/export-all.ics', [TareasController::class, 'exportAllIcs'])->name('tareas.export_all_ics');
    Route::post('moodle-notifications/read-all', [MoodleNotificationsController::class, 'markAllAsRead'])->name('moodle.notifications.read_all');
    Route::get('moodle/media', [MoodleMediaController::class, 'show'])->name('moodle.media');
    Route::get('moodle/redirect', [MoodleMediaController::class, 'redirect'])->name('moodle.redirect');

    Route::post('moodle-connect', [MoodleConnectionController::class, 'connect'])->name('moodle.connect');
    Route::post('moodle/preferences/background-notifications', [MoodlePreferencesController::class, 'updateBackgroundNotifications'])
        ->name('moodle.preferences.background_notifications.update');

    Route::prefix('api')->group(function (): void {
        Route::get('asignaturas', [MoodleDataController::class, 'asignaturas'])->name('moodle.asignaturas');
        Route::get('tareas/{courseId}', [MoodleDataController::class, 'tareas'])->name('moodle.tareas');
        Route::get('all-tareas', [MoodleDataController::class, 'allTareas'])->name('moodle.all_tareas');
        Route::get('calificaciones', [MoodleDataController::class, 'calificaciones'])->name('moodle.calificaciones');
        Route::get('recursos/{courseId}', [MoodleDataController::class, 'recursos'])->name('moodle.recursos');
        Route::get('all-recursos', [MoodleDataController::class, 'allRecursos'])->name('moodle.all_recursos');

        Route::get('configuracion', [MoodlePreferencesController::class, 'show'])->name('moodle.configuracion.show');
        Route::post('configuracion', [MoodlePreferencesController::class, 'update'])->name('moodle.configuracion.update');
    });
});

Route::middleware(['auth', 'verified', 'role.admin'])->group(function (): void {
    Route::get('moodle-console', [MoodleConsoleController::class, 'index'])->name('moodle.console');
    Route::post('moodle-console/preferences', [MoodleConsoleController::class, 'updatePreferences'])->name('moodle.console.preferences.update');
    Route::post('moodle-debug', [MoodleConnectionController::class, 'debug'])->name('moodle.debug');

    Route::get('admin', [AdminController::class, 'index'])->name('admin.index');
    Route::patch('admin/users/{user}/role', [AdminController::class, 'updateUserRole'])->name('admin.users.role');
    Route::delete('admin/users/{user}', [AdminController::class, 'deleteUser'])->name('admin.users.delete');
    Route::patch('admin/error-reports/{errorReport}/resolve', [AdminController::class, 'resolveErrorReport'])->name('admin.error_reports.resolve');
    Route::delete('admin/error-reports/{errorReport}', [AdminController::class, 'deleteErrorReport'])->name('admin.error_reports.delete');
});

require __DIR__.'/settings.php';
