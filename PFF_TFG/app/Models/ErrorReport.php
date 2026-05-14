<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class ErrorReport extends Model
{
    protected $fillable = [
        'url',
        'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function isResolved(): bool
    {
        return $this->resolved_at !== null;
    }

    public function scopeUnresolved(Builder $query): Builder
    {
        return $query->whereNull('resolved_at');
    }
}
