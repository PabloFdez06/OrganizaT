import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toMoodleMediaUrl } from '@/lib/moodle-media';

type AcademiaHeaderProps = {
    containerClassName: string;
    activePath: '/dashboard' | '/asignaturas' | '/calificaciones' | '/tareas' | '/recursos';
    moodleConnected: boolean;
    profileAvatarUrl: string | null;
    studentName: string | null;
};

type HeaderNavItem = {
    label: string;
    href: '/dashboard' | '/asignaturas' | '/calificaciones' | '/tareas' | '/recursos';
};

type HeaderNotification = {
    id: string;
    title: string;
    message: string;
    course: string;
    level: 'info' | 'warning' | 'critical';
    dueLabel: string;
    url: string;
    trigger: string;
    category: string;
    meta: string;
    isRead: boolean;
};

type SharedProps = {
    moodleNotifications?: {
        unreadCount: number;
        items: HeaderNotification[];
    };
};

const NAV_ITEMS: HeaderNavItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Asignaturas', href: '/asignaturas' },
    { label: 'Calificaciones', href: '/calificaciones' },
    { label: 'Tareas', href: '/tareas' },
    { label: 'Recursos', href: '/recursos' },
];

export default function AcademiaHeader({
    containerClassName,
    activePath,
    moodleConnected,
    profileAvatarUrl,
    studentName,
}: AcademiaHeaderProps) {
    const page = usePage<SharedProps>();
    const notifications = page.props.moodleNotifications;
    const unreadCount = Math.max(0, Number(notifications?.unreadCount ?? 0));
    const items = Array.isArray(notifications?.items) ? notifications.items : [];
    const displayName = (studentName ?? '').trim();
    const avatarFallback = displayName !== '' ? displayName.charAt(0).toUpperCase() : 'U';
    const avatarUrl = toMoodleMediaUrl(profileAvatarUrl);

    const markAllAsRead = () => {
        router.post('/moodle-notifications/read-all', {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <>
            <header className="c-academia-header">
                <section className={`c-academia-header__inner ${containerClassName}`}>
                    <section className="c-academia-header__left">
                        <Link className="c-academia-header__brand" href="/dashboard">
                            <strong>Organiza<span>T</span></strong>
                        </Link>

                        <nav className="c-academia-header__nav" aria-label="Secciones principales">
                            {NAV_ITEMS.map((item) => (
                                <Link key={item.href} href={item.href} className={item.href === activePath ? 'is-active' : ''}>
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </section>

                    <section className="c-academia-header__toolbar" aria-label="Herramientas">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="c-academia-header__icon-btn" type="button" aria-label="Notificaciones">
                                    <Bell size={16} />
                                    {unreadCount > 0 && (
                                        <span className="c-academia-header__badge" aria-label={`${unreadCount} notificaciones pendientes`}>
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="c-academia-header__notifications-panel">
                                <section className="c-academia-header__notifications-head">
                                    <h3>Notificaciones</h3>
                                    <p>{unreadCount > 0 ? `${unreadCount} Nuevas` : 'Sin nuevas'}</p>
                                </section>

                                {items.length > 0 ? (
                                    <ul className="c-academia-header__notifications-list" aria-label="Listado de notificaciones">
                                        {items.map((notification) => (
                                            <li key={notification.id}>
                                                <a
                                                    className={[
                                                        'c-academia-header__notification',
                                                        `is-${notification.level}`,
                                                        notification.isRead ? 'is-read' : '',
                                                    ].filter(Boolean).join(' ')}
                                                    href={notification.url && notification.url !== '' ? notification.url : '/tareas'}
                                                    target={notification.url?.startsWith('http') ? '_blank' : undefined}
                                                    rel={notification.url?.startsWith('http') ? 'noreferrer' : undefined}
                                                >
                                                    <span className="c-academia-header__notification-dot" aria-hidden="true" />
                                                    <section className="c-academia-header__notification-copy">
                                                        <small className="c-academia-header__notification-category">{notification.category}</small>
                                                        <h4>{notification.title}</h4>
                                                        <p>{notification.message}</p>
                                                        <section className="c-academia-header__notification-meta-row">
                                                            <small>{notification.meta !== '' ? notification.meta : notification.course}</small>
                                                        </section>
                                                    </section>
                                                    <time>{notification.dueLabel}</time>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <section className="c-academia-header__notifications-empty">
                                        <p>No hay alertas activas por ahora.</p>
                                    </section>
                                )}

                                <footer className="c-academia-header__notifications-footer">
                                    <button type="button" onClick={markAllAsRead}>
                                        Marcar todas como leídas
                                    </button>
                                </footer>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <span className="c-academia-header__toolbar-divider" aria-hidden="true" />
                        {displayName !== '' && <span className="c-academia-header__student">{displayName}</span>}
                        <Link className="c-academia-header__avatar" href="/settings/security" aria-label="Abrir configuracion">
                            {avatarUrl ? <img src={avatarUrl} alt="Avatar Moodle" /> : <span>{avatarFallback}</span>}
                        </Link>
                    </section>
                </section>
            </header>

            {!moodleConnected && (
                <section className="c-academia-header__moodle-warning" role="alert" aria-live="assertive">
                    <p>
                        Tu sesión de Moodle no está activa. Inicia sesión para cargar tus datos académicos.
                    </p>
                    <Link href="/settings/security#usuario">Iniciar sesión ahora</Link>
                </section>
            )}
        </>
    );
}
