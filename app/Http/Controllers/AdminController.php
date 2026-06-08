<?php

namespace App\Http\Controllers;

use App\Models\ErrorReport;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function index(): Response
    {
        $stats = [
            'totalUsers' => User::count(),
            'usersWithMoodleConnected' => User::whereNotNull('moodle_username')->count(),
            'usersWithoutMoodleConnected' => User::whereNull('moodle_username')->count(),
            'usersWithTwoFactorEnabled' => User::whereNotNull('two_factor_confirmed_at')->count(),
            'usersWithBackgroundNotifications' => User::where('moodle_background_notifications', true)->count(),
            'newUsersLast7Days' => User::where('created_at', '>=', now()->subDays(7))->count(),
            'newUsersLast30Days' => User::where('created_at', '>=', now()->subDays(30))->count(),
        ];

        $users = User::query()
            ->select(['id', 'name', 'email', 'role', 'email_verified_at', 'created_at', 'moodle_username', 'two_factor_confirmed_at'])
            ->orderByDesc('created_at')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'email_verified_at' => $user->email_verified_at,
                'created_at' => $user->created_at,
                'moodle_connected' => $user->moodle_username !== null,
                'two_factor_enabled' => $user->two_factor_confirmed_at !== null,
            ]);

        $errorReports = ErrorReport::query()
            ->orderByDesc('created_at')
            ->paginate(15, ['*'], 'error_reports_page')
            ->withQueryString();

        return Inertia::render('admin/index', [
            'stats' => $stats,
            'users' => $users,
            'errorReports' => $errorReports,
        ]);
    }

    public function updateUserRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'in:admin,user'],
        ]);

        if ($request->user()->id === $user->id) {
            return back()->withErrors(['role' => 'No puedes cambiar tu propio rol.']);
        }

        $user->update(['role' => $validated['role']]);

        return back()->with('success', 'Rol actualizado correctamente.');
    }

    public function deleteUser(Request $request, User $user): RedirectResponse
    {
        if ($request->user()->id === $user->id) {
            return back()->withErrors(['delete' => 'No puedes eliminar tu propia cuenta.']);
        }

        $user->delete();

        return back()->with('success', 'Usuario eliminado correctamente.');
    }

    public function resolveErrorReport(ErrorReport $errorReport): RedirectResponse
    {
        $errorReport->update([
            'resolved_at' => $errorReport->resolved_at === null ? now() : null,
        ]);

        return back();
    }

    public function deleteErrorReport(ErrorReport $errorReport): RedirectResponse
    {
        $errorReport->delete();

        return back()->with('success', 'Reporte eliminado correctamente.');
    }
}
