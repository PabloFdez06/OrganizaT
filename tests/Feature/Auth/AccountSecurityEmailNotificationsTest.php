<?php

use App\Mail\TwoFactorActivatedMail;
use App\Mail\WelcomeAccountMail;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Mail;
use Laravel\Fortify\Events\TwoFactorAuthenticationConfirmed;

test('welcome email is queued when a new account is registered', function () {
    Mail::fake();

    $user = User::factory()->create();

    event(new Registered($user));

    Mail::assertQueued(WelcomeAccountMail::class, function (WelcomeAccountMail $mail) use ($user): bool {
        return $mail->hasTo($user->email);
    });
});

test('two factor activation email is queued when two factor authentication is confirmed', function () {
    Mail::fake();

    $user = User::factory()->create([
        'two_factor_confirmed_at' => now(),
    ]);

    event(new TwoFactorAuthenticationConfirmed($user));

    Mail::assertQueued(TwoFactorActivatedMail::class, function (TwoFactorActivatedMail $mail) use ($user): bool {
        return $mail->hasTo($user->email);
    });
});
