import { Head, Link, router, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import AcademiaHeader from '@/components/academia-header';
import AlertError from '@/components/alert-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

type QuickCard = {
    code: string;
    title: string;
    status: string;
    muted?: boolean;
    accent?: boolean;
};

type TimelineItem = {
    when: string;
    title: string;
    description: string;
    link?: string;
    current?: boolean;
};

type MatrixTask = {
    title: string;
    course: string;
    reason: string;
    link?: string | null;
};

type EisenhowerMatrix = {
    doNow: MatrixTask[];
    schedule: MatrixTask[];
    delegate: MatrixTask[];
    optimize: MatrixTask[];
};

type DashboardProps = {
    moodleConnected: boolean;
    studentName: string | null;
    quickCards: QuickCard[];
    timeline: TimelineItem[];
    hero: {
        reference: string;
        title: string;
        highlight: string;
        remaining: string;
        priority: string;
        link?: string | null;
    };
    eisenhower: EisenhowerMatrix;
    matrixExplanation: string | null;
    matrixProvider: string;
    matrixMode: 'basic' | 'ai';
    matrixPreferences: string;
    matrixIncludeExplanation: boolean;
    profileAvatarUrl: string | null;
    dashboardError: string | null;
    loading: boolean;
};

const TIMELINE_BATCH_SIZE = 2;

export default function Dashboard({
    moodleConnected,
    studentName,
    quickCards,
    timeline,
    hero,
    eisenhower,
    matrixExplanation,
    matrixProvider,
    matrixMode,
    matrixPreferences,
    matrixIncludeExplanation,
    profileAvatarUrl,
    dashboardError,
    loading,
}: DashboardProps) {
    const leftColumnRef = useRef<HTMLElement | null>(null);
    const heroCardRef = useRef<HTMLElement | null>(null);
    const timelineContainerRef = useRef<HTMLElement | null>(null);
    const timelineListRef = useRef<HTMLOListElement | null>(null);
    const timelineActionsRef = useRef<HTMLDivElement | null>(null);

    const [timelineMaxHeight, setTimelineMaxHeight] = useState<number | null>(null);
    const [timelineListOffset, setTimelineListOffset] = useState(0);
    const [visibleTimelineItems, setVisibleTimelineItems] = useState(TIMELINE_BATCH_SIZE);

    const visibleTimeline = timeline.slice(0, visibleTimelineItems);
    const hasMoreTimelineItems = visibleTimelineItems < timeline.length;
    const canShowTimelineControls = timeline.length > TIMELINE_BATCH_SIZE;
    const canShowLessTimelineItems = visibleTimelineItems > TIMELINE_BATCH_SIZE;
    const isAiMode = matrixMode === 'ai';
    const matrixStateLabel = (() => {
        if (!isAiMode) {
            return 'Estado: Logica base activa';
        }

        if (matrixProvider === 'ai') {
            return 'Estado: IA activa';
        }

        if (matrixProvider === 'gemini') {
            return 'Estado: Gemini activa';
        }

        if (matrixProvider === 'missing-api-key') {
            return 'Estado: IA seleccionada (falta API key)';
        }

        if (matrixProvider === 'ai-idle') {
            return 'Estado: IA seleccionada (pendiente de ejecutar)';
        }

        return `Estado: IA seleccionada (${matrixProvider})`;
    })();

    const { data, setData, post, processing, errors } = useForm({
        matrix_mode: matrixMode,
        ai_api_key: '',
        matrix_preferences: matrixPreferences ?? '',
        matrix_include_explanation: matrixIncludeExplanation,
    });

    useEffect(() => {
        setData('matrix_mode', matrixMode);
        setData('matrix_preferences', matrixPreferences ?? '');
        setData('matrix_include_explanation', matrixIncludeExplanation);
    }, [matrixMode, matrixPreferences, matrixIncludeExplanation, setData]);

    useEffect(() => {
        if (!moodleConnected || !loading) {
            return;
        }

        let cancelled = false;
        let pollTimeout: number | null = null;

        const runPoll = () => {
            if (cancelled) {
                return;
            }

            router.reload({
                only: [
                    'studentName',
                    'quickCards',
                    'timeline',
                    'hero',
                    'eisenhower',
                    'matrixExplanation',
                    'matrixProvider',
                    'profileAvatarUrl',
                    'dashboardError',
                    'loading',
                ],
                onFinish: () => {
                    if (cancelled) {
                        return;
                    }

                    pollTimeout = window.setTimeout(runPoll, 5000);
                },
            });
        };

        pollTimeout = window.setTimeout(runPoll, 5000);

        return () => {
            cancelled = true;

            if (pollTimeout !== null) {
                window.clearTimeout(pollTimeout);
            }
        };
    }, [loading, moodleConnected]);

    useEffect(() => {
        const updateTimelineHeight = () => {
            const leftColumn = leftColumnRef.current;
            const heroCard = heroCardRef.current;
            const timelineContainer = timelineContainerRef.current;
            const timelineList = timelineListRef.current;
            const timelineActions = timelineActionsRef.current;

            if (!leftColumn || !heroCard || !timelineContainer || !timelineList) {

                return;
            }

            if (window.innerWidth <= 1180) {
                setTimelineMaxHeight(null);
                setTimelineListOffset(0);

                return;
            }

            const leftColumnRect = leftColumn.getBoundingClientRect();
            const heroCardRect = heroCard.getBoundingClientRect();
            const timelineListRect = timelineList.getBoundingClientRect();
            const shouldLockToHeroCard = visibleTimelineItems <= TIMELINE_BATCH_SIZE;
            const desiredTop = heroCardRect.top;
            const naturalTop = timelineListRect.top - timelineListOffset;
            const desiredOffset = desiredTop - naturalTop;
            const stableOffset = Math.abs(desiredOffset - timelineListOffset) > 0.5 ? desiredOffset : timelineListOffset;

            setTimelineListOffset(stableOffset);

            const alignedTop = naturalTop + stableOffset;
            const timelineActionsHeight = timelineActions ? timelineActions.getBoundingClientRect().height + 16 : 0;
            const targetBottom = shouldLockToHeroCard ? heroCardRect.bottom : leftColumnRect.bottom;
            const availableHeight = targetBottom - alignedTop - timelineActionsHeight;
            const maxHeight = Math.max(180, Math.floor(availableHeight));

            setTimelineMaxHeight(maxHeight);
        };

        updateTimelineHeight();

        const observer = new ResizeObserver(() => {
            updateTimelineHeight();
        });

        if (leftColumnRef.current) {
            observer.observe(leftColumnRef.current);
        }

        window.addEventListener('resize', updateTimelineHeight);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateTimelineHeight);
        };
    }, [timeline.length, hasMoreTimelineItems, visibleTimelineItems, timelineListOffset]);

    return (
        <>
            <Head title="Dashboard" />

            <article className="p-dashboard">
                <AcademiaHeader
                    containerClassName="p-dashboard__container"
                    activePath="/dashboard"
                    moodleConnected={moodleConnected}
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-dashboard__main p-dashboard__container">
                    {dashboardError && <AlertError errors={[dashboardError]} title="No se pudo cargar el dashboard." />}

                    {loading && (
                        <section className="p-dashboard__loading" aria-live="polite" aria-busy="true">
                            <Alert className="p-dashboard__loading-alert">
                                <Spinner className="p-dashboard__loading-spinner" />
                                <AlertTitle>Sincronizando dashboard</AlertTitle>
                                <AlertDescription>Estamos preparando prioridades, timeline y matriz en segundo plano.</AlertDescription>
                            </Alert>

                            <section className="p-dashboard__loading-grid p-dashboard__grid">
                                <article className="p-dashboard__loading-hero p-dashboard__hero">
                                    <Skeleton className="p-dashboard__loading-line p-dashboard__loading-line--title" />
                                    <Skeleton className="p-dashboard__loading-line p-dashboard__loading-line--subtitle" />
                                    <Skeleton className="p-dashboard__loading-block p-dashboard__loading-block--hero" />
                                </article>
                                <article className="p-dashboard__loading-timeline p-dashboard__timeline">
                                    <Skeleton className="p-dashboard__loading-line p-dashboard__loading-line--timeline-title" />
                                    <Skeleton className="p-dashboard__loading-line p-dashboard__loading-line--full" />
                                    <Skeleton className="p-dashboard__loading-line p-dashboard__loading-line--wide" />
                                    <Skeleton className="p-dashboard__loading-line p-dashboard__loading-line--narrow" />
                                </article>
                            </section>
                        </section>
                    )}

                    {!loading && (
                    <section className="p-dashboard__grid">
                        <section className="p-dashboard__left-column" ref={leftColumnRef}>
                            <section className="p-dashboard__label" aria-label="Prioridad actual">
                                <span className="p-dashboard__label-text">Status: Prioridad critica</span>
                                <i className="p-dashboard__label-marker" aria-hidden="true" />
                            </section>

                            <article className="p-dashboard__hero" ref={heroCardRef}>
                                <section className="p-dashboard__hero-main">
                                    <header className="p-dashboard__hero-head">
                                        <span className="p-dashboard__hero-tag">{hero.reference}</span>
                                        <p className="p-dashboard__hero-priority">• {hero.highlight || 'PRIORIDAD ALTA'}</p>
                                    </header>

                                    <h1 className="p-dashboard__hero-title">{hero.title}</h1>

                                    <section className="p-dashboard__hero-meta">
                                        <section className="p-dashboard__hero-kpi">
                                            <small className="p-dashboard__hero-kpi-label">Tiempo restante</small>
                                            <b className="p-dashboard__hero-kpi-value p-dashboard__hero-kpi-value--critical">{hero.remaining}</b>
                                        </section>
                                        <span className="p-dashboard__hero-divider" aria-hidden="true" />
                                        <section className="p-dashboard__hero-kpi">
                                            <small className="p-dashboard__hero-kpi-label">Impacto</small>
                                            <b className="p-dashboard__hero-kpi-value">{hero.priority}</b>
                                        </section>
                                    </section>

                                    <a
                                        className="p-dashboard__hero-action"
                                        href={hero.link && hero.link !== '' ? hero.link : '/asignaturas'}
                                        target={hero.link && hero.link !== '' ? '_blank' : undefined}
                                        rel={hero.link && hero.link !== '' ? 'noreferrer' : undefined}
                                    >
                                        <span>IR A LA TAREA</span>
                                    </a>
                                </section>

                                <aside className="p-dashboard__hero-side" aria-hidden="true">
                                    <svg
                                        className="p-dashboard__hero-art"
                                        viewBox="0 0 220 220"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        role="presentation"
                                    >
                                        <defs>
                                            <radialGradient id="dashboardHeroCoreGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(110 110) rotate(90) scale(86)">
                                                <stop stopColor="currentColor" stopOpacity="0.36" />
                                                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                                            </radialGradient>
                                        </defs>

                                        <circle cx="110" cy="110" r="86" fill="url(#dashboardHeroCoreGlow)" />
                                        <circle className="p-dashboard__hero-art-core-ring" cx="110" cy="110" r="52" />
                                        <circle className="p-dashboard__hero-art-core-ring p-dashboard__hero-art-core-ring--inner" cx="110" cy="110" r="34" />
                                        <circle className="p-dashboard__hero-art-core" cx="110" cy="110" r="14" />

                                        <g className="p-dashboard__hero-art-orbit">
                                            <circle className="p-dashboard__hero-art-orb" cx="162" cy="110" r="7" />
                                        </g>

                                        <g className="p-dashboard__hero-art-sparkles">
                                            <circle className="p-dashboard__hero-art-sparkle" cx="70" cy="76" r="1.8" />
                                            <circle className="p-dashboard__hero-art-sparkle" cx="148" cy="62" r="1.6" />
                                            <circle className="p-dashboard__hero-art-sparkle" cx="162" cy="144" r="1.8" />
                                            <circle className="p-dashboard__hero-art-sparkle" cx="82" cy="154" r="1.6" />
                                        </g>
                                    </svg>
                                    <span className="p-dashboard__hero-index">01</span>
                                </aside>
                            </article>

                            <section className="p-dashboard__quick" aria-labelledby="quick-view-title">
                                <header className="p-dashboard__quick-header">
                                    <section>
                                        <h3 id="quick-view-title" className="p-dashboard__quick-title">Vista rapida</h3>
                                        <p className="p-dashboard__quick-subtitle">Progreso del semestre actual</p>
                                    </section>
                                    <section className="p-dashboard__quick-actions" aria-label="Acciones de asignaturas">
                                        <Link className="p-dashboard__quick-link" href="/settings/security#apariencia">
                                            Editar asignaturas
                                        </Link>
                                    </section>
                                </header>

                                <section className="p-dashboard__subjects">
                                    {quickCards.slice(0, 4).map((card) => (
                                        <Link
                                            href="/asignaturas"
                                            key={card.code}
                                            className={[
                                                'p-dashboard__subject',
                                                card.muted ? 'p-dashboard__subject--muted' : '',
                                                card.accent ? 'p-dashboard__subject--accent' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            <section className="p-dashboard__subject-top">
                                                <section>
                                                    <small className="p-dashboard__subject-code">{card.code}</small>
                                                    <h4 className="p-dashboard__subject-title">{card.title}</h4>
                                                </section>
                                                <span className="p-dashboard__dot" aria-hidden="true" />
                                            </section>
                                            <section className="p-dashboard__subject-bottom">
                                                <p className="p-dashboard__subject-status">{card.status}</p>
                                                <span className="p-dashboard__subject-arrow" aria-hidden="true">→</span>
                                            </section>
                                        </Link>
                                    ))}

                                    {quickCards.length === 0 && (
                                        <article className="p-dashboard__subject">
                                            <section className="p-dashboard__subject-top">
                                                <section>
                                                    <small className="p-dashboard__subject-code">SIN-DATOS</small>
                                                    <h4 className="p-dashboard__subject-title">Sin asignaturas cargadas</h4>
                                                </section>
                                                <span className="p-dashboard__dot p-dashboard__dot--muted" aria-hidden="true" />
                                            </section>
                                            <section className="p-dashboard__subject-bottom">
                                                <p className="p-dashboard__subject-status">
                                                    {moodleConnected
                                                        ? 'No hay datos de asignaturas para mostrar'
                                                        : 'Conecta Moodle para cargar tus asignaturas'}
                                                </p>
                                                <span className="p-dashboard__subject-arrow" aria-hidden="true">→</span>
                                            </section>
                                        </article>
                                    )}
                                </section>
                            </section>

                            <section className="p-dashboard__matrix" aria-labelledby="matrix-title">
                                <header className="p-dashboard__matrix-header">
                                    <h3 id="matrix-title" className="p-dashboard__matrix-title">Matriz de Eisenhower</h3>
                                    <section className="p-dashboard__matrix-tools" aria-label="Herramientas de explicacion IA">
                                        <nav className="p-dashboard__matrix-mode" aria-label="Selector de modo de matriz">
                                            <Link
                                                className={['p-dashboard__matrix-mode-link', !isAiMode ? 'p-dashboard__matrix-mode-link--active' : ''].filter(Boolean).join(' ')}
                                                href="/dashboard?matrix_mode=basic"
                                                preserveScroll
                                            >
                                                Logica base
                                            </Link>
                                            <Link
                                                className={['p-dashboard__matrix-mode-link', isAiMode ? 'p-dashboard__matrix-mode-link--active' : ''].filter(Boolean).join(' ')}
                                                href="/dashboard?matrix_mode=ai"
                                                preserveScroll
                                            >
                                                IA asistida
                                            </Link>
                                        </nav>

                                        <small
                                            className={['p-dashboard__matrix-hint', matrixProvider === 'ai' || matrixProvider === 'gemini' ? 'p-dashboard__matrix-hint--ai' : '']
                                                .filter(Boolean)
                                                .join(' ')}
                                        >
                                            {matrixStateLabel}
                                        </small>
                                    </section>
                                </header>

                                <p className="p-dashboard__matrix-mode-help">
                                    Usa <strong className="p-dashboard__matrix-mode-help-emphasis">Logica base</strong> para una priorizacion instantanea y estable. Cambia a <strong className="p-dashboard__matrix-mode-help-emphasis">IA asistida</strong> si quieres
                                    feedback personalizado por asignatura, contexto o preferencias concretas.
                                </p>

                                {isAiMode && (
                                    <form
                                        className="p-dashboard__matrix-ai-form"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            post('/dashboard/matrix', {
                                                preserveState: true,
                                                preserveScroll: true,
                                            });
                                        }}
                                    >
                                        <input type="hidden" name="matrix_mode" value={data.matrix_mode} />

                                        <label className="p-dashboard__matrix-ai-label" htmlFor="matrix-ai-api-key">API key IA</label>
                                        <input
                                            className="p-dashboard__matrix-ai-input"
                                            id="matrix-ai-api-key"
                                            name="ai_api_key"
                                            type="password"
                                            value={data.ai_api_key}
                                            onChange={(event) => setData('ai_api_key', event.target.value)}
                                            placeholder="Introduce tu API key"
                                            autoComplete="off"
                                        />

                                        <label className="p-dashboard__matrix-ai-label" htmlFor="matrix-ai-preferences">Enfoque personalizado</label>
                                        <textarea
                                            className="p-dashboard__matrix-ai-textarea"
                                            id="matrix-ai-preferences"
                                            name="matrix_preferences"
                                            value={data.matrix_preferences}
                                            onChange={(event) => setData('matrix_preferences', event.target.value)}
                                            rows={3}
                                            placeholder="Ejemplo: prioriza Algebra y tareas evaluables de esta semana"
                                        />

                                        <label className="p-dashboard__matrix-ai-check" htmlFor="matrix-ai-explanation">
                                            <input
                                                className="p-dashboard__matrix-ai-check-input"
                                                id="matrix-ai-explanation"
                                                name="matrix_include_explanation"
                                                type="checkbox"
                                                checked={data.matrix_include_explanation}
                                                onChange={(event) => setData('matrix_include_explanation', event.target.checked)}
                                            />
                                            <span className="p-dashboard__matrix-ai-check-text">Incluir feedback explicativo y recomendaciones por cuadrante</span>
                                        </label>

                                        {(errors.ai_api_key || errors.matrix_preferences) && (
                                            <p className="p-dashboard__matrix-ai-error">{errors.ai_api_key || errors.matrix_preferences}</p>
                                        )}

                                        <button className="p-dashboard__matrix-ai-submit" type="submit" disabled={processing}>
                                            {processing ? 'Analizando...' : 'Iniciar analisis IA'}
                                        </button>
                                    </form>
                                )}

                                {matrixExplanation && (
                                    <article className="p-dashboard__matrix-explanation" aria-label="Explicacion IA de la matriz">
                                        <p className="p-dashboard__matrix-explanation-text">{matrixExplanation}</p>
                                    </article>
                                )}

                                <section className="p-dashboard__matrix-grid">
                                    <article className="p-dashboard__matrix-card p-dashboard__matrix-card--critical" aria-label="Urgente e importante">
                                        <header className="p-dashboard__matrix-card-head">
                                            <strong className="p-dashboard__matrix-card-title">Hacer ahora</strong>
                                            <small className="p-dashboard__matrix-card-subtitle">Urgente</small>
                                        </header>
                                        <ul className="p-dashboard__matrix-list">
                                            {eisenhower.doNow.map((task) => (
                                                <li className="p-dashboard__matrix-item" key={`do-now-${task.course}-${task.title}`}>
                                                    <section className="p-dashboard__matrix-item-copy">
                                                        <h4 className="p-dashboard__matrix-item-title">{task.title}</h4>
                                                        <p className="p-dashboard__matrix-item-course">{task.course}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a className="p-dashboard__matrix-item-link" href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.doNow.length === 0 && <li className="p-dashboard__matrix-item p-dashboard__matrix-item--empty">Sin tareas criticas detectadas</li>}
                                        </ul>
                                    </article>

                                    <article className="p-dashboard__matrix-card" aria-label="No urgente e importante">
                                        <header className="p-dashboard__matrix-card-head">
                                            <strong className="p-dashboard__matrix-card-title">Programar</strong>
                                            <small className="p-dashboard__matrix-card-subtitle">Planificar</small>
                                        </header>
                                        <ul className="p-dashboard__matrix-list">
                                            {eisenhower.schedule.map((task) => (
                                                <li className="p-dashboard__matrix-item" key={`schedule-${task.course}-${task.title}`}>
                                                    <section className="p-dashboard__matrix-item-copy">
                                                        <h4 className="p-dashboard__matrix-item-title">{task.title}</h4>
                                                        <p className="p-dashboard__matrix-item-course">{task.course}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a className="p-dashboard__matrix-item-link" href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.schedule.length === 0 && <li className="p-dashboard__matrix-item p-dashboard__matrix-item--empty">Sin tareas para planificar</li>}
                                        </ul>
                                    </article>

                                    <article className="p-dashboard__matrix-card" aria-label="Urgente y menos importante">
                                        <header className="p-dashboard__matrix-card-head">
                                            <strong className="p-dashboard__matrix-card-title">Delegar</strong>
                                            <small className="p-dashboard__matrix-card-subtitle">Rapido</small>
                                        </header>
                                        <ul className="p-dashboard__matrix-list">
                                            {eisenhower.delegate.map((task) => (
                                                <li className="p-dashboard__matrix-item" key={`delegate-${task.course}-${task.title}`}>
                                                    <section className="p-dashboard__matrix-item-copy">
                                                        <h4 className="p-dashboard__matrix-item-title">{task.title}</h4>
                                                        <p className="p-dashboard__matrix-item-course">{task.course}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a className="p-dashboard__matrix-item-link" href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.delegate.length === 0 && <li className="p-dashboard__matrix-item p-dashboard__matrix-item--empty">Sin tareas de ejecucion rapida</li>}
                                        </ul>
                                    </article>

                                    <article className="p-dashboard__matrix-card" aria-label="No urgente y menos importante">
                                        <header className="p-dashboard__matrix-card-head">
                                            <strong className="p-dashboard__matrix-card-title">Eliminar</strong>
                                            <small className="p-dashboard__matrix-card-subtitle">Reducir ruido</small>
                                        </header>
                                        <ul className="p-dashboard__matrix-list">
                                            {eisenhower.optimize.map((task) => (
                                                <li className="p-dashboard__matrix-item" key={`optimize-${task.course}-${task.title}`}>
                                                    <section className="p-dashboard__matrix-item-copy">
                                                        <h4 className="p-dashboard__matrix-item-title">{task.title}</h4>
                                                        <p className="p-dashboard__matrix-item-course">{task.course}</p>
                                                    </section>
                                                    {task.link && (
                                                        <a className="p-dashboard__matrix-item-link" href={task.link} target="_blank" rel="noreferrer">
                                                            Ir
                                                        </a>
                                                    )}
                                                </li>
                                            ))}
                                            {eisenhower.optimize.length === 0 && <li className="p-dashboard__matrix-item p-dashboard__matrix-item--empty">Sin tareas para optimizar</li>}
                                        </ul>
                                    </article>
                                </section>
                            </section>
                        </section>

                        <aside className="p-dashboard__timeline" aria-labelledby="timeline-title" ref={timelineContainerRef}>
                            <header className="p-dashboard__timeline-header">
                                <h2 id="timeline-title" className="p-dashboard__timeline-title">Linea de tiempo</h2>
                            </header>
                            <ol
                                className="p-dashboard__timeline-list"
                                ref={timelineListRef}
                                style={{
                                    ...(timelineMaxHeight ? { maxHeight: `${timelineMaxHeight}px` } : {}),
                                    marginTop: `${timelineListOffset}px`,
                                }}
                            >
                                {visibleTimeline.map((event, index) => (
                                    <li
                                        key={`${event.title}-${event.when}-${index}`}
                                        className={event.current ? 'p-dashboard__timeline-item p-dashboard__timeline-item--current' : 'p-dashboard__timeline-item'}
                                    >
                                        <p className="p-dashboard__timeline-time">{event.when}</p>
                                        <h4 className="p-dashboard__timeline-item-title">{event.title}</h4>
                                        <p className="p-dashboard__timeline-item-description">{event.description}</p>
                                        {event.link && (
                                            <a className="p-dashboard__timeline-link" href={event.link} target="_blank" rel="noreferrer">
                                                Ir a la tarea
                                            </a>
                                        )}
                                    </li>
                                ))}

                                {timeline.length === 0 && (
                                    <li>
                                        <p className="p-dashboard__timeline-time">SIN EVENTOS</p>
                                        <h4 className="p-dashboard__timeline-item-title">No hay entregas proximas</h4>
                                        <p className="p-dashboard__timeline-item-description">
                                            {dashboardError
                                                ? dashboardError
                                                : moodleConnected
                                                    ? 'No se encontraron tareas con fecha de entrega.'
                                                    : 'Conecta Moodle para ver tu cronograma.'}
                                        </p>
                                    </li>
                                )}
                            </ol>

                            <div className="p-dashboard__timeline-actions" ref={timelineActionsRef}>
                                {canShowTimelineControls ? (
                                    <>
                                        {hasMoreTimelineItems && (
                                            <button
                                                className="p-dashboard__timeline-more"
                                                type="button"
                                                onClick={() => setVisibleTimelineItems((current) => current + TIMELINE_BATCH_SIZE)}
                                            >
                                                Mostrar mas
                                            </button>
                                        )}

                                        {canShowLessTimelineItems && (
                                            <button
                                                className="p-dashboard__timeline-less"
                                                type="button"
                                                onClick={() =>
                                                    setVisibleTimelineItems((current) => Math.max(TIMELINE_BATCH_SIZE, current - TIMELINE_BATCH_SIZE))
                                                }
                                            >
                                                Mostrar menos
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <Link className="p-dashboard__timeline-more p-dashboard__timeline-more--ghost" href="/asignaturas">
                                        Calendario completo
                                    </Link>
                                )}
                            </div>
                        </aside>
                    </section>
                    )}
                </main>
            </article>
        </>
    );
}
