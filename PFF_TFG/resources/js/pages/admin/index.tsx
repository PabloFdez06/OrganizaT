import { Head, router, usePage } from '@inertiajs/react';
import { ShieldCheck, Users, Wifi, WifiOff, Shield, Bell, UserPlus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { role as adminUsersRole, deleteMethod as adminUsersDelete } from '@/routes/admin/users';
import { resolve as adminErrorReportsResolve, deleteMethod as adminErrorReportsDelete } from '@/routes/admin/error_reports';
import type { BreadcrumbItem, User } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type AdminUser = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    email_verified_at: string | null;
    created_at: string;
    moodle_connected: boolean;
    two_factor_enabled: boolean;
};

type ErrorReport = {
    id: number;
    url: string;
    user_agent: string | null;
    resolved_at: string | null;
    created_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedData<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: PaginationLink[];
};

type AdminStats = {
    totalUsers: number;
    usersWithMoodleConnected: number;
    usersWithoutMoodleConnected: number;
    usersWithTwoFactorEnabled: number;
    usersWithBackgroundNotifications: number;
    newUsersLast7Days: number;
    newUsersLast30Days: number;
};

type AdminPageProps = {
    stats: AdminStats;
    users: PaginatedData<AdminUser>;
    errorReports: PaginatedData<ErrorReport>;
};

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de administración', href: '/admin' },
];

// ─── Stat cards config ────────────────────────────────────────────────────────

const statCards = (stats: AdminStats) => [
    { label: 'Usuarios totales', value: stats.totalUsers, icon: Users },
    { label: 'Con Moodle conectado', value: stats.usersWithMoodleConnected, icon: Wifi },
    { label: 'Sin Moodle conectado', value: stats.usersWithoutMoodleConnected, icon: WifiOff },
    { label: 'Con 2FA activo', value: stats.usersWithTwoFactorEnabled, icon: Shield },
    { label: 'Notificaciones en background', value: stats.usersWithBackgroundNotifications, icon: Bell },
    { label: 'Nuevos (7 días)', value: stats.newUsersLast7Days, icon: UserPlus },
    { label: 'Nuevos (30 días)', value: stats.newUsersLast30Days, icon: UserPlus },
];

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteConfirmDialog({
    title,
    description,
    onConfirm,
    disabled = false,
}: {
    title: string;
    description: string;
    onConfirm: () => void;
    disabled?: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={disabled}>
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            setOpen(false);
                            onConfirm();
                        }}
                    >
                        Eliminar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ links }: { links: PaginationLink[] }) {
    const filtered = links.filter((l) => l.url !== null || l.active);

    if (filtered.length <= 1) return null;

    return (
        <nav className="flex flex-wrap gap-1 pt-2" aria-label="Paginación">
            {links.map((link, i) => (
                <button
                    key={i}
                    className={[
                        'rounded border px-2.5 py-1 text-xs',
                        link.active ? 'bg-foreground text-background' : 'bg-background text-foreground',
                        !link.url ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    disabled={!link.url}
                    onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </nav>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminIndex({ stats, users, errorReports }: AdminPageProps) {
    const { auth } = usePage().props;
    const currentUserId = (auth.user as User).id;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Panel de administración" />

            <main className="space-y-8 p-4">
                {/* ── Page heading with amber accent ── */}
                <header className="flex items-center gap-3 border-l-4 border-amber-500 pl-4">
                    <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                            Administración
                        </p>
                        <h1 className="text-2xl font-bold">Panel de administración</h1>
                    </div>
                </header>

                {/* ── Section 1: Statistics ── */}
                <section aria-labelledby="stats-title">
                    <h2 id="stats-title" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Estadísticas
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {statCards(stats).map(({ label, value, icon: Icon }) => (
                            <Card key={label}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium">{label}</CardTitle>
                                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                </CardHeader>
                                <CardContent>
                                    <p className="text-2xl font-bold">{value}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* ── Section 2: User management ── */}
                <section aria-labelledby="users-title">
                    <h2 id="users-title" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Gestión de usuarios
                    </h2>
                    <Card>
                        <CardContent className="overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="border-b">
                                    <tr className="text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Email</th>
                                        <th className="px-4 py-3">Rol</th>
                                        <th className="px-4 py-3">Moodle</th>
                                        <th className="px-4 py-3">2FA</th>
                                        <th className="px-4 py-3">Registrado</th>
                                        <th className="px-4 py-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.data.map((user) => {
                                        const isSelf = user.id === currentUserId;

                                        return (
                                            <tr key={user.id} className="align-middle">
                                                <td className="px-4 py-3 font-medium">{user.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                                                <td className="px-4 py-3">
                                                    <Select
                                                        defaultValue={user.role}
                                                        disabled={isSelf}
                                                        onValueChange={(value) => {
                                                            router.patch(
                                                                adminUsersRole(user.id).url,
                                                                { role: value },
                                                                { preserveScroll: true },
                                                            );
                                                        }}
                                                    >
                                                        <SelectTrigger size="sm" className="w-24">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="user">user</SelectItem>
                                                            <SelectItem value="admin">admin</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {user.moodle_connected ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Conectado" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-muted-foreground" aria-label="No conectado" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {user.two_factor_enabled ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Activo" />
                                                    ) : (
                                                        <XCircle className="h-4 w-4 text-muted-foreground" aria-label="Inactivo" />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {new Date(user.created_at).toLocaleDateString('es-ES')}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <DeleteConfirmDialog
                                                        title="Eliminar usuario"
                                                        description={`¿Estás seguro de que quieres eliminar a ${user.name}? Esta acción no se puede deshacer.`}
                                                        disabled={isSelf}
                                                        onConfirm={() => {
                                                            router.delete(
                                                                adminUsersDelete(user.id).url,
                                                                { preserveScroll: true },
                                                            );
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                    <Pagination links={users.links} />
                </section>

                {/* ── Section 3: Error reports ── */}
                <section aria-labelledby="errors-title">
                    <h2 id="errors-title" className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        Reportes de error
                    </h2>
                    <Card>
                        <CardContent className="overflow-x-auto p-0">
                            <table className="w-full text-sm">
                                <thead className="border-b">
                                    <tr className="text-left text-xs text-muted-foreground">
                                        <th className="px-4 py-3">URL</th>
                                        <th className="px-4 py-3">User Agent</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Fecha</th>
                                        <th className="px-4 py-3">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {errorReports.data.map((report) => (
                                        <tr key={report.id} className="align-middle">
                                            <td className="max-w-xs truncate px-4 py-3 font-mono text-xs">
                                                {report.url}
                                            </td>
                                            <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                                                {report.user_agent ?? '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                {report.resolved_at ? (
                                                    <Badge variant="default" className="bg-green-600 text-white dark:bg-green-700">
                                                        Resuelto
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive">Pendiente</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(report.created_at).toLocaleDateString('es-ES')}
                                            </td>
                                            <td className="flex items-center gap-2 px-4 py-3">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        router.patch(
                                                            adminErrorReportsResolve(report.id).url,
                                                            {},
                                                            { preserveScroll: true },
                                                        );
                                                    }}
                                                >
                                                    {report.resolved_at ? 'Reabrir' : 'Marcar resuelto'}
                                                </Button>
                                                <DeleteConfirmDialog
                                                    title="Eliminar reporte"
                                                    description="¿Estás seguro de que quieres eliminar este reporte de error? Esta acción no se puede deshacer."
                                                    onConfirm={() => {
                                                        router.delete(
                                                            adminErrorReportsDelete(report.id).url,
                                                            { preserveScroll: true },
                                                        );
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {errorReports.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                                No hay reportes de error registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                    <Pagination links={errorReports.links} />
                </section>
            </main>
        </AppLayout>
    );
}
