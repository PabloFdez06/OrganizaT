<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'moodle_username',
        'moodle_notification_preferences',
        'dashboard_quick_subject_ids',
        'moodle_session_data',
        'moodle_session_expires_at',
        'moodle_background_notifications',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'moodle_notification_preferences' => 'array',
            'dashboard_quick_subject_ids' => 'array',
            'moodle_session_expires_at' => 'datetime',
            'moodle_background_notifications' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function hasMoodleBackgroundSession(): bool
    {
        return is_string($this->moodle_session_data)
            && trim($this->moodle_session_data) !== ''
            && $this->moodle_session_expires_at !== null
            && $this->moodle_session_expires_at->isFuture();
    }
}
