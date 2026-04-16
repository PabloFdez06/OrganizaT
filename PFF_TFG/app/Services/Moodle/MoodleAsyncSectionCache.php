<?php

namespace App\Services\Moodle;

use Illuminate\Support\Facades\Cache;

class MoodleAsyncSectionCache
{
    private const CACHE_PREFIX = 'moodle:async:section:v1:';

    /**
     * @return array{status:string,data:mixed,error:?string,updated_at:?int}
     */
    public function getState(string $section, int $userId, string $scope = 'default'): array
    {
        $cached = Cache::get($this->cacheKey($section, $userId, $scope));

        if (! is_array($cached)) {
            return [
                'status' => 'idle',
                'data' => null,
                'error' => null,
                'updated_at' => null,
            ];
        }

        $status = is_string($cached['status'] ?? null)
            ? (string) $cached['status']
            : 'idle';

        if (! in_array($status, ['pending', 'done', 'error'], true)) {
            $status = 'idle';
        }

        return [
            'status' => $status,
            'data' => $cached['data'] ?? null,
            'error' => is_string($cached['error'] ?? null) ? (string) $cached['error'] : null,
            'updated_at' => isset($cached['updated_at']) ? (int) $cached['updated_at'] : null,
        ];
    }

    public function markPending(string $section, int $userId, string $scope = 'default'): void
    {
        Cache::put(
            $this->cacheKey($section, $userId, $scope),
            [
                'status' => 'pending',
                'data' => null,
                'error' => null,
                'updated_at' => time(),
            ],
            now()->addSeconds($this->ttlSeconds()),
        );
    }

    public function markDone(string $section, int $userId, mixed $data, string $scope = 'default'): void
    {
        Cache::put(
            $this->cacheKey($section, $userId, $scope),
            [
                'status' => 'done',
                'data' => $data,
                'error' => null,
                'updated_at' => time(),
            ],
            now()->addSeconds($this->ttlSeconds()),
        );
    }

    public function markError(string $section, int $userId, string $error, string $scope = 'default'): void
    {
        Cache::put(
            $this->cacheKey($section, $userId, $scope),
            [
                'status' => 'error',
                'data' => null,
                'error' => $error,
                'updated_at' => time(),
            ],
            now()->addSeconds($this->ttlSeconds()),
        );
    }

    public function clear(string $section, int $userId, string $scope = 'default'): void
    {
        Cache::forget($this->cacheKey($section, $userId, $scope));
    }

    private function cacheKey(string $section, int $userId, string $scope): string
    {
        return self::CACHE_PREFIX.$section.':'.$userId.':'.$scope;
    }

    private function ttlSeconds(): int
    {
        return max(300, (int) config('services.moodle.async_section_ttl_seconds', 1800));
    }
}
