<?php

namespace App\Services\Moodle;

use App\Models\User;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

class MoodleEphemeralSessionService
{
    private const CACHE_PREFIX = 'moodle:session:user:v1:';

    public function __construct(
        private readonly MoodleCasClient $client,
    ) {
    }

    public function hasActiveSession(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $payload = $this->getPayload((int) $user->id);
        if (! is_array($payload)) {
            return false;
        }

        $createdAt = (int) ($payload['created_at'] ?? 0);
        $maxLifetime = max(900, (int) config('services.moodle.session_absolute_ttl_seconds', 28800));

        if ($createdAt <= 0 || (time() - $createdAt) > $maxLifetime) {
            $this->clearForUser($user);

            return false;
        }

        return true;
    }

    public function storeForUser(User $user, string $username, MoodleSession $session): void
    {
        $now = time();

        $payload = [
            'username' => $username,
            'sesskey' => $session->sesskey,
            'userid' => $session->userid,
            'cookies' => $this->client->exportCookies($session),
            'created_at' => $now,
            'last_activity_at' => $now,
        ];

        $this->persistPayload($user->id, $payload);
    }

    public function reopenForUser(User $user): MoodleSession
    {
        $payload = $this->getPayload($user->id);

        if (! is_array($payload)) {
            throw new MoodleAuthenticationException('La cuenta Moodle no está conectada.');
        }

        $maxLifetime = max(900, (int) config('services.moodle.session_absolute_ttl_seconds', 28800));
        $createdAt = (int) ($payload['created_at'] ?? 0);

        if ($createdAt <= 0 || (time() - $createdAt) > $maxLifetime) {
            $this->clearForUser($user);

            throw new MoodleAuthenticationException('Tu sesión de Moodle ha caducado. Vuelve a conectar tu cuenta.');
        }

        $cookies = is_array($payload['cookies'] ?? null) ? $payload['cookies'] : [];
        $fallbackSesskey = is_string($payload['sesskey'] ?? null) ? (string) $payload['sesskey'] : null;
        $fallbackUserid = isset($payload['userid']) ? (int) $payload['userid'] : null;

        $session = $this->client->resume($cookies, $fallbackSesskey, $fallbackUserid);

        $payload['sesskey'] = $session->sesskey;
        $payload['userid'] = $session->userid;
        $payload['cookies'] = $this->client->exportCookies($session);
        $payload['last_activity_at'] = time();

        $this->persistPayload($user->id, $payload);

        return $session;
    }

    public function clearForUser(User $user): void
    {
        Cache::forget($this->cacheKey((int) $user->id));
    }

    public function usernameForUser(?User $user): ?string
    {
        if (! $user) {
            return null;
        }

        $payload = $this->getPayload((int) $user->id);
        $username = is_array($payload) && is_string($payload['username'] ?? null)
            ? trim((string) $payload['username'])
            : '';

        return $username !== '' ? $username : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function persistPayload(int $userId, array $payload): void
    {
        $ttl = max(300, (int) config('services.moodle.session_ttl_seconds', 1800));

        $serialized = json_encode($payload, JSON_THROW_ON_ERROR);
        $encrypted = Crypt::encryptString($serialized);

        Cache::put($this->cacheKey($userId), $encrypted, now()->addSeconds($ttl));
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getPayload(int $userId): ?array
    {
        $encrypted = Cache::get($this->cacheKey($userId));
        if (! is_string($encrypted) || trim($encrypted) === '') {
            return null;
        }

        try {
            $decoded = Crypt::decryptString($encrypted);
            $payload = json_decode($decoded, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            Cache::forget($this->cacheKey($userId));

            return null;
        }

        return is_array($payload) ? $payload : null;
    }

    private function cacheKey(int $userId): string
    {
        return self::CACHE_PREFIX.$userId;
    }
}
