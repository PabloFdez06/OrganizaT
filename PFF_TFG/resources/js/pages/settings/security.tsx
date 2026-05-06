import { Form, Head, router, usePage } from '@inertiajs/react';
import { BellRing, CircleHelp, Mail, Monitor, Moon, Palette, Settings, ShieldAlert, Sun, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { connect } from '@/actions/App/Http/Controllers/Moodle/MoodleConnectionController';
import { updateBackgroundNotifications } from '@/actions/App/Http/Controllers/Moodle/MoodlePreferencesController';
import InputError from '@/components/input-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { useAppearance } from '@/hooks/use-appearance';
import type { Appearance } from '@/hooks/use-appearance';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { enable, disable } from '@/actions/App/Http/Controllers/Settings/SecurityController';

type UserProfile = {
    fullName: string | null;
    email: string | null;
    course: string | null;
    academicYear: string | null;
    avatarUrl: string | null;
};

type SyncStatus = {
    lastSyncLabel: string | null;
    message: string | null;
};

type Preferences = {
    '48h_antes': boolean;
    '24h_antes': boolean;
    mismo_dia: boolean;
    recordatorio_personalizado: boolean;
    recordatorio_personalizado_minutos: number;
    email: boolean;
    push: boolean;
    email_48h: boolean;
    email_24h: boolean;
    email_same_day: boolean;
    email_custom: boolean;
    email_overdue: boolean;
    email_new_task: boolean;
    email_deadline_changed: boolean;
    email_new_grade: boolean;
    email_new_feedback: boolean;
    email_moodle_message: boolean;
};

type CacheConfig = {
    asignaturasMinutes: number;
    tareasMinutes: number;
};

type QuickSubject = {
    id: number;
    title: string;
};

type QuickSubjects = {
    available: QuickSubject[];
    selected: number[];
    selectionLimit: number;
};

type Props = {
    moodleConnected: boolean;
    moodleBackgroundNotifications: boolean;
    profile: UserProfile;
    syncStatus: SyncStatus;
    preferences: Preferences;
    cacheConfig: CacheConfig;
    quickSubjects: QuickSubjects;
    canManageTwoFactor?: boolean;
    twoFactorEnabled?: boolean;
    requiresConfirmation?: boolean;
};

type PreferenceToggleProps = {
    id: string;
    label: string;
    description: string;
    checked: boolean;
    disabled?: boolean;
    icon?: 'mail' | 'push';
    onToggle: (value: boolean) => void;
};

type SettingsSection = 'usuario' | 'notificaciones' | 'apariencia' | 'peligro';

type SideNavItem = {
    key: SettingsSection;
    title: string;
    description: string;
    icon: typeof UserRound;
};

function PreferenceToggle({
    id,
    label,
    description,
    checked,
    disabled = false,
    icon,
    onToggle,
}: PreferenceToggleProps) {
    return (
        <article className="p-settings__toggle-row">
            <section className="p-settings__toggle-copy">
                <h4 className="p-settings__toggle-title">
                    {icon === 'mail' && <Mail size={14} aria-hidden="true" />}
                    {icon === 'push' && <BellRing size={14} aria-hidden="true" />}
                    <span className="p-settings__toggle-title-text">{label}</span>
                </h4>
                <p className="p-settings__toggle-description">{description}</p>
            </section>

            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                className={[
                    'p-settings__switch',
                    checked ? 'p-settings__switch--on' : '',
                    disabled ? 'p-settings__switch--disabled' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                onClick={() => {
                    if (!disabled) {
                        onToggle(!checked);
                    }
                }}
                disabled={disabled}
            >
                <span className="p-settings__switch-thumb" aria-hidden="true" />
            </button>
        </article>
    );
}

export default function Security({
    moodleConnected,
    moodleBackgroundNotifications,
    profile,
    syncStatus,
    preferences,
    cacheConfig,
    quickSubjects,
    canManageTwoFactor = false,
    twoFactorEnabled = false,
    requiresConfirmation = true,
}: Props) {
    const [showReconnectForm, setShowReconnectForm] = useState(false);
    const pageProps = usePage().props as {
        flash?: { success?: string; error?: string };
        errors?: Record<string, string>;
    };
    const flash = pageProps.flash ?? {};
    const { appearance, updateAppearance } = useAppearance();

    const [preferencesData, setPreferencesData] = useState<Preferences>(preferences);
    const [processing, setProcessing] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [backgroundNotificationsEnabled, setBackgroundNotificationsEnabled] = useState<boolean>(moodleBackgroundNotifications);
    const [backgroundNotificationsProcessing, setBackgroundNotificationsProcessing] = useState(false);
    const [selectedQuickSubjects, setSelectedQuickSubjects] = useState<number[]>(quickSubjects.selected);
    const [quickSubjectsProcessing, setQuickSubjectsProcessing] = useState(false);
    const { qrCodeSvg, manualSetupKey, errors: twoFactorErrors, clearSetupData, fetchSetupData } = useTwoFactorAuth();
    const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
    const [isConfirmingPassword, setIsConfirmingPassword] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isEnabling, setIsEnabling] = useState(false);
    const [isDisabling, setIsDisabling] = useState(false);
    const [twoFactorIntent, setTwoFactorIntent] = useState<'enable' | 'disable'>('enable');

    const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

    const handleTwoFactorSwitchClick = (intent: 'enable' | 'disable') => {
        setTwoFactorIntent(intent);
        setPasswordInput('');
        setPasswordError('');
        setIsConfirmingPassword(true);
    };

    const handlePasswordConfirm = async () => {
        setPasswordError('');

        if (twoFactorIntent === 'enable') {
            setIsEnabling(true);
        } else {
            setIsDisabling(true);
        }

        try {
            const response = await fetch('/user/confirm-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ password: passwordInput }),
            });

            if (response.ok) {
                setIsConfirmingPassword(false);
                setPasswordInput('');

                if (twoFactorIntent === 'enable') {
                    router.post(enable().url, {}, {
                        preserveScroll: true,
                        preserveState: true,
                        only: ['twoFactorEnabled', 'twoFactorQrCodeSvg', 'twoFactorSecretKey', 'requiresConfirmation', 'canManageTwoFactor'],
                        onSuccess: () => setIsTwoFactorModalOpen(true),
                        onFinish: () => setIsEnabling(false),
                    });
                } else {
                    router.delete(disable().url, {
                        preserveScroll: true,
                        preserveState: true,
                        only: ['twoFactorEnabled', 'twoFactorQrCodeSvg', 'twoFactorSecretKey', 'requiresConfirmation', 'canManageTwoFactor'],
                        onFinish: () => setIsDisabling(false),
                    });
                }
            } else if (response.status === 422) {
                setPasswordError('Contraseña incorrecta');
                setIsEnabling(false);
                setIsDisabling(false);
            } else if (response.status === 423) {
                setPasswordError('Demasiados intentos, espera un momento');
                setIsEnabling(false);
                setIsDisabling(false);
            } else {
                setPasswordError('Error al confirmar la contraseña');
                setIsEnabling(false);
                setIsDisabling(false);
            }
        } catch {
            setPasswordError('Error de conexión');
            setIsEnabling(false);
            setIsDisabling(false);
        }
    };

    const getSectionFromHash = (): SettingsSection => {
        if (typeof window === 'undefined') {
            return 'usuario';
        }

        const hash = window.location.hash.replace('#', '');

        if (hash === 'usuario' || hash === 'notificaciones' || hash === 'apariencia' || hash === 'peligro') {
            return hash;
        }

        return 'usuario';
    };

    const [activeSection, setActiveSection] = useState<SettingsSection>(() => getSectionFromHash());

    const sidebarItems: SideNavItem[] = [
        {
            key: 'usuario',
            title: 'Usuario',
            description: 'Info del usuario, Moodle y datos',
            icon: UserRound,
        },
        {
            key: 'notificaciones',
            title: 'Notificaciones',
            description: 'Recordatorios y canales',
            icon: BellRing,
        },
        {
            key: 'apariencia',
            title: 'Apariencia',
            description: 'Tema visual de la app',
            icon: Palette,
        },
        {
            key: 'peligro',
            title: 'Zona de peligro',
            description: 'Seguridad, cierre y cuenta',
            icon: ShieldAlert,
        },
    ];

    useEffect(() => {
        const syncSection = () => {
            setActiveSection(getSectionFromHash());
        };

        syncSection();
        window.addEventListener('hashchange', syncSection);

        return () => {
            window.removeEventListener('hashchange', syncSection);
        };
    }, []);

    useEffect(() => {
        setBackgroundNotificationsEnabled(moodleBackgroundNotifications);
    }, [moodleBackgroundNotifications]);

    const handleSectionChange = (section: SettingsSection) => {
        setActiveSection(section);

        if (typeof window !== 'undefined') {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${section}`);
        }
    };

    const appearanceOptions: Array<{ value: Appearance; label: string; icon: typeof Sun }> = [
        { value: 'light', label: 'Claro', icon: Sun },
        { value: 'dark', label: 'Oscuro', icon: Moon },
        { value: 'system', label: 'Sistema', icon: Monitor },
    ];

    const persistPreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
        const next = {
            ...preferencesData,
            [key]: value,
        };

        setPreferencesData(next);
        setProcessing(true);

        router.post('/settings/security/preferences', next, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            onFinish: () => setProcessing(false),
        });
    };

    const quickSubjectsLimit = Math.max(1, quickSubjects.selectionLimit);
    const quickSubjectsSelectedCount = selectedQuickSubjects.length;
    const canSelectMoreQuickSubjects = quickSubjectsSelectedCount < quickSubjectsLimit;
    const quickSubjectsError = pageProps.errors?.subject_ids;

    const handleQuickSubjectToggle = (subjectId: number, isChecked: boolean) => {
        setSelectedQuickSubjects((current) => {
            if (isChecked) {
                if (current.includes(subjectId) || current.length >= quickSubjectsLimit) {
                    return current;
                }

                return [...current, subjectId];
            }

            return current.filter((id) => id !== subjectId);
        });
    };

    const submitQuickSubjects = () => {
        setQuickSubjectsProcessing(true);

        router.post(
            '/settings/security/quick-subjects',
            {
                subject_ids: selectedQuickSubjects,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onFinish: () => setQuickSubjectsProcessing(false),
            },
        );
    };

    const sendTestNotificationEmail = () => {
        setTestingEmail(true);

        router.post(
            '/settings/security/preferences/test-email',
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onFinish: () => setTestingEmail(false),
            },
        );
    };

    const persistBackgroundNotifications = (enabled: boolean) => {
        const previous = backgroundNotificationsEnabled;
        setBackgroundNotificationsEnabled(enabled);
        setBackgroundNotificationsProcessing(true);

        router.post(
            updateBackgroundNotifications().url,
            {
                moodle_background_notifications: enabled,
            },
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onError: () => setBackgroundNotificationsEnabled(previous),
                onFinish: () => setBackgroundNotificationsProcessing(false),
            },
        );
    };

    const closeSettings = () => {
        if (typeof window !== 'undefined') {
            const referrer = window.document.referrer;
            const currentPath = `${window.location.pathname}${window.location.search}`;

            if (referrer !== '') {
                try {
                    const target = new URL(referrer);
                    const targetPath = `${target.pathname}${target.search}`;
                    const isSamePage = targetPath === currentPath;
                    const isSettingsRoute = target.pathname.startsWith('/settings');

                    if (target.origin === window.location.origin && !isSamePage && !isSettingsRoute) {
                        router.visit(`${target.pathname}${target.search}${target.hash}`, {
                            preserveState: false,
                            preserveScroll: false,
                        });

                        return;
                    }
                } catch {
                    // Ignore malformed referrer and fallback to dashboard.
                }
            }
        }

        router.visit('/dashboard', {
            preserveState: false,
            preserveScroll: false,
        });
    };

    return (
        <>
            <Head title="Configuración" />

            <main className="p-settings" aria-labelledby="settings-title">
                <header className="p-settings__page-header" aria-label="Cabecera de configuración">
                    <section className="p-settings__page-header-brand">
                        <span className="p-settings__page-header-icon" aria-hidden="true">
                            <Settings size={14} />
                        </span>
                        <p className="p-settings__page-header-brand-text">Configuración</p>
                    </section>

                    <section className="p-settings__page-header-actions">
                        <button type="button" className="p-settings__close" onClick={closeSettings} aria-label="Salir de configuración">
                            <X size={13} />
                        </button>
                    </section>
                </header>

                <section className="p-settings__workspace">
                    <aside className="p-settings__side" aria-label="Navegación de configuración">
                        <header className="p-settings__side-header">
                            <h2 className="p-settings__side-header-title">Settings</h2>
                            <p className="p-settings__side-header-subtitle">Management</p>
                        </header>

                        <nav className="p-settings__side-nav" aria-label="Apartados de configuración">
                            {sidebarItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = activeSection === item.key;

                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => handleSectionChange(item.key)}
                                        aria-pressed={isActive}
                                        className={[
                                            'p-settings__side-link',
                                            isActive ? 'p-settings__side-link--active' : '',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                    >
                                        <Icon size={14} aria-hidden="true" />
                                        <section className="p-settings__side-link-copy">
                                            <p className="p-settings__side-link-title">{item.title}</p>
                                            <span className="p-settings__side-link-description">{item.description}</span>
                                        </section>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>

                    <section className="p-settings__main">
                        <header className="p-settings__hero">
                            <section className="p-settings__hero-main">
                                <p className="p-settings__eyebrow">Ajustes del sistema</p>

                                <h1 id="settings-title" className="p-settings__title">
                                    PERFIL<span className="p-settings__title-dot">.</span>
                                </h1>
                                <p className="p-settings__description">Gestión de identidad académica y sincronización de datos.</p>
                            </section>
                        </header>

                        {(flash.success || flash.error || syncStatus.message) && (
                            <section className="p-settings__flash" aria-live="polite">
                                <p
                                    className={[
                                        'p-settings__flash-message',
                                        flash.error || syncStatus.message ? 'p-settings__flash-message--error' : 'p-settings__flash-message--success',
                                    ].join(' ')}
                                >
                                    {flash.error ?? syncStatus.message ?? flash.success}
                                </p>
                            </section>
                        )}

                        <section className="p-settings__content" aria-live="polite">
                        {activeSection === 'usuario' && (
                            <section className="p-settings__panel">
                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2 className="p-settings__section-title">Información de usuario</h2>
                                        <span className="p-settings__section-rule" aria-hidden="true" />
                                    </header>

                                    <dl className="p-settings__profile-grid">
                                        <div className="p-settings__profile-item">
                                            <dt className="p-settings__profile-term">Nombre completo</dt>
                                            <dd className="p-settings__profile-detail">{profile.fullName ?? 'No disponible'}</dd>
                                        </div>
                                        <div className="p-settings__profile-item">
                                            <dt className="p-settings__profile-term">Correo institucional</dt>
                                            <dd className="p-settings__profile-detail">{profile.email ?? 'No disponible'}</dd>
                                        </div>
                                        <div className="p-settings__profile-item">
                                            <dt className="p-settings__profile-term">Curso actual</dt>
                                            <dd className="p-settings__profile-detail">{profile.course ?? 'No disponible'}</dd>
                                        </div>
                                        <div className="p-settings__profile-item">
                                            <dt className="p-settings__profile-term">Año académico</dt>
                                            <dd className="p-settings__profile-detail">{profile.academicYear ?? 'No disponible'}</dd>
                                        </div>
                                    </dl>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2 className="p-settings__section-title">Conexión a Moodle</h2>
                                        <span className="p-settings__section-rule" aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__moodle-card" aria-live="polite">
                                        <section>
                                            <p className="p-settings__moodle-title">
                                                {moodleConnected ? 'Conectado a Moodle' : 'Moodle no conectado'}
                                            </p>
                                            <p className="p-settings__moodle-meta">
                                                {moodleConnected
                                                    ? `Última sincronización: hoy a las ${syncStatus.lastSyncLabel ?? '--:--'}`
                                                    : 'Inicia sesión para sincronizar tus datos académicos'}
                                            </p>
                                        </section>

                                        <section className="p-settings__moodle-actions">
                                            {moodleConnected && (
                                                <>
                                                    <Form method="post" action="/settings/security/moodle/disconnect">
                                                        {({ processing: disconnectProcessing }) => (
                                                            <Button
                                                                type="submit"
                                                                variant="destructive"
                                                                className="p-settings__danger-button"
                                                                disabled={disconnectProcessing}
                                                            >
                                                                {disconnectProcessing ? 'Cerrando...' : 'Cerrar sesión'}
                                                            </Button>
                                                        )}
                                                    </Form>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setShowReconnectForm((value) => !value)}
                                                        className="p-settings__outline-button"
                                                    >
                                                        Reconectar
                                                    </Button>
                                                </>
                                            )}
                                        </section>
                                    </section>

                                    {(showReconnectForm || !moodleConnected) && (
                                        <Form
                                            method="post"
                                            action={connect().url}
                                            className="p-settings__connect-form"
                                            onSuccess={() => {
                                                setShowReconnectForm(false);
                                                router.reload();
                                            }}
                                        >
                                            {({ errors, processing: connectProcessing }) => (
                                                <>
                                                    <section className="p-settings__field">
                                                        <label className="p-settings__field-label" htmlFor="moodle_username">Usuario Moodle</label>
                                                        <Input
                                                            id="moodle_username"
                                                            name="moodle_username"
                                                            required
                                                            autoComplete="username"
                                                        />
                                                        <InputError message={errors.moodle_username} />
                                                    </section>

                                                    <section className="p-settings__field">
                                                        <label className="p-settings__field-label" htmlFor="moodle_password">Contraseña Moodle</label>
                                                        <Input
                                                            id="moodle_password"
                                                            name="moodle_password"
                                                            type="password"
                                                            required
                                                            autoComplete="current-password"
                                                        />
                                                        <InputError message={errors.moodle_password} />
                                                    </section>

                                                    <Button
                                                        type="submit"
                                                        variant="outline"
                                                        className="p-settings__outline-button"
                                                        disabled={connectProcessing}
                                                    >
                                                        {connectProcessing ? 'Conectando...' : 'Guardar conexión'}
                                                    </Button>
                                                </>
                                            )}
                                        </Form>
                                    )}

                                    <p className="p-settings__caption">
                                        Usamos una sesión temporal segura para Moodle y no conservamos tu contraseña de forma persistente en base de datos.
                                    </p>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2 className="p-settings__section-title">Control de sincronización</h2>
                                        <span className="p-settings__section-rule" aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__toggles">
                                        <PreferenceToggle
                                            id="background-notifications"
                                            label="Notificaciones de Moodle en segundo plano"
                                            description="Tú decides si mantener una sesión técnica cifrada para revisar tareas y mensajes nuevos de Moodle, y avisarte por email sin tener la app abierta."
                                            checked={backgroundNotificationsEnabled}
                                            disabled={!moodleConnected || backgroundNotificationsProcessing}
                                            onToggle={persistBackgroundNotifications}
                                        />

                                        <Alert className="p-settings__background-info">
                                            <header className="p-settings__background-info-head">
                                                <span className="p-settings__background-info-icon" aria-hidden="true">
                                                    <CircleHelp size={14} aria-hidden="true" />
                                                </span>
                                                <AlertTitle className="p-settings__background-info-title">Decisión de usuario</AlertTitle>
                                            </header>

                                            <AlertDescription className="p-settings__background-info-description">
                                                <p className="p-settings__background-info-text">
                                                    Activado: mantenemos una sesión técnica cifrada para comprobar tareas y mensajes nuevos de Moodle, y enviarte avisos por correo aunque no tengas la app abierta.
                                                </p>
                                                <p className="p-settings__background-info-text">
                                                    Desactivado: eliminamos inmediatamente esa sesión técnica.
                                                </p>
                                            </AlertDescription>
                                        </Alert>
                                    </section>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2 className="p-settings__section-title">Actualización de datos</h2>
                                        <span className="p-settings__section-rule" aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__cache-grid" aria-label="Frecuencias de caché">
                                        <article className="p-settings__cache-card">
                                            <p className="p-settings__cache-label">Caché de asignaturas</p>
                                            <strong className="p-settings__cache-value">{cacheConfig.asignaturasMinutes} minutos</strong>
                                        </article>
                                        <article className="p-settings__cache-card">
                                            <p className="p-settings__cache-label">Caché de tareas</p>
                                            <strong className="p-settings__cache-value">{cacheConfig.tareasMinutes} minutos</strong>
                                        </article>
                                    </section>
                                </article>
                            </section>
                        )}

                        {activeSection === 'notificaciones' && (
                            <section className="p-settings__panel">
                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2 className="p-settings__section-title">Recordatorios por tiempo</h2>
                                        <span className="p-settings__section-rule" aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__toggles">
                                        <PreferenceToggle
                                            id="reminder-48"
                                            label="48 horas antes"
                                            description="Recibir notificación dos días antes de la fecha límite"
                                            checked={preferencesData['48h_antes']}
                                            disabled={processing}
                                            onToggle={(value) => persistPreference('48h_antes', value)}
                                        />
                                        <PreferenceToggle
                                            id="reminder-24"
                                            label="24 horas antes"
                                            description="Recibir notificación un día antes de la fecha límite"
                                            checked={preferencesData['24h_antes']}
                                            disabled={processing}
                                            onToggle={(value) => persistPreference('24h_antes', value)}
                                        />
                                        <PreferenceToggle
                                            id="reminder-same-day"
                                            label="El mismo día"
                                            description="Recibir notificación durante la mañana del día de entrega"
                                            checked={preferencesData.mismo_dia}
                                            disabled={processing}
                                            onToggle={(value) => persistPreference('mismo_dia', value)}
                                        />

                                        <section className="p-settings__custom-reminder">
                                            <PreferenceToggle
                                                id="custom-reminder"
                                                label="Recordatorio personalizado"
                                                description="Define cada cuántos minutos quieres recibir la alerta"
                                                checked={preferencesData.recordatorio_personalizado}
                                                disabled={processing}
                                                onToggle={(value) => persistPreference('recordatorio_personalizado', value)}
                                            />

                                            <label className="p-settings__custom-reminder-label" htmlFor="recordatorio_personalizado_minutos">
                                                Frecuencia personalizada (minutos)
                                            </label>
                                            <Input
                                                className="p-settings__custom-reminder-input"
                                                id="recordatorio_personalizado_minutos"
                                                type="number"
                                                min={1}
                                                max={10080}
                                                value={preferencesData.recordatorio_personalizado_minutos}
                                                disabled={!preferencesData.recordatorio_personalizado || processing}
                                                onChange={(event) => {
                                                    const value = Math.max(1, Number(event.target.value || 1));
                                                    setPreferencesData((current) => ({
                                                        ...current,
                                                        recordatorio_personalizado_minutos: value,
                                                    }));
                                                }}
                                                onBlur={() =>
                                                    persistPreference(
                                                        'recordatorio_personalizado_minutos',
                                                        Math.max(1, Number(preferencesData.recordatorio_personalizado_minutos || 1)),
                                                    )
                                                }
                                            />
                                        </section>
                                    </section>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2 className="p-settings__section-title">Canales de notificación</h2>
                                        <span className="p-settings__section-rule" aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__toggles">
                                        <PreferenceToggle
                                            id="channel-email"
                                            label="Correo electrónico"
                                            description={profile.email ? `Enviar a ${profile.email}` : 'Enviar por correo institucional'}
                                            checked={preferencesData.email}
                                            disabled={processing}
                                            icon="mail"
                                            onToggle={(value) => persistPreference('email', value)}
                                        />

                                        {preferencesData.email ? (
                                            <fieldset className="p-settings__email-preferences" aria-label="Preferencias del canal de correo">
                                                <legend className="p-settings__email-preferences-legend">
                                                    Tipos de aviso por correo
                                                </legend>
                                                <p className="p-settings__email-preferences-intro">
                                                    Estas opciones solo aplican al canal de correo electrónico.
                                                </p>

                                                <section className="p-settings__email-test">
                                                    <p className="p-settings__email-test-copy">
                                                        ¿Quieres probarlo ahora? Envía una simulación de "nueva tarea" al correo configurado.
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="p-settings__outline-button"
                                                        disabled={processing || testingEmail || !profile.email || !preferencesData.email}
                                                        onClick={sendTestNotificationEmail}
                                                    >
                                                        {testingEmail ? 'Enviando prueba...' : 'Probar correo'}
                                                    </Button>
                                                </section>

                                                <section aria-label="Tipos de notificación por correo" className="p-settings__toggles p-settings__toggles--compact">
                                                    <PreferenceToggle
                                                        id="email-type-48h"
                                                        label="Recordatorio 48h"
                                                        description="Permite correos de aviso cuando falten menos de 48 horas para la entrega"
                                                        checked={preferencesData.email_48h}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_48h', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-24h"
                                                        label="Recordatorio 24h"
                                                        description="Permite correos de aviso cuando falten menos de 24 horas para la entrega"
                                                        checked={preferencesData.email_24h}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_24h', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-same-day"
                                                        label="Recordatorio del mismo día"
                                                        description="Permite correos de entregas que vencen hoy"
                                                        checked={preferencesData.email_same_day}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_same_day', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-custom"
                                                        label="Recordatorio personalizado"
                                                        description="Permite correos según la ventana de minutos personalizada"
                                                        checked={preferencesData.email_custom}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_custom', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-overdue"
                                                        label="Entrega vencida"
                                                        description="Permite correos cuando una entrega ya está fuera de plazo"
                                                        checked={preferencesData.email_overdue}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_overdue', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-new-task"
                                                        label="Nueva tarea"
                                                        description="Permite correos cuando se detecta una tarea nueva en Moodle"
                                                        checked={preferencesData.email_new_task}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_new_task', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-deadline-changed"
                                                        label="Cambio de fecha de entrega"
                                                        description="Permite correos cuando el profesorado modifica la fecha de entrega"
                                                        checked={preferencesData.email_deadline_changed}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_deadline_changed', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-new-grade"
                                                        label="Nueva calificación"
                                                        description="Permite correos cuando aparece una nueva nota"
                                                        checked={preferencesData.email_new_grade}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_new_grade', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-new-feedback"
                                                        label="Nueva retroalimentación"
                                                        description="Permite correos cuando el profesorado publica feedback"
                                                        checked={preferencesData.email_new_feedback}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_new_feedback', value)}
                                                    />
                                                    <PreferenceToggle
                                                        id="email-type-moodle-message"
                                                        label="Mensajería Moodle"
                                                        description="Permite correos cuando llega un nuevo mensaje en Moodle"
                                                        checked={preferencesData.email_moodle_message}
                                                        disabled={processing}
                                                        onToggle={(value) => persistPreference('email_moodle_message', value)}
                                                    />
                                                </section>
                                            </fieldset>
                                        ) : (
                                            <p className="p-settings__caption">
                                                Activa el canal de correo para configurar qué tipos de notificaciones quieres recibir.
                                            </p>
                                        )}


                                    </section>
                                </article>
                            </section>
                        )}

                        {activeSection === 'apariencia' && (
                            <section className="p-settings__panel">
                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2 className="p-settings__section-title">Apariencia</h2>
                                        <span className="p-settings__section-rule" aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__appearance-card" aria-label="Apariencia de la aplicación">
                                        <p className="p-settings__appearance-title">Tema de la aplicación</p>
                                        <p className="p-settings__appearance-description">
                                            Elige cómo quieres visualizar la interfaz en toda la aplicación.
                                        </p>

                                        <nav className="p-settings__appearance-options" aria-label="Selector de apariencia">
                                            {appearanceOptions.map(({ value, label, icon: Icon }) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    className={[
                                                        'p-settings__appearance-option',
                                                        appearance === value ? 'p-settings__appearance-option--active' : '',
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' ')}
                                                    onClick={() => updateAppearance(value)}
                                                    aria-pressed={appearance === value}
                                                >
                                                    <Icon size={14} aria-hidden="true" />
                                                    <span>{label}</span>
                                                </button>
                                            ))}
                                        </nav>
                                    </section>
                                </article>

                                <article className="p-settings__section">
                                    <header className="p-settings__section-header">
                                        <h2>Asignaturas</h2>
                                        <span aria-hidden="true" />
                                    </header>

                                    <section className="p-settings__subjects-card" aria-label="Asignaturas para vista rápida">
                                        <p className="p-settings__subjects-title">Configuración de asignaturas en vista rápida</p>
                                        <p className="p-settings__subjects-description">
                                            Esta sección es para elegir las 4 asignaturas que aparecerán en la vista rápida de la página de dashboard.
                                        </p>
                                        <p className="p-settings__subjects-description">
                                            Deben seleccionarse exactamente 4 asignaturas. Si aplicas con una cantidad distinta, se usará la lógica automática actual.
                                        </p>

                                        {quickSubjects.available.length > 0 ? (
                                            <>
                                                <fieldset className="p-settings__subjects-fieldset">
                                                    <legend className="p-settings__subjects-legend">Listado de asignaturas disponibles</legend>

                                                    <ul className="p-settings__subjects-list">
                                                        {quickSubjects.available.map((subject) => {
                                                            const isChecked = selectedQuickSubjects.includes(subject.id);
                                                            const isDisabled = !isChecked && !canSelectMoreQuickSubjects;

                                                            return (
                                                                <li key={subject.id}>
                                                                    <label className={['p-settings__subject-option', isDisabled ? 'p-settings__subject-option--disabled' : ''].filter(Boolean).join(' ')}>
                                                                        <input
                                                                            className="p-settings__subject-option-input"
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            disabled={isDisabled || quickSubjectsProcessing}
                                                                            onChange={(event) => handleQuickSubjectToggle(subject.id, event.target.checked)}
                                                                        />
                                                                        <span className="p-settings__subject-option-text">{subject.title}</span>
                                                                    </label>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </fieldset>

                                                <footer className="p-settings__subjects-footer">
                                                    <p className="p-settings__subjects-counter">
                                                        Seleccionadas: <b className="p-settings__subjects-counter-value">{quickSubjectsSelectedCount}</b>/{quickSubjectsLimit}
                                                    </p>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="p-settings__outline-button"
                                                        onClick={submitQuickSubjects}
                                                        disabled={quickSubjectsProcessing}
                                                    >
                                                        {quickSubjectsProcessing ? 'Aplicando...' : 'Aplicar selección'}
                                                    </Button>
                                                </footer>
                                            </>
                                        ) : (
                                            <p className="p-settings__subjects-empty">
                                                No hay asignaturas disponibles. Conecta Moodle para poder configurar esta sección.
                                            </p>
                                        )}

                                        {quickSubjectsError && <InputError message={quickSubjectsError} />}
                                    </section>
                                </article>
                            </section>
                        )}

                        {activeSection === 'peligro' && (
                            <section className="p-settings__panel">
                                {canManageTwoFactor && (
                                    <article className="p-settings__section">
                                        <header className="p-settings__section-header">
                                            <h2 className="p-settings__section-title">Seguridad de acceso</h2>
                                            <span className="p-settings__section-rule" aria-hidden="true" />
                                        </header>

                                        <section className="p-settings__two-factor">
                                            <p className="p-settings__two-factor-status">
                                                Verificación en 2 pasos: <b className="p-settings__two-factor-status-value">{twoFactorEnabled ? 'Activada' : 'Desactivada'}</b>
                                            </p>

                                            {twoFactorEnabled ? (
                                                <>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="p-settings__outline-button"
                                                        onClick={() => setIsTwoFactorModalOpen(true)}
                                                    >
                                                        Gestionar
                                                    </Button>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked="true"
                                                        aria-label="Desactivar verificación en 2 pasos"
                                                        className={[
                                                            'p-settings__switch',
                                                            'p-settings__switch--on',
                                                            isDisabling ? 'p-settings__switch--disabled' : '',
                                                        ].join(' ')}
                                                        disabled={isDisabling}
                                                        onClick={() => handleTwoFactorSwitchClick('disable')}
                                                    >
                                                        <span className="p-settings__switch-thumb" aria-hidden="true" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked="false"
                                                    aria-label="Activar verificación en 2 pasos"
                                                    className={[
                                                        'p-settings__switch',
                                                        isEnabling ? 'p-settings__switch--disabled' : '',
                                                    ].filter(Boolean).join(' ')}
                                                    disabled={isEnabling}
                                                    onClick={() => handleTwoFactorSwitchClick('enable')}
                                                >
                                                    <span className="p-settings__switch-thumb" aria-hidden="true" />
                                                </button>
                                            )}
                                        </section>
                                    </article>
                                )}

                                <article className="p-settings__danger-zone">
                                    <header className="p-settings__danger-zone-head">
                                        <h2 className="p-settings__danger-zone-title">Zona de peligro</h2>
                                    </header>

                                    <section className="p-settings__danger-row">
                                        <section className="p-settings__danger-block">
                                            <h3 className="p-settings__danger-block-title">Eliminar mi cuenta</h3>
                                            <p className="p-settings__danger-block-description">
                                                La eliminación de la cuenta es permanente y conlleva la pérdida de todo el historial académico almacenado.
                                            </p>

                                            <Form
                                                method="delete"
                                                action="/settings/security/account"
                                                onBefore={() =>
                                                    window.confirm('Esta acción eliminará tu cuenta de forma permanente. ¿Deseas continuar?')
                                                }
                                            >
                                                {({ processing: deleting }) => (
                                                    <Button className="p-settings__danger-block-action" type="submit" variant="destructive" disabled={deleting}>
                                                        {deleting ? 'Eliminando...' : 'Eliminar mi cuenta'}
                                                    </Button>
                                                )}
                                            </Form>
                                        </section>

                                        <section className="p-settings__danger-block">
                                            <h3 className="p-settings__danger-block-title">Cerrar sesión</h3>
                                            <p className="p-settings__danger-block-description">Al cerrar sesión se cerrará también el acceso del usuario en esta aplicación.</p>

                                            <Form method="post" action="/logout">
                                                {({ processing: loggingOut }) => (
                                                    <Button className="p-settings__danger-block-action" type="submit" variant="destructive" disabled={loggingOut}>
                                                        {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                                                    </Button>
                                                )}
                                            </Form>
                                        </section>
                                    </section>
                                </article>
                            </section>
                        )}
                        </section>

                        <footer className="p-settings__footer">
                            <p className="p-settings__version">V2.4.0 <span className="p-settings__version-label">Release build</span></p>
                            <p className="p-settings__latency">Sincronización total: <b className="p-settings__latency-value">14.2ms LAT</b></p>
                        </footer>
                    </section>
                </section>
            </main>

            <Dialog
                open={isConfirmingPassword}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsConfirmingPassword(false);
                        setPasswordInput('');
                        setPasswordError('');
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar contraseña</DialogTitle>
                        <DialogDescription>
                            Introduce tu contraseña para continuar.
                        </DialogDescription>
                    </DialogHeader>

                    <section className="p-settings__field">
                        <label className="p-settings__field-label" htmlFor="confirm-password-input">
                            Contraseña
                        </label>
                        <Input
                            id="confirm-password-input"
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isEnabling && !isDisabling && passwordInput) {
                                    void handlePasswordConfirm();
                                }
                            }}
                            disabled={isEnabling || isDisabling}
                            autoComplete="current-password"
                        />
                        {passwordError && <InputError message={passwordError} />}
                        {twoFactorIntent === 'enable' && (
                            <p className="p-settings__caption">
                                Compatible con: Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden
                            </p>
                        )}
                    </section>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsConfirmingPassword(false);
                                setPasswordInput('');
                                setPasswordError('');
                            }}
                            disabled={isEnabling || isDisabling}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={() => void handlePasswordConfirm()}
                            disabled={isEnabling || isDisabling || !passwordInput}
                        >
                            {isEnabling || isDisabling ? 'Confirmando...' : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <TwoFactorSetupModal
                isOpen={isTwoFactorModalOpen}
                onClose={() => setIsTwoFactorModalOpen(false)}
                twoFactorEnabled={twoFactorEnabled}
                requiresConfirmation={requiresConfirmation}
                qrCodeSvg={qrCodeSvg}
                manualSetupKey={manualSetupKey}
                clearSetupData={clearSetupData}
                fetchSetupData={fetchSetupData}
                errors={twoFactorErrors}
            />
        </>
    );
}
