<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('moodle_notification_emails', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('notification_id', 64);
            $table->timestamp('sent_at')->useCurrent();
            $table->unique(['user_id', 'notification_id']);
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('moodle_notification_emails');
    }
};
