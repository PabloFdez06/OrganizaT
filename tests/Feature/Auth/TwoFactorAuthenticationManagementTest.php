<?php

use App\Models\User;
use Laravel\Fortify\Features;
use PragmaRX\Google2FA\Google2FA;

beforeEach(function () {
    $this->skipUnlessFortifyFeature(Features::twoFactorAuthentication());
});

test('enabling two factor authentication requires password confirmation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('two-factor.enable'))
        ->assertStatus(423)
        ->assertJson([
            'message' => 'Password confirmation required.',
        ]);
});

test('user can start two factor setup after password confirmation', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.enable'))
        ->assertOk();

    $user->refresh();

    expect($user->two_factor_secret)->not->toBeNull();
    expect($user->two_factor_recovery_codes)->not->toBeNull();
    expect($user->two_factor_confirmed_at)->toBeNull();
    expect($user->hasEnabledTwoFactorAuthentication())->toBeFalse();
});

test('user can fetch setup data after enabling two factor authentication', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.enable'))
        ->assertOk();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->getJson(route('two-factor.qr-code'))
        ->assertOk()
        ->assertJsonStructure(['svg', 'url']);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->getJson(route('two-factor.secret-key'))
        ->assertOk()
        ->assertJsonStructure(['secretKey']);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->getJson(route('two-factor.recovery-codes'))
        ->assertOk()
        ->assertJsonCount(8);
});

test('user can confirm two factor authentication with a valid totp code', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.enable'))
        ->assertOk();

    $secret = decrypt((string) $user->fresh()->two_factor_secret);
    $validCode = app(Google2FA::class)->getCurrentOtp($secret);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.confirm'), [
            'code' => $validCode,
        ])
        ->assertOk();

    $user->refresh();

    expect($user->two_factor_confirmed_at)->not->toBeNull();
    expect($user->hasEnabledTwoFactorAuthentication())->toBeTrue();
});

test('invalid confirmation code returns validation error', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.enable'))
        ->assertOk();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.confirm'), [
            'code' => '000000',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('code');

    expect($user->fresh()->two_factor_confirmed_at)->toBeNull();
});

test('user can regenerate recovery codes', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.enable'))
        ->assertOk();

    $beforeCodes = decrypt((string) $user->fresh()->two_factor_recovery_codes);

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.regenerate-recovery-codes'))
        ->assertOk();

    $afterCodes = decrypt((string) $user->fresh()->two_factor_recovery_codes);

    expect($beforeCodes)->not->toEqual($afterCodes);
});

test('user can disable two factor authentication', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->postJson(route('two-factor.enable'))
        ->assertOk();

    $this->actingAs($user)
        ->withSession(['auth.password_confirmed_at' => time()])
        ->deleteJson(route('two-factor.disable'))
        ->assertOk();

    $user->refresh();

    expect($user->two_factor_secret)->toBeNull();
    expect($user->two_factor_recovery_codes)->toBeNull();
    expect($user->two_factor_confirmed_at)->toBeNull();
    expect($user->hasEnabledTwoFactorAuthentication())->toBeFalse();
});

test('guest users can not access two factor management endpoints', function () {
    $this->postJson(route('two-factor.enable'))->assertUnauthorized();
    $this->postJson(route('two-factor.confirm'), ['code' => '000000'])->assertUnauthorized();
    $this->getJson(route('two-factor.qr-code'))->assertUnauthorized();
    $this->getJson(route('two-factor.secret-key'))->assertUnauthorized();
    $this->getJson(route('two-factor.recovery-codes'))->assertUnauthorized();
    $this->postJson(route('two-factor.regenerate-recovery-codes'))->assertUnauthorized();
    $this->deleteJson(route('two-factor.disable'))->assertUnauthorized();
});
