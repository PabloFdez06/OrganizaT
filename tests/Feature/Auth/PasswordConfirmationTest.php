<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('confirm password screen can be rendered', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get(route('password.confirm'));

    $response->assertOk();

    $response->assertInertia(fn (Assert $page) => $page
        ->component('auth/confirm-password'),
    );
});

test('password confirmation requires authentication', function () {
    $response = $this->get(route('password.confirm'));

    $response->assertRedirect(route('login'));
});

test('confirmed password redirects to provided safe return path', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('password.confirm', ['return' => '/settings/security#peligro']))
        ->assertOk();

    $this->actingAs($user)
        ->post(route('password.confirm.store'), [
            'password' => 'password',
        ])
        ->assertRedirect('/settings/security#peligro');
});
