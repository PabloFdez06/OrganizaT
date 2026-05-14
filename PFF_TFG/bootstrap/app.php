<?php

use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role.admin' => EnsureUserIsAdmin::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->respond(function ($response, Throwable $exception, Request $request) {
            $statusCode = $response->getStatusCode();

            if ($request->expectsJson() || $statusCode !== 404) {
                return $response;
            }

            $hostname = gethostname();
            $serverNode = is_string($hostname) && $hostname !== ''
                ? strtoupper($hostname)
                : 'ARCHIVE-CL-04';

            return Inertia::render('errors/not-found', [
                'status' => $statusCode,
                'timestamp' => now()->utc()->toIso8601String(),
                'serverNode' => $serverNode,
                'requestedUrl' => $request->fullUrl(),
            ])->toResponse($request)->setStatusCode($statusCode);
        });
    })->create();
