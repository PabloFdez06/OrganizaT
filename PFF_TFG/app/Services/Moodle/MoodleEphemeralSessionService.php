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
    ) {}

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

        if ((bool) $user->moodle_background_notifications) {
            $this->persistSessionToDatabase($user, $session);
        }
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

    public function persistSessionToDatabase(User $user, MoodleSession $session): void
    {
        $payload = [
            'sesskey' => $session->sesskey,
            'userid' => $session->userid,
            'cookies' => $this->client->exportCookies($session),
            'persisted_at' => time(),
        ];

        $serialized = json_encode($payload, JSON_THROW_ON_ERROR);
        $encrypted = Crypt::encryptString($serialized);
        $expiresAt = now()->addHours(8);

        $user->forceFill([
            'moodle_session_data' => $encrypted,
            'moodle_session_expires_at' => $expiresAt,
        ])->save();
    }

    public function restoreSessionFromDatabase(User $user): ?MoodleSession
    {
        if (! (bool) $user->moodle_background_notifications || ! $user->hasMoodleBackgroundSession()) {
            return null;
        }

        $encrypted = is_string($user->moodle_session_data) ? trim($user->moodle_session_data) : '';

        if ($encrypted === '') {
            return null;
        }

        try {
            $decrypted = Crypt::decryptString($encrypted);
            $payload = json_decode($decrypted, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            $this->invalidateDatabaseSession($user);

            return null;
        }

        if (! is_array($payload)) {
            $this->invalidateDatabaseSession($user);

            return null;
        }

        $cookies = is_array($payload['cookies'] ?? null) ? $payload['cookies'] : [];
        $fallbackSesskey = is_string($payload['sesskey'] ?? null) ? (string) $payload['sesskey'] : null;
        $fallbackUserid = isset($payload['userid']) ? (int) $payload['userid'] : null;

        if ($cookies === [] && (! is_string($fallbackSesskey) || trim($fallbackSesskey) === '')) {
            $this->invalidateDatabaseSession($user);

            return null;
        }

        return $this->client->resume($cookies, $fallbackSesskey, $fallbackUserid);
    }

    public function invalidateDatabaseSession(User $user): void
    {
        $user->forceFill([
            'moodle_session_data' => null,
            'moodle_session_expires_at' => null,
        ])->save();
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
