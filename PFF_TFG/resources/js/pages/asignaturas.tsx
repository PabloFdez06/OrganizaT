import { Head, Link, router } from '@inertiajs/react';
import { useEffect } from 'react';
import AcademiaHeader from '@/components/academia-header';
import AlertError from '@/components/alert-error';
import StatsStrip from '@/components/stats-strip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { toMoodleMediaUrl } from '@/lib/moodle-media';

type CourseCard = {
    id: number;
    code: string;
    title: string;
    meta: string;
    teacher: string;
    image: string | null;
    progress: number;
    tasksTotal: number;
    tasksPending: number;
    variant: 'featured' | 'tall' | 'wide' | 'compact' | 'accent';
};

type AsignaturasProps = {
    moodleConnected: boolean;
    studentName: string | null;
    courseCards: CourseCard[];
    summary: {
        courses: number;
        averageProgress: number;
        highProgress: number;
        pendingTasks: number;
    };
    profileAvatarUrl: string | null;
    pageError: string | null;
    loading: boolean;
};

type LayoutVariant = 'hero' | 'image' | 'violet' | 'night' | 'base';

type ColumnSpan = 1 | 2 | 3;

function buildLayoutSequence(total: number): LayoutVariant[] {
    if (total <= 0) {
        return [];
    }

    const variants: LayoutVariant[] = [];

    for (let index = 0; index < total; index += 1) {
        if (index === 0) {
            variants.push('hero');
            continue;
        }

        const order = index % 5;

        if (order === 1) {
            variants.push('image');
        } else if (order === 2) {
            variants.push('violet');
        } else if (order === 3) {
            variants.push('night');
        } else {
            variants.push('base');
        }
    }

    return variants;
}

function buildColumnSpans(total: number): ColumnSpan[] {
    if (total <= 0) {
        return [];
    }

    if (total === 1) {
        return [3];
    }

    const spans: ColumnSpan[] = Array.from({ length: total }, () => 1);
    spans[0] = 2;

    const usedColumns = spans.reduce((acc, span) => acc + span, 0);
    const remainder = usedColumns % 3;

    if (remainder !== 0) {
        const missingColumns = 3 - remainder;
        const lastIndex = total - 1;
        spans[lastIndex] = Math.min(3, spans[lastIndex] + missingColumns) as ColumnSpan;
    }

    return spans;
}

export default function Asignaturas({ moodleConnected, studentName, courseCards, summary, profileAvatarUrl, pageError, loading }: AsignaturasProps) {
    const variantSequence = buildLayoutSequence(courseCards.length);
    const columnSpans = buildColumnSpans(courseCards.length);

    useEffect(() => {
        if (!moodleConnected || !loading) {
            return;
        }

        const pollInterval = window.setInterval(() => {
            router.reload({
                only: ['studentName', 'courseCards', 'summary', 'profileAvatarUrl', 'pageError', 'loading'],
            });
        }, 2500);

        return () => window.clearInterval(pollInterval);
    }, [loading, moodleConnected]);

    return (
        <>
            <Head title="Asignaturas" />

            <article className="p-asignaturas">
                <AcademiaHeader
                    containerClassName="p-asignaturas__container"
                    activePath="/asignaturas"
                    moodleConnected={moodleConnected}
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-asignaturas__container p-asignaturas__main">
                    <header className="p-asignaturas__hero-head">
                        <section>
                            <h1 className="p-asignaturas__hero-title">
                                ASIGNATURAS
                                <span className="p-asignaturas__hero-title-dot">.</span>
                            </h1>
                        </section>
                    </header>

                    {pageError && <AlertError errors={[pageError]} title="No se pudieron cargar las asignaturas." />}

                    {loading && (
                        <section className="p-asignaturas__loading" aria-live="polite" aria-busy="true">
                            <Alert className="p-asignaturas__loading-alert">
                                <Spinner className="p-asignaturas__loading-spinner" />
                                <AlertTitle>Sincronizando asignaturas</AlertTitle>
                                <AlertDescription>Estamos cargando tus datos de Moodle en segundo plano.</AlertDescription>
                            </Alert>

                            <section className="p-asignaturas__loading-grid">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <article key={`asig-skeleton-${index}`} className="p-asignaturas__loading-card p-asignaturas__course p-asignaturas__course--base">
                                        <section className="p-asignaturas__course-content">
                                            <Skeleton className="p-asignaturas__loading-line p-asignaturas__loading-line--title" />
                                            <Skeleton className="p-asignaturas__loading-line p-asignaturas__loading-line--meta" />
                                            <Skeleton className="p-asignaturas__loading-line p-asignaturas__loading-line--full" />
                                            <Skeleton className="p-asignaturas__loading-line p-asignaturas__loading-line--wide" />
                                        </section>
                                    </article>
                                ))}
                            </section>
                        </section>
                    )}

                    <StatsStrip
                        className="p-asignaturas__summary"
                        ariaLabel="Resumen academico"
                        items={[
                            { label: 'ASIGNATURAS', value: summary.courses },
                            { label: 'PROGRESO MEDIO', value: `${summary.averageProgress}%` },
                            { label: 'ASIGNATURAS >= 75%', value: summary.highProgress, highlight: true },
                            { label: 'TAREAS PENDIENTES', value: summary.pendingTasks },
                        ]}
                    />

                    <section className="p-asignaturas__subjects">
                        <section className="p-asignaturas__grid">
                            {courseCards.map((course, index) => {
                                const variant = variantSequence[index] ?? 'base';
                                const span = columnSpans[index] ?? 1;
                                const courseImageUrl = toMoodleMediaUrl(course.image);
                                const cardVariantClass = course.image && (variant === 'image' || variant === 'base')
                                    ? 'image'
                                    : variant === 'image' && !course.image
                                        ? 'base'
                                        : variant;

                                return (
                                    <Link
                                        key={course.id}
                                        href={`/tareas?subject_id=${course.id}`}
                                        className={`p-asignaturas__course p-asignaturas__course--${cardVariantClass} p-asignaturas__course--span-${span}`}
                                    >
                                        {cardVariantClass === 'hero' && <span className="p-asignaturas__badge">En curso</span>}
                                        {cardVariantClass === 'image' && courseImageUrl && (
                                            <figure className="p-asignaturas__image">
                                                <img className="p-asignaturas__course-image" src={courseImageUrl} alt={`Imagen de ${course.title}`} loading="lazy" />
                                            </figure>
                                        )}

                                        <section className="p-asignaturas__course-content">
                                            <h3 className="p-asignaturas__course-title">{course.title}</h3>

                                            <section className="p-asignaturas__meta">
                                                <span className="p-asignaturas__teacher-label">Docente</span>
                                                <span className="p-asignaturas__teacher">{course.teacher}</span>
                                            </section>

                                            <section className="p-asignaturas__progress" aria-label={`Progreso de ${course.title}`}>
                                                <header className="p-asignaturas__progress-head">
                                                    <span className="p-asignaturas__progress-label">Progreso</span>
                                                    <strong className="p-asignaturas__progress-value">{course.progress}%</strong>
                                                </header>
                                                <span className="p-asignaturas__progress-track" aria-hidden="true">
                                                    <i className="p-asignaturas__progress-fill" style={{ width: `${course.progress}%` }} />
                                                </span>
                                            </section>
                                        </section>
                                    </Link>
                                );
                            })}

                            {!loading && courseCards.length === 0 && (
                                <article className="p-asignaturas__empty">
                                    <h3 className="p-asignaturas__empty-title">Sin asignaturas disponibles</h3>
                                    <p className="p-asignaturas__empty-description">
                                        {moodleConnected
                                            ? 'No se encontraron asignaturas en Moodle para esta cuenta.'
                                            : 'Conecta Moodle para cargar todas tus asignaturas.'}
                                    </p>
                                </article>
                            )}
                        </section>
                    </section>
                </main>
            </article>
        </>
    );
}
