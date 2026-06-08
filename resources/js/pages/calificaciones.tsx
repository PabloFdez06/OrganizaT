import { Head, router } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { downloadReport } from '@/actions/App/Http/Controllers/CalificacionesController';
import AcademiaHeader from '@/components/academia-header';
import AlertError from '@/components/alert-error';
import FeedbackContent from '@/components/feedback-content';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { formatFeedbackToBlocks } from '@/lib/feedback-parser';

type SubjectTask = {
    name: string;
    grade: string;
    isNumeric?: boolean;
    feedback?: string | null;
    url?: string | null;
    linkTitle?: boolean;
};

type SubjectUnit = {
    name: string;
    tasks: SubjectTask[];
};

type SubjectCard = {
    id: number;
    code: string;
    subject: string;
    teacher: string;
    gradedCount: number;
    units: SubjectUnit[];
    variant: 'large' | 'small' | 'wide' | 'compact' | 'accent';
    accent?: boolean;
};

type CalificacionesProps = {
    moodleConnected: boolean;
    studentName: string | null;
    profileAvatarUrl: string | null;
    subjectCards: SubjectCard[];
    summary: {
        subjects: number;
        gradedItems: number;
        subjectsWithGrades: number;
    };
    milestones: Array<{
        dateLabel: string;
        title: string;
        subject: string;
        link: string | null;
        kind: string;
    }>;
    pageError: string | null;
    loading: boolean;
};

type FeedbackModalData = {
    subject: string;
    unit: string;
    task: string;
    feedback: string;
};

function parseNumericGrade(grade: string): number | null {
    const normalized = grade.replace(',', '.').trim();

    if (normalized === '' || normalized === '-') {
        return null;
    }

    const ratioMatch = normalized.match(
        /([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)/,
    );

    if (ratioMatch) {
        const value = Number.parseFloat(ratioMatch[1]);
        const base = Number.parseFloat(ratioMatch[2]);

        if (Number.isNaN(value) || Number.isNaN(base) || base <= 0) {
            return null;
        }

        // Some sources may fallback to x/10 while x is actually a percentage.
        if (base === 10 && value > 10 && value <= 100) {
            return value / 10;
        }

        return (value / base) * 10;
    }

    const textualScaleMatch = normalized.match(
        /([0-9]+(?:\.[0-9]+)?)\s*(?:de|sobre|out\s+of)\s*([0-9]+(?:\.[0-9]+)?)/i,
    );

    if (textualScaleMatch) {
        const value = Number.parseFloat(textualScaleMatch[1]);
        const base = Number.parseFloat(textualScaleMatch[2]);

        if (Number.isNaN(value) || Number.isNaN(base) || base <= 0) {
            return null;
        }

        return (value / base) * 10;
    }

    const percentMatch = normalized.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);

    if (percentMatch) {
        const value = Number.parseFloat(percentMatch[1]);

        if (Number.isNaN(value)) {
            return null;
        }

        return value / 10;
    }

    const plainMatch = normalized.match(/^([0-9]+(?:\.[0-9]+)?)$/);

    if (plainMatch) {
        const value = Number.parseFloat(plainMatch[1]);

        if (Number.isNaN(value)) {
            return null;
        }

        // Handle percentage-like grades where Moodle returns 0-100 without denominator.
        if (value > 10 && value <= 100) {
            return value / 10;
        }

        return value;
    }

    return null;
}

function formatOneDecimal(value: number): string {
    return value.toFixed(1);
}

function getModuleLabel(code: string, index: number): string {
    const numericMatch = code.match(/(\d+)/);
    const moduleNumber = numericMatch
        ? Number.parseInt(numericMatch[1], 10)
        : index + 1;

    return `MODULO ${moduleNumber.toString().padStart(2, '0')}`;
}

export default function Calificaciones({
    moodleConnected,
    studentName,
    profileAvatarUrl,
    subjectCards,
    summary,
    pageError,
    loading,
}: CalificacionesProps) {
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(
        subjectCards[0]?.id ?? null,
    );
    const [visibleSubjectsCount, setVisibleSubjectsCount] = useState(4);
    const [visibleFeaturedTasksCount, setVisibleFeaturedTasksCount] =
        useState(4);
    const [selectedFeedback, setSelectedFeedback] =
        useState<FeedbackModalData | null>(null);

    const formattedFeedbackBlocks = useMemo(
        () =>
            selectedFeedback
                ? formatFeedbackToBlocks(selectedFeedback.feedback)
                : [],
        [selectedFeedback],
    );

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
                    'profileAvatarUrl',
                    'subjectCards',
                    'summary',
                    'milestones',
                    'pageError',
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

    const featuredSubject = useMemo(() => {
        if (selectedSubjectId === null) {
            return subjectCards[0] ?? null;
        }

        return (
            subjectCards.find((subject) => subject.id === selectedSubjectId) ??
            subjectCards[0] ??
            null
        );
    }, [selectedSubjectId, subjectCards]);

    const globalAverage = useMemo(() => {
        const grades = subjectCards
            .flatMap((subject) =>
                subject.units.flatMap((unit) =>
                    unit.tasks.map((task) => parseNumericGrade(task.grade)),
                ),
            )
            .filter((grade): grade is number => grade !== null);

        if (grades.length === 0) {
            return null;
        }

        const average =
            grades.reduce((acc, grade) => acc + grade, 0) / grades.length;

        return Number.parseFloat(formatOneDecimal(average));
    }, [subjectCards]);

    const subjectAverages = useMemo(() => {
        return subjectCards.map((subject) => {
            const subjectGrades = subject.units
                .flatMap((unit) =>
                    unit.tasks.map((task) => parseNumericGrade(task.grade)),
                )
                .filter((grade): grade is number => grade !== null);

            if (subjectGrades.length === 0) {
                return {
                    id: subject.id,
                    average: null,
                    isGraded: false,
                };
            }

            return {
                id: subject.id,
                average:
                    subjectGrades.reduce((acc, grade) => acc + grade, 0) /
                    subjectGrades.length,
                isGraded: true,
            };
        });
    }, [subjectCards]);

    const gradedSubjects =
        summary.subjectsWithGrades > 0
            ? summary.subjectsWithGrades
            : subjectAverages.filter((subject) => subject.isGraded).length;
    const approvedSubjects = subjectAverages.filter(
        (subject) => subject.average !== null && subject.average >= 5,
    ).length;

    const totalSubjects = summary.subjects;

    const visibleSubjects = subjectCards.slice(0, visibleSubjectsCount);
    const canShowMoreSubjects = visibleSubjectsCount < subjectCards.length;
    const canShowLessSubjects = visibleSubjectsCount > 4;

    const featuredTasks =
        featuredSubject?.units.flatMap((unit, unitIndex) =>
            unit.tasks.map((task) => ({
                ...task,
                unitLabel: `UNIDAD ${(unitIndex + 1).toString().padStart(2, '0')}`,
                unitName: unit.name,
            })),
        ) ?? [];
    const visibleFeaturedTasks = featuredTasks.slice(
        0,
        visibleFeaturedTasksCount,
    );
    const hasMoreFeaturedTasks =
        visibleFeaturedTasksCount < featuredTasks.length;
    const canCollapseFeaturedTasks = visibleFeaturedTasksCount > 4;
    const featuredScore =
        subjectAverages.find((subject) => subject.id === featuredSubject?.id)
            ?.average ?? null;
    const scoredFeaturedTasksCount = featuredTasks.filter(
        (task) => parseNumericGrade(task.grade) !== null,
    ).length;
    const featuredSuccessRate =
        featuredTasks.length > 0
            ? Math.round(
                  (scoredFeaturedTasksCount / featuredTasks.length) * 100,
              )
            : 0;
    /*     const featuredDescription = featuredTasks.length > 0
        ? featuredTasks.slice(0, 2).map((task) => task.name).join(', ')
        : 'Sin actividades calificadas por el momento.';
 */
    const chartItems = subjectAverages.map((subject) => {
        const value = subject.average ?? 0;

        return {
            id: subject.id,
            subject:
                subjectCards.find((card) => card.id === subject.id)?.subject ??
                'Asignatura',
            value,
            heightPercent: value <= 0 ? 12 : Math.max((value / 10) * 100, 14),
        };
    });
    const isChartScrollable = chartItems.length > 10;

    const handleSelectSubject = (id: number) => {
        setSelectedSubjectId(id);
        setVisibleFeaturedTasksCount(4);
    };

    return (
        <>
            <Head title="Calificaciones" />

            <article className="p-calificaciones">
                <AcademiaHeader
                    containerClassName="p-calificaciones__container"
                    activePath="/calificaciones"
                    moodleConnected={moodleConnected}
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-calificaciones__container p-calificaciones__main">
                    <header
                        className="p-calificaciones__hero"
                        aria-label="Cabecera de calificaciones"
                    >
                        <section className="p-calificaciones__hero-title">
                            <h1 className="p-calificaciones__hero-heading">
                                CALIFICACIONES
                                <span className="p-calificaciones__hero-heading-dot">
                                    .
                                </span>
                            </h1>
                        </section>

                        <section
                            className="p-calificaciones__hero-stats"
                            aria-label="Resumen de calificaciones"
                        >
                            <article className="p-calificaciones__metric p-calificaciones__metric--average">
                                <small className="p-calificaciones__metric-label">
                                    MEDIA
                                </small>
                                <strong className="p-calificaciones__metric-value p-calificaciones__metric-value--highlight">
                                    {globalAverage === null
                                        ? '--'
                                        : globalAverage.toFixed(2)}
                                </strong>
                            </article>

                            <article className="p-calificaciones__metric p-calificaciones__metric--middle">
                                <small className="p-calificaciones__metric-label">
                                    APROBADAS
                                </small>
                                <strong className="p-calificaciones__metric-value">
                                    {approvedSubjects}/
                                    {Math.max(gradedSubjects, 0)}
                                </strong>
                            </article>

                            <article className="p-calificaciones__metric">
                                <small className="p-calificaciones__metric-label">
                                    ASIGNATURAS CALIFICADAS
                                </small>
                                <strong className="p-calificaciones__metric-value">
                                    {gradedSubjects}/
                                    {Math.max(totalSubjects, 0)}
                                </strong>
                            </article>
                        </section>
                    </header>

                    {pageError && (
                        <AlertError
                            errors={[pageError]}
                            title="No se pudieron cargar las calificaciones."
                        />
                    )}

                    {loading && (
                        <section
                            className="p-calificaciones__loading"
                            aria-live="polite"
                            aria-busy="true"
                        >
                            <Alert className="p-calificaciones__loading-alert">
                                <Spinner className="p-calificaciones__loading-spinner" />
                                <AlertTitle>
                                    Sincronizando calificaciones
                                </AlertTitle>
                                <AlertDescription>
                                    Estamos actualizando notas, resumen y
                                    detalle por asignatura.
                                </AlertDescription>
                            </Alert>

                            <section className="p-calificaciones__loading-grid p-calificaciones__workspace">
                                <aside className="p-calificaciones__loading-rail p-calificaciones__left-rail">
                                    <Skeleton className="p-calificaciones__loading-line p-calificaciones__loading-line--rail-title" />
                                    <Skeleton className="p-calificaciones__loading-block p-calificaciones__loading-block--rail" />
                                    <Skeleton className="p-calificaciones__loading-block p-calificaciones__loading-block--rail" />
                                </aside>
                                <article className="p-calificaciones__loading-detail p-calificaciones__detail">
                                    <Skeleton className="p-calificaciones__loading-line p-calificaciones__loading-line--detail-title" />
                                    <Skeleton className="p-calificaciones__loading-line p-calificaciones__loading-line--detail-subtitle" />
                                    <Skeleton className="p-calificaciones__loading-block p-calificaciones__loading-block--detail" />
                                    <Skeleton className="p-calificaciones__loading-block p-calificaciones__loading-block--detail" />
                                </article>
                            </section>
                        </section>
                    )}

                    {!loading && subjectCards.length > 0 && featuredSubject && (
                        <section className="p-calificaciones__workspace">
                            <aside
                                className="p-calificaciones__left-rail"
                                aria-label="Listado de asignaturas"
                            >
                                <header className="p-calificaciones__rail-head">
                                    <h2 className="p-calificaciones__rail-title">
                                        ASIGNATURAS
                                    </h2>
                                </header>

                                <section className="p-calificaciones__subject-scroll">
                                    {visibleSubjects.map((card, index) => {
                                        const score =
                                            subjectAverages.find(
                                                (subject) =>
                                                    subject.id === card.id,
                                            )?.average ?? null;
                                        const isActive =
                                            card.id === featuredSubject.id;

                                        return (
                                            <button
                                                key={card.id}
                                                type="button"
                                                className={`p-calificaciones__subject-item ${isActive ? 'p-calificaciones__subject-item--active' : ''}`}
                                                onClick={() =>
                                                    handleSelectSubject(card.id)
                                                }
                                            >
                                                <section className="p-calificaciones__subject-item-info">
                                                    <small className="p-calificaciones__subject-item-module">
                                                        {getModuleLabel(
                                                            card.code,
                                                            index,
                                                        )}
                                                    </small>
                                                    <h3 className="p-calificaciones__subject-item-name">
                                                        {card.subject}
                                                    </h3>
                                                </section>
                                                <section className="p-calificaciones__subject-item-score">
                                                    <strong className="p-calificaciones__subject-item-score-value">
                                                        {score !== null
                                                            ? formatOneDecimal(
                                                                  score,
                                                              )
                                                            : '0.0'}
                                                    </strong>
                                                    <ChevronRight
                                                        size={14}
                                                        aria-hidden="true"
                                                        className="p-calificaciones__subject-item-score-icon"
                                                    />
                                                </section>
                                            </button>
                                        );
                                    })}
                                </section>

                                {(canShowMoreSubjects ||
                                    canShowLessSubjects) && (
                                    <section className="p-calificaciones__subject-menu-actions">
                                        {canShowMoreSubjects && (
                                            <button
                                                type="button"
                                                className={`p-calificaciones__subject-menu-toggle ${canShowLessSubjects ? 'p-calificaciones__subject-menu-toggle--with-less' : ''}`}
                                                onClick={() =>
                                                    setVisibleSubjectsCount(
                                                        (prev) =>
                                                            Math.min(
                                                                prev + 3,
                                                                subjectCards.length,
                                                            ),
                                                    )
                                                }
                                            >
                                                Mostrar mas
                                            </button>
                                        )}

                                        {canShowLessSubjects && (
                                            <button
                                                type="button"
                                                className="p-calificaciones__subject-menu-toggle p-calificaciones__subject-menu-toggle--secondary"
                                                onClick={() =>
                                                    setVisibleSubjectsCount(4)
                                                }
                                            >
                                                Mostrar menos
                                            </button>
                                        )}
                                    </section>
                                )}

                                <section
                                    className="p-calificaciones__chart-card"
                                    aria-label="Grafico de notas por asignatura"
                                >
                                    <small className="p-calificaciones__chart-caption">
                                        Visualicación técnica de progreso
                                    </small>
                                    <section
                                        className={`p-calificaciones__chart ${isChartScrollable ? 'p-calificaciones__chart--scrollable' : ''}`}
                                        role="img"
                                        aria-label="Notas de todas las asignaturas en escala de 0 a 10"
                                    >
                                        {chartItems.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className={`p-calificaciones__chart-bar ${item.id === featuredSubject.id ? 'p-calificaciones__chart-bar--selected' : ''}`}
                                                style={{
                                                    height: `${item.heightPercent}%`,
                                                }}
                                                title={`${item.subject}: ${formatOneDecimal(item.value)} / 10`}
                                                aria-label={`${item.subject}: ${formatOneDecimal(item.value)} sobre 10`}
                                                data-tooltip={`${item.subject}: ${formatOneDecimal(item.value)} / 10`}
                                                onClick={() =>
                                                    handleSelectSubject(item.id)
                                                }
                                            />
                                        ))}
                                    </section>
                                </section>
                            </aside>

                            <article className="p-calificaciones__detail">
                                <header className="p-calificaciones__detail-head">
                                    <svg
                                        className="p-calificaciones__detail-head-art"
                                        viewBox="0 0 360 170"
                                        fill="none"
                                        aria-hidden="true"
                                        focusable="false"
                                    >
                                        <path
                                            d="M20 30C76 10 126 16 170 42C216 69 248 112 286 127C311 137 333 136 350 131"
                                            stroke="currentColor"
                                            strokeOpacity="0.38"
                                            strokeWidth="14"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M12 114C58 95 105 102 146 124C188 146 224 157 260 154"
                                            stroke="currentColor"
                                            strokeOpacity="0.28"
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                        />
                                        <circle
                                            cx="302"
                                            cy="40"
                                            r="18"
                                            fill="currentColor"
                                            fillOpacity="0.22"
                                        />
                                        <circle
                                            cx="302"
                                            cy="40"
                                            r="28"
                                            stroke="currentColor"
                                            strokeOpacity="0.2"
                                            strokeWidth="2"
                                        />
                                        <rect
                                            x="228"
                                            y="20"
                                            width="10"
                                            height="10"
                                            rx="5"
                                            fill="currentColor"
                                            fillOpacity="0.3"
                                        />
                                    </svg>
                                    <section className="p-calificaciones__detail-head-main">
                                        <small className="p-calificaciones__detail-eyebrow">
                                            Selección activa
                                        </small>
                                        <h2 className="p-calificaciones__detail-title">
                                            {featuredSubject.subject}
                                        </h2>
                                    </section>

                                    <section className="p-calificaciones__detail-score">
                                        <small className="p-calificaciones__detail-eyebrow p-calificaciones__detail-eyebrow--score">
                                            Media
                                        </small>
                                        <strong className="p-calificaciones__detail-score-value">
                                            {featuredScore === null
                                                ? '0.0'
                                                : formatOneDecimal(
                                                      featuredScore,
                                                  )}
                                        </strong>
                                    </section>
                                </header>

                                <section
                                    className="p-calificaciones__details"
                                    aria-label={`Detalle ${featuredSubject.subject}`}
                                >
                                    {featuredSubject.units.length > 0 ? (
                                        visibleFeaturedTasks.map((task) => (
                                            <section
                                                className="p-calificaciones__unit"
                                                key={`${task.unitName}-${task.name}`}
                                            >
                                                <ul className="p-calificaciones__task-list">
                                                    <li className="p-calificaciones__task-item">
                                                        <section className="p-calificaciones__task-row">
                                                            <small className="p-calificaciones__task-unit-label">
                                                                {task.unitLabel}
                                                            </small>
                                                            <section className="p-calificaciones__task-content">
                                                                {task.linkTitle &&
                                                                task.url ? (
                                                                    <a
                                                                        className="p-calificaciones__task-name"
                                                                        href={
                                                                            task.url
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        {
                                                                            task.name
                                                                        }
                                                                    </a>
                                                                ) : (
                                                                    <span className="p-calificaciones__task-name">
                                                                        {
                                                                            task.name
                                                                        }
                                                                    </span>
                                                                )}
                                                            </section>
                                                            <section className="p-calificaciones__task-actions">
                                                                {task.feedback && (
                                                                    <button
                                                                        className="p-calificaciones__feedback-btn"
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setSelectedFeedback(
                                                                                {
                                                                                    subject:
                                                                                        featuredSubject.subject,
                                                                                    unit: task.unitName,
                                                                                    task: task.name,
                                                                                    feedback:
                                                                                        task.feedback as string,
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        Ver
                                                                        retroalimentacion
                                                                    </button>
                                                                )}
                                                                <strong
                                                                    className={
                                                                        task.isNumeric
                                                                            ? 'p-calificaciones__grade--numeric'
                                                                            : 'p-calificaciones__grade--text'
                                                                    }
                                                                >
                                                                    {task.grade}
                                                                </strong>
                                                            </section>
                                                        </section>
                                                    </li>
                                                </ul>
                                            </section>
                                        ))
                                    ) : (
                                        <p className="p-calificaciones__no-grades">
                                            Sin tareas calificadas en esta
                                            asignatura.
                                        </p>
                                    )}

                                    {(hasMoreFeaturedTasks ||
                                        canCollapseFeaturedTasks) && (
                                        <section className="p-calificaciones__tasks-actions">
                                            {hasMoreFeaturedTasks && (
                                                <button
                                                    type="button"
                                                    className="p-calificaciones__subject-menu-toggle"
                                                    onClick={() =>
                                                        setVisibleFeaturedTasksCount(
                                                            (prev) =>
                                                                Math.min(
                                                                    prev + 4,
                                                                    featuredTasks.length,
                                                                ),
                                                        )
                                                    }
                                                >
                                                    Mostrar mas notas
                                                </button>
                                            )}
                                            {canCollapseFeaturedTasks && (
                                                <button
                                                    type="button"
                                                    className="p-calificaciones__subject-menu-toggle p-calificaciones__subject-menu-toggle--secondary"
                                                    onClick={() =>
                                                        setVisibleFeaturedTasksCount(
                                                            4,
                                                        )
                                                    }
                                                >
                                                    Mostrar menos
                                                </button>
                                            )}
                                        </section>
                                    )}
                                </section>

                                <footer className="p-calificaciones__detail-footer">
                                    <section className="p-calificaciones__detail-footer-progress">
                                        <small className="p-calificaciones__detail-eyebrow">
                                            Porcentaje de trabajo
                                        </small>
                                        <p className="p-calificaciones__detail-footer-progress-value">
                                            {featuredSuccessRate}% realizado
                                        </p>
                                    </section>
                                    <section className="p-calificaciones__report-actions">
                                        <a
                                            className="p-calificaciones__report-btn p-calificaciones__report-btn--secondary"
                                            href={downloadReport.url({
                                                query: {
                                                    subject_id:
                                                        featuredSubject.id,
                                                },
                                            })}
                                        >
                                            Descargar reporte asignatura
                                        </a>
                                        <a
                                            className="p-calificaciones__report-btn"
                                            href={downloadReport.url()}
                                        >
                                            Descargar reporte completo
                                        </a>
                                    </section>
                                </footer>
                            </article>
                        </section>
                    )}

                    {!loading && subjectCards.length === 0 && (
                        <article className="p-calificaciones__empty">
                            <h3>Sin calificaciones disponibles</h3>
                            <p>
                                {moodleConnected
                                    ? 'No se encontraron registros de calificaciones para esta cuenta.'
                                    : 'Conecta Moodle para cargar tus calificaciones.'}
                            </p>
                        </article>
                    )}

                    {selectedFeedback && (
                        <section
                            className="p-calificaciones__feedback-modal-wrapper"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="feedback-modal-title"
                        >
                            <button
                                type="button"
                                className="p-calificaciones__feedback-modal-backdrop"
                                onClick={() => setSelectedFeedback(null)}
                                aria-label="Cerrar modal de retroalimentacion"
                            />
                            <article className="p-calificaciones__feedback-modal">
                                <header className="p-calificaciones__feedback-modal-header">
                                    <section className="p-calificaciones__feedback-modal-title-block">
                                        <h3 id="feedback-modal-title">
                                            {selectedFeedback.task}
                                        </h3>
                                        <p className="p-calificaciones__feedback-modal-subtitle">
                                            {selectedFeedback.subject} ·{' '}
                                            {selectedFeedback.unit}
                                        </p>
                                    </section>
                                    <button
                                        type="button"
                                        className="p-calificaciones__feedback-modal-close"
                                        onClick={() =>
                                            setSelectedFeedback(null)
                                        }
                                    >
                                        Cerrar
                                    </button>
                                </header>
                                <section className="p-calificaciones__feedback-content">
                                    <FeedbackContent
                                        blocks={formattedFeedbackBlocks}
                                    />
                                </section>
                            </article>
                        </section>
                    )}
                </main>
            </article>
        </>
    );
}
