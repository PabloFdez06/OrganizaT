<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->text('moodle_session_data')->nullable()->after('dashboard_quick_subject_ids');
            $table->timestamp('moodle_session_expires_at')->nullable()->after('moodle_session_data');
            $table->boolean('moodle_background_notifications')->default(false)->after('moodle_session_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'moodle_session_data',
                'moodle_session_expires_at',
                'moodle_background_notifications',
            ]);
        });
    }
};
