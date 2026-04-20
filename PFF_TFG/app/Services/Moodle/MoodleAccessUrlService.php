<?php

namespace App\Services\Moodle;

class MoodleAccessUrlService
{
    /**
     * @param  string|null  $url
     */
    public function toAccessibleUrl(?string $url, ?string $module = null): ?string
    {
        $absolute = $this->toAbsoluteUrl($url, $module);

        if (! is_string($absolute) || trim($absolute) === '') {
            return null;
        }

        if ($this->isAlreadyProxied($absolute)) {
            return $absolute;
        }

        if (! $this->isAllowedMoodleUrl($absolute)) {
            return $absolute;
        }

        return route('moodle.media', ['url' => $absolute]);
    }

    /**
     * @param  string|null  $url
     */
    public function toAbsoluteUrl(?string $url, ?string $module = null): ?string
    {
        if (! is_string($url)) {
            return null;
        }

        $trimmed = trim($url);

        if ($trimmed === '') {
            return null;
        }

        if ($this->isAlreadyProxied($trimmed)) {
            return $trimmed;
        }

        if (str_starts_with($trimmed, 'http://') || str_starts_with($trimmed, 'https://')) {
            return $trimmed;
        }

        $baseUrl = rtrim((string) config('services.moodle.base_url'), '/');

        if (str_starts_with($trimmed, '//')) {
            $baseScheme = (string) parse_url($baseUrl, PHP_URL_SCHEME);

            return ($baseScheme !== '' ? $baseScheme : 'https').':'.$trimmed;
        }

        if (str_starts_with($trimmed, '/')) {
            if (! $this->looksLikeMoodlePath($trimmed)) {
                return $trimmed;
            }

            return $baseUrl !== '' ? $baseUrl.$trimmed : $trimmed;
        }

        $safeModule = is_string($module) ? trim(mb_strtolower($module)) : '';

        if ($safeModule !== '' && preg_match('/^[a-z0-9_]+$/', $safeModule) === 1) {
            return $baseUrl !== '' ? $baseUrl.'/mod/'.$safeModule.'/'.$trimmed : '/mod/'.$safeModule.'/'.$trimmed;
        }

        if (! $this->looksLikeMoodlePath('/'.$trimmed)) {
            return $trimmed;
        }

        return $baseUrl !== '' ? $baseUrl.'/'.ltrim($trimmed, '/') : '/'.ltrim($trimmed, '/');
    }

    public function isAllowedMoodleUrl(string $url): bool
    {
        $targetHost = parse_url($url, PHP_URL_HOST);

        if (! is_string($targetHost) || trim($targetHost) === '') {
            return false;
        }

        $allowedHosts = $this->resolveAllowedMoodleHosts();

        if ($allowedHosts === []) {
            return false;
        }

        return in_array(mb_strtolower($targetHost), $allowedHosts, true);
    }

    private function looksLikeMoodlePath(string $path): bool
    {
        $normalized = mb_strtolower(trim($path));

        if ($normalized === '') {
            return false;
        }

        $prefixes = [
            '/mod/',
            '/course/',
            '/grade/',
            '/calendar/',
            '/message/',
            '/user/',
            '/lib/',
            '/theme/',
            '/login/',
            '/pluginfile.php',
            '/webservice/pluginfile.php',
        ];

        foreach ($prefixes as $prefix) {
            if (str_starts_with($normalized, $prefix)) {
                return true;
            }
        }

        return false;
    }

    private function isAlreadyProxied(string $url): bool
    {
        $normalized = trim($url);

        if ($normalized === '') {
            return false;
        }

        if (str_starts_with($normalized, '/moodle/media')) {
            return true;
        }

        if (! preg_match('/^https?:\/\//i', $normalized)) {
            return false;
        }

        $appUrl = rtrim((string) config('app.url'), '/');

        if ($appUrl === '') {
            return false;
        }

        return str_starts_with($normalized, $appUrl.'/moodle/media');
    }

    /**
     * @return array<int, string>
     */
    private function resolveAllowedMoodleHosts(): array
    {
        $hosts = [];

        $baseUrl = trim((string) config('services.moodle.base_url'));
        if ($baseUrl !== '') {
            $host = parse_url($baseUrl, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $hosts[] = mb_strtolower($host);
            }
        }

        $casBase = trim((string) config('services.moodle.cas_base'));
        if ($casBase !== '') {
            $host = parse_url($casBase, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $hosts[] = mb_strtolower($host);
            }
        }

        $casLogin = trim((string) config('services.moodle.cas_login_url'));
        if ($casLogin !== '') {
            $host = parse_url($casLogin, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $hosts[] = mb_strtolower($host);
            }
        }

        return array_values(array_unique($hosts));
    }
}
