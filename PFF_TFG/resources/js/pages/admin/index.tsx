import { Head, router, usePage } from '@inertiajs/react';
import { ShieldCheck, Users, Wifi, WifiOff, Shield, Bell, UserPlus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { role as adminUsersRole, deleteMethod as adminUsersDelete } from '@/routes/admin/users';
import { resolve as adminErrorReportsResolve, deleteMethod as adminErrorReportsDelete } from '@/routes/admin/error_reports';
import type { User } from '@/types';

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
                <Button variant="destructive" size="icon" className="p-admin__delete-btn" disabled={disabled}>
                    <Trash2 />
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
        <nav className="p-admin__pagination" aria-label="Paginación">
            {links.map((link, i) => (
                <button
                    key={i}
                    className={[
                        'p-admin__pagination-btn',
                        link.active ? 'p-admin__pagination-btn--active' : '',
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
        <>
            <Head title="Panel de administración" />

            <main className="p-admin">
                {/* ── Page header (estilo settings, sin botón de cierre) ── */}
                <header className="p-admin__page-header">
                    <div className="p-admin__page-header-icon" aria-hidden="true">
                        <ShieldCheck size={16} />
                    </div>
                    <h1 className="p-admin__page-header-title">Panel de administración</h1>
                </header>

                <div className="p-admin__body">
                {/* ── Section 1: Statistics ── */}
                <section aria-labelledby="stats-title">
                    <div className="p-admin__section-label">
                        <span id="stats-title" className="p-admin__section-label-text">Estadísticas</span>
                        <span className="p-admin__section-label-line" aria-hidden="true" />
                    </div>
                    <div className="p-admin__stats-grid">
                        {statCards(stats).map(({ label, value, icon: Icon }) => (
                            <div key={label} className="p-admin__stat">
                                <div className="p-admin__stat-top">
                                    <span className="p-admin__stat-label">{label}</span>
                                    <Icon className="p-admin__stat-icon" aria-hidden="true" />
                                </div>
                                <span className="p-admin__stat-value">{value}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Section 2: User management ── */}
                <section aria-labelledby="users-title">
                    <div className="p-admin__section-label">
                        <h2 id="users-title" className="p-admin__section-label-text">Gestión de usuarios</h2>
                        <span className="p-admin__section-label-line" aria-hidden="true" />
                    </div>
                    <div className="p-admin__table-card">
                        <div className="p-admin__table-wrapper">
                            <table className="p-admin__table">
                                <thead>
                                    <tr>
                                        <th>Nombre</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Moodle</th>
                                        <th>2FA</th>
                                        <th>Registrado</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.data.map((user) => {
                                        const isSelf = user.id === currentUserId;

                                        return (
                                            <tr key={user.id}>
                                                <td className="p-admin__table-cell--name">{user.name}</td>
                                                <td className="p-admin__table-cell--muted">{user.email}</td>
                                                <td>
                                                    <select
                                                        className="p-admin__role-select"
                                                        defaultValue={user.role}
                                                        disabled={isSelf}
                                                        aria-label={`Rol de ${user.name}`}
                                                        onChange={(e) => {
                                                            router.patch(
                                                                adminUsersRole(user.id).url,
                                                                { role: e.target.value },
                                                                { preserveScroll: true },
                                                            );
                                                        }}
                                                    >
                                                        <option value="user">user</option>
                                                        <option value="admin">admin</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    {user.moodle_connected ? (
                                                        <CheckCircle2 className="p-admin__status-icon p-admin__status-icon--ok" aria-label="Conectado" />
                                                    ) : (
                                                        <XCircle className="p-admin__status-icon p-admin__status-icon--off" aria-label="No conectado" />
                                                    )}
                                                </td>
                                                <td>
                                                    {user.two_factor_enabled ? (
                                                        <CheckCircle2 className="p-admin__status-icon p-admin__status-icon--ok" aria-label="Activo" />
                                                    ) : (
                                                        <XCircle className="p-admin__status-icon p-admin__status-icon--off" aria-label="Inactivo" />
                                                    )}
                                                </td>
                                                <td className="p-admin__table-cell--muted">
                                                    {new Date(user.created_at).toLocaleDateString('es-ES')}
                                                </td>
                                                <td>
                                                    <div className="p-admin__table-actions">
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
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <Pagination links={users.links} />
                </section>

                {/* ── Section 3: Error reports ── */}
                <section aria-labelledby="errors-title">
                    <div className="p-admin__section-label">
                        <h2 id="errors-title" className="p-admin__section-label-text">Reportes de error</h2>
                        <span className="p-admin__section-label-line" aria-hidden="true" />
                    </div>
                    <div className="p-admin__table-card">
                        <div className="p-admin__table-wrapper">
                            <table className="p-admin__table">
                                <thead>
                                    <tr>
                                        <th>URL</th>
                                        <th>User Agent</th>
                                        <th>Estado</th>
                                        <th>Fecha</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {errorReports.data.map((report) => (
                                        <tr key={report.id}>
                                            <td className="p-admin__table-cell--mono">{report.url}</td>
                                            <td className="p-admin__table-cell--truncate">
                                                {report.user_agent ?? '—'}
                                            </td>
                                            <td>
                                                {report.resolved_at ? (
                                                    <span className="p-admin__badge p-admin__badge--resolved">
                                                        Resuelto
                                                    </span>
                                                ) : (
                                                    <span className="p-admin__badge p-admin__badge--pending">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-admin__table-cell--muted">
                                                {new Date(report.created_at).toLocaleDateString('es-ES')}
                                            </td>
                                            <td>
                                                <div className="p-admin__table-actions">
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
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {errorReports.data.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-admin__table-cell--empty">
                                                No hay reportes de error registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <Pagination links={errorReports.links} />
                </section>
                </div>
            </main>
        </>
    );
}
