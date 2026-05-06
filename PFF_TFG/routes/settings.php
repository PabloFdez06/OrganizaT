<?php

use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/security');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');
    Route::redirect('settings/configuracion', '/settings/security');
    Route::post('settings/security/preferences', [SecurityController::class, 'updatePreferences'])->name('security.preferences.update');
    Route::post('settings/security/preferences/test-email', [SecurityController::class, 'sendTestEmail'])->name('security.preferences.test-email');
    Route::post('settings/security/quick-subjects', [SecurityController::class, 'updateQuickSubjects'])->name('security.quick-subjects.update');
    Route::post('settings/security/moodle/disconnect', [SecurityController::class, 'disconnectMoodle'])->name('security.moodle.disconnect');
    Route::delete('settings/security/account', [SecurityController::class, 'destroyAccount'])->name('security.account.destroy');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    // 2FA management – require recent password confirmation
    Route::middleware('password.confirm')->group(function () {
        Route::post('settings/security/two-factor/enable', [SecurityController::class, 'enable'])->name('security.two-factor.enable');
        Route::delete('settings/security/two-factor/disable', [SecurityController::class, 'disable'])->name('security.two-factor.disable');
        Route::post('settings/security/two-factor/recovery-codes', [SecurityController::class, 'recoveryCodes'])->name('security.two-factor.recovery-codes');
    });
});
