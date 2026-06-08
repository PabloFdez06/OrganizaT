import { Link, router, usePage } from '@inertiajs/react';
import { Bell, Menu, X } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toMoodleMediaUrl } from '@/lib/moodle-media';

type AcademiaHeaderProps = {
    containerClassName: string;
    activePath:
        | '/dashboard'
        | '/asignaturas'
        | '/calificaciones'
        | '/tareas'
        | '/recursos';
    moodleConnected: boolean;
    profileAvatarUrl: string | null;
    studentName: string | null;
};

type HeaderNavItem = {
    label: string;
    href:
        | '/dashboard'
        | '/asignaturas'
        | '/calificaciones'
        | '/tareas'
        | '/recursos';
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const mobileMenuId = useId();
    const page = usePage<SharedProps>();
    const notifications = page.props.moodleNotifications;
    const unreadCount = Math.max(0, Number(notifications?.unreadCount ?? 0));
    const items = Array.isArray(notifications?.items)
        ? notifications.items
        : [];
    const displayName = (studentName ?? '').trim();
    const avatarFallback =
        displayName !== '' ? displayName.charAt(0).toUpperCase() : 'U';
    const avatarUrl = toMoodleMediaUrl(profileAvatarUrl);

    const markAllAsRead = () => {
        router.post(
            '/moodle-notifications/read-all',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    useEffect(() => {
        if (!mobileMenuOpen) {
            return;
        }

        const mediaQuery = window.matchMedia('(min-width: 64rem)');
        const handleDesktopViewport = (event: MediaQueryListEvent) => {
            if (event.matches) {
                setMobileMenuOpen(false);
            }
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleDesktopViewport);

            return () => {
                mediaQuery.removeEventListener('change', handleDesktopViewport);
            };
        }

        mediaQuery.addListener(handleDesktopViewport);

        return () => {
            mediaQuery.removeListener(handleDesktopViewport);
        };
    }, [mobileMenuOpen]);

    return (
        <>
            <header className="c-academia-header">
                <section
                    className={`c-academia-header__inner ${containerClassName}`}
                >
                    <section className="c-academia-header__left">
                        <Link
                            className="c-academia-header__brand"
                            href="/dashboard"
                        >
                            <strong className="c-academia-header__brand-text">
                                Organiza
                                <span className="c-academia-header__brand-accent">
                                    T
                                </span>
                            </strong>
                        </Link>

                        <button
                            className="c-academia-header__menu-toggle"
                            type="button"
                            aria-expanded={mobileMenuOpen}
                            aria-controls={mobileMenuId}
                            aria-label={
                                mobileMenuOpen
                                    ? 'Cerrar menu principal'
                                    : 'Abrir menu principal'
                            }
                            onClick={() =>
                                setMobileMenuOpen(
                                    (currentState) => !currentState,
                                )
                            }
                        >
                            {mobileMenuOpen ? (
                                <X size={18} />
                            ) : (
                                <Menu size={18} />
                            )}
                        </button>

                        <nav
                            className="c-academia-header__nav"
                            aria-label="Secciones principales"
                        >
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={[
                                        'c-academia-header__nav-link',
                                        item.href === activePath
                                            ? 'c-academia-header__nav-link--active'
                                            : '',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </section>

                    <section
                        className="c-academia-header__toolbar"
                        aria-label="Herramientas"
                    >
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="c-academia-header__icon-btn"
                                    type="button"
                                    aria-label="Notificaciones"
                                >
                                    <Bell size={16} />
                                    {unreadCount > 0 && (
                                        <span
                                            className="c-academia-header__badge"
                                            aria-label={`${unreadCount} notificaciones pendientes`}
                                        >
                                            {unreadCount > 9
                                                ? '9+'
                                                : unreadCount}
                                        </span>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="c-academia-header__notifications-panel"
                            >
                                <section className="c-academia-header__notifications-head">
                                    <h3 className="c-academia-header__notifications-title">
                                        Notificaciones
                                    </h3>
                                    <p className="c-academia-header__notifications-state">
                                        {unreadCount > 0
                                            ? `${unreadCount} Nuevas`
                                            : 'Sin nuevas'}
                                    </p>
                                </section>

                                {items.length > 0 ? (
                                    <ul
                                        className="c-academia-header__notifications-list"
                                        aria-label="Listado de notificaciones"
                                    >
                                        {items.map((notification) => (
                                            <li key={notification.id}>
                                                <a
                                                    className={[
                                                        'c-academia-header__notification',
                                                        `c-academia-header__notification--${notification.level}`,
                                                        notification.isRead
                                                            ? 'c-academia-header__notification--read'
                                                            : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    href={
                                                        notification.url &&
                                                        notification.url !== ''
                                                            ? notification.url
                                                            : '/tareas'
                                                    }
                                                    target={
                                                        notification.url?.startsWith(
                                                            'http',
                                                        )
                                                            ? '_blank'
                                                            : undefined
                                                    }
                                                    rel={
                                                        notification.url?.startsWith(
                                                            'http',
                                                        )
                                                            ? 'noreferrer'
                                                            : undefined
                                                    }
                                                >
                                                    <span
                                                        className="c-academia-header__notification-dot"
                                                        aria-hidden="true"
                                                    />
                                                    <section className="c-academia-header__notification-copy">
                                                        <small className="c-academia-header__notification-category">
                                                            {
                                                                notification.category
                                                            }
                                                        </small>
                                                        <h4 className="c-academia-header__notification-title">
                                                            {notification.title}
                                                        </h4>
                                                        <p className="c-academia-header__notification-message">
                                                            {
                                                                notification.message
                                                            }
                                                        </p>
                                                        <section className="c-academia-header__notification-meta-row">
                                                            <small className="c-academia-header__notification-meta">
                                                                {notification.meta !==
                                                                ''
                                                                    ? notification.meta
                                                                    : notification.course}
                                                            </small>
                                                        </section>
                                                    </section>
                                                    <time className="c-academia-header__notification-time">
                                                        {notification.dueLabel}
                                                    </time>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <section className="c-academia-header__notifications-empty">
                                        <p className="c-academia-header__notifications-empty-text">
                                            No hay alertas activas por ahora.
                                        </p>
                                    </section>
                                )}

                                <footer className="c-academia-header__notifications-footer">
                                    <button
                                        className="c-academia-header__notifications-action"
                                        type="button"
                                        onClick={markAllAsRead}
                                    >
                                        Marcar todas como leídas
                                    </button>
                                </footer>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <span
                            className="c-academia-header__toolbar-divider"
                            aria-hidden="true"
                        />
                        {displayName !== '' && (
                            <span className="c-academia-header__student">
                                {displayName}
                            </span>
                        )}
                        <Link
                            className="c-academia-header__avatar"
                            href="/settings/security"
                            aria-label="Abrir configuracion"
                        >
                            {avatarUrl ? (
                                <img
                                    className="c-academia-header__avatar-image"
                                    src={avatarUrl}
                                    alt="Avatar Moodle"
                                />
                            ) : (
                                <span className="c-academia-header__avatar-fallback">
                                    {avatarFallback}
                                </span>
                            )}
                        </Link>
                    </section>
                </section>

                {mobileMenuOpen && (
                    <nav
                        id={mobileMenuId}
                        className="c-academia-header__mobile-nav"
                        aria-label="Secciones principales en movil"
                    >
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={`mobile-${item.href}`}
                                href={item.href}
                                className={[
                                    'c-academia-header__mobile-nav-link',
                                    item.href === activePath
                                        ? 'c-academia-header__mobile-nav-link--active'
                                        : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </header>

            {!moodleConnected && (
                <section
                    className="c-academia-header__moodle-warning"
                    role="alert"
                    aria-live="assertive"
                >
                    <p className="c-academia-header__moodle-warning-text">
                        Tu sesión de Moodle no está activa. Inicia sesión para
                        cargar tus datos académicos.
                    </p>
                    <Link
                        className="c-academia-header__moodle-warning-link"
                        href="/settings/security#usuario"
                    >
                        Iniciar sesión ahora
                    </Link>
                </section>
            )}
        </>
    );
}
