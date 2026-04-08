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
        if (! Schema::hasColumn('users', 'moodle_password')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('moodle_password');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'moodle_password')) {
            return;
        }

        Schema::table('users', function (Blueprint $table): void {
            $table->text('moodle_password')->nullable()->after('password');
        });
    }
};
