<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\SecurityScheme;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        $this->configureScramble();
    }

    /**
     * Configura Scramble (OpenAPI/Swagger) con esquema de seguridad de sesión.
     *
     * La documentación se sirve públicamente en /docs/api (UI) y /docs/api.json.
     * Solo se documentan rutas bajo /api/* que devuelven JSON.
     * Los endpoints siguen protegidos por middleware auth + verified en runtime.
     */
    private function configureScramble(): void
    {
        Scramble::configure()
            ->withDocumentTransformers(function (OpenApi $openApi): void {
                // Esquema de autenticación: cookie de sesión Laravel.
                // La API usa autenticación basada en sesión (Fortify + cookie laravel_session).
                // Las peticiones deben incluir la cookie de sesión y el header X-XSRF-TOKEN.
                $openApi->secure(
                    SecurityScheme::apiKey('cookie', 'laravel_session'),
                );
            });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
