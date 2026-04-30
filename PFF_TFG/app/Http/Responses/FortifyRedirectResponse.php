<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

class FortifyRedirectResponse implements LoginResponseContract, LogoutResponseContract, RegisterResponseContract
{
    public function toResponse($request)
    {
        if ($request->routeIs('logout')) {
            return Inertia::location(route('home'));
        }

        $redirectTo = redirect()->intended(config('fortify.home'))->getTargetUrl();

        return Inertia::location($redirectTo);
    }
}
