import { Head, router } from '@inertiajs/react';
import { ArrowRight, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import AcademiaHeader from '@/components/academia-header';
import AlertError from '@/components/alert-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

type TaskItem = {
    id: string;
    name: string;
    courseName: string;
    unitName: string;
    statusKey: 'pending' | 'delivered' | 'graded' | 'expired';
    statusLabel: string;
    statusTone: 'pending' | 'critical' | 'delivered' | 'expired' | 'graded';
    dueLabel: string;
    url: string | null;
};

type SubjectUnit = {
    name: string;
    tasks: TaskItem[];
};

type SubjectCard = {
    id: number;
    code: string;
    subject: string;
    teacher: string;
    image: string | null;
    totalTasks: number;
    pendingTasks: number;
    upcomingTasks: number;
    completionRate: number;
    units: SubjectUnit[];
};

type TareasProps = {
    moodleConnected: boolean;
    studentName: string | null;
    profileAvatarUrl: string | null;
    subjectCards: SubjectCard[];
    tasksByDate: Record<string, TaskItem[]>;
    summary: {
        pending: number;
        upcoming: number;
        complianceRate: number;
    };
    initialSubjectId: number | null;
    calendar: {
        initialMonth: string;
        selectedDate: string;
    };
    pageError: string | null;
    loading: boolean;
};

type CalendarCell = {
    iso: string;
    day: number;
    isCurrentMonth: boolean;
    markerTone: 'pending' | 'critical' | 'delivered' | 'expired' | 'graded' | null;
    taskCount: number;
};

const TASK_BATCH_SIZE = 5;
const SIDE_CARD_MIN_WIDTH_REM = 15;
const SIDE_GRID_GAP_REM = 1;
const FALLBACK_ROOT_FONT_SIZE_PX = 16;
const FEATURED_SUBJECT_HERO_IMAGE = '/imgs/subject-hero.png';

function calculateSubjectsPerRow(containerWidthPx: number, rootFontSizePx: number): number {
    const minCardWidthPx = SIDE_CARD_MIN_WIDTH_REM * rootFontSizePx;
    const gapPx = SIDE_GRID_GAP_REM * rootFontSizePx;
    const raw = Math.floor((containerWidthPx + gapPx) / (minCardWidthPx + gapPx));

    return Math.max(1, raw);
}

function parseIsoDate(value: string): Date {
    return new Date(`${value}T00:00:00`);
}

function formatLocalIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatMonthLabel(date: Date): string {
    return date.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
    }).toUpperCase();
}

function buildMonthDate(monthValue: string): Date {
    const [year, month] = monthValue.split('-').map((part) => Number.parseInt(part, 10));

    return new Date(year, (month || 1) - 1, 1);
}

function monthToKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');

    return `${year}-${month}`;
}

function shiftMonth(base: Date, delta: number): Date {
    return new Date(base.getFullYear(), base.getMonth() + delta, 1);
}

function getMondayFirstDay(date: Date): number {
    const weekDay = date.getDay();

    return weekDay === 0 ? 6 : weekDay - 1;
}

function buildCalendarCells(monthDate: Date, tasksByDate: Record<string, TaskItem[]>): CalendarCell[] {
    const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const daysToSubtract = getMondayFirstDay(firstOfMonth);
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - daysToSubtract);

    const cells: CalendarCell[] = [];

    for (let index = 0; index < 42; index += 1) {
        const current = new Date(gridStart);
        current.setDate(gridStart.getDate() + index);

        const iso = formatLocalIsoDate(current);
        const dayTasks = tasksByDate[iso] ?? [];

        let markerTone: CalendarCell['markerTone'] = null;

        if (dayTasks.some((task) => task.statusTone === 'expired')) {
            markerTone = 'expired';
        } else if (dayTasks.some((task) => task.statusTone === 'critical')) {
            markerTone = 'critical';
        } else if (dayTasks.some((task) => task.statusTone === 'pending')) {
            markerTone = 'pending';
        } else if (dayTasks.some((task) => task.statusTone === 'graded')) {
            markerTone = 'graded';
        } else if (dayTasks.length > 0) {
            markerTone = 'delivered';
        }

        cells.push({
            iso,
            day: current.getDate(),
            isCurrentMonth: current.getMonth() === monthDate.getMonth(),
            markerTone,
            taskCount: dayTasks.length,
        });
    }

    return cells;
}

function pickMonthDateSelection(monthDate: Date, tasksByDate: Record<string, TaskItem[]>): string {
    const monthKey = monthToKey(monthDate);
    const dayWithTasks = Object.keys(tasksByDate)
        .filter((dateKey) => dateKey.startsWith(monthKey))
        .sort()[0];

    if (dayWithTasks) {
        return dayWithTasks;
    }

    const fallback = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);

    return formatLocalIsoDate(fallback);
}

function flattenSubjectTasks(subject: SubjectCard | null): TaskItem[] {
    if (!subject) {
        return [];
    }

    return subject.units.flatMap((unit) => unit.tasks.map((task) => ({ ...task, unitName: unit.name })));
}

function buildStatusClass(baseClass: string, statusKey: TaskItem['statusKey'], statusTone: TaskItem['statusTone']): string {
    if (statusKey === 'expired' || statusTone === 'expired') {
        return `${baseClass} ${baseClass}--expired`;
    }

    if (statusKey === 'graded') {
        return `${baseClass} ${baseClass}--graded`;
    }

    if (statusKey === 'delivered') {
        return `${baseClass} ${baseClass}--delivered`;
    }

    if (statusTone === 'critical') {
        return `${baseClass} ${baseClass}--critical`;
    }

    return `${baseClass} ${baseClass}--pending`;
}

function buildSubjectMediaStyle(subject: SubjectCard): React.CSSProperties {
    if (subject.image) {
        const safeUrl = subject.image.replace(/'/g, "\\'");

        return {
            backgroundImage: `linear-gradient(160deg, rgba(15, 23, 42, 0.18), rgba(15, 23, 42, 0.55)), url('${safeUrl}')`,
        };
    }

    return {};
}

export default function Tareas({
    moodleConnected,
    studentName,
    profileAvatarUrl,
    subjectCards,
    tasksByDate,
    initialSubjectId,
    calendar,
    pageError,
    loading,
}: TareasProps) {
    const sideGridRef = useRef<HTMLElement | null>(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(initialSubjectId ?? subjectCards[0]?.id ?? null);
    const [selectedDate, setSelectedDate] = useState<string>(calendar.selectedDate);
    const [calendarMonth, setCalendarMonth] = useState<Date>(buildMonthDate(calendar.initialMonth));
    const [subjectsPerRow, setSubjectsPerRow] = useState<number>(1);
    const [visibleSubjectCount, setVisibleSubjectCount] = useState<number>(1);
    const [visibleTaskCountBySubject, setVisibleTaskCountBySubject] = useState<Record<number, number>>(() =>
        subjectCards.reduce<Record<number, number>>((acc, subject) => {
            acc[subject.id] = TASK_BATCH_SIZE;

            return acc;
        }, {}),
    );

    const featuredSubject = useMemo(() => {
        if (selectedSubjectId === null) {
            return subjectCards[0] ?? null;
        }

        return subjectCards.find((subject) => subject.id === selectedSubjectId) ?? subjectCards[0] ?? null;
    }, [selectedSubjectId, subjectCards]);

    const sideSubjects = useMemo(
        () => subjectCards.filter((subject) => featuredSubject === null || subject.id !== featuredSubject.id),
        [featuredSubject, subjectCards],
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
                    'tasksByDate',
                    'summary',
                    'initialSubjectId',
                    'calendar',
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

    useEffect(() => {
        const updateSubjectsPerRow = () => {
            const sideGrid = sideGridRef.current;

            if (!sideGrid) {
                return;
            }

            const computedRootFont = window.getComputedStyle(document.documentElement).fontSize;
            const parsedRootFont = Number.parseFloat(computedRootFont);
            const rootFontSizePx = Number.isFinite(parsedRootFont) && parsedRootFont > 0
                ? parsedRootFont
                : FALLBACK_ROOT_FONT_SIZE_PX;
            const perRow = calculateSubjectsPerRow(sideGrid.clientWidth, rootFontSizePx);

            setSubjectsPerRow(perRow);
            setVisibleSubjectCount((previous) => {
                const firstRowCount = Math.min(perRow, sideSubjects.length);

                if (previous < firstRowCount) {
                    return firstRowCount;
                }

                return Math.min(previous, sideSubjects.length);
            });
        };

        updateSubjectsPerRow();
        window.addEventListener('resize', updateSubjectsPerRow);

        return () => {
            window.removeEventListener('resize', updateSubjectsPerRow);
        };
    }, [sideSubjects.length]);

    const minimumVisibleSubjects = Math.min(subjectsPerRow, sideSubjects.length);
    const visibleSideSubjects = sideSubjects.slice(0, visibleSubjectCount);
    const canLoadMoreSubjects = visibleSideSubjects.length < sideSubjects.length;
    const canLoadLessSubjects = visibleSideSubjects.length > minimumVisibleSubjects;

    const featuredTasks = useMemo(() => flattenSubjectTasks(featuredSubject), [featuredSubject]);

    const visibleTaskCount = featuredSubject ? (visibleTaskCountBySubject[featuredSubject.id] ?? TASK_BATCH_SIZE) : TASK_BATCH_SIZE;
    const visibleTasks = featuredTasks.slice(0, visibleTaskCount);
    const canLoadMoreTasks = featuredTasks.length > visibleTaskCount;
    const canLoadLessTasks = visibleTaskCount > TASK_BATCH_SIZE;

    const calendarCells = useMemo(() => buildCalendarCells(calendarMonth, tasksByDate), [calendarMonth, tasksByDate]);

    const dayAgenda = tasksByDate[selectedDate] ?? [];
    const selectedDateObject = parseIsoDate(selectedDate);

    const selectedDateDay = selectedDateObject.toLocaleDateString('es-ES', { day: '2-digit' });
    const selectedDateWeekday = selectedDateObject.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase();

    const handleChangeMonth = (delta: number) => {
        const nextMonth = shiftMonth(calendarMonth, delta);
        setCalendarMonth(nextMonth);
        setSelectedDate(pickMonthDateSelection(nextMonth, tasksByDate));
    };

    const handleGoToCurrentMonth = () => {
        const currentMonth = new Date();
        setCalendarMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
        setSelectedDate(pickMonthDateSelection(currentMonth, tasksByDate));
    };

    const handleSelectSubject = (subjectId: number) => {
        setSelectedSubjectId(subjectId);
        setVisibleTaskCountBySubject((previous) => ({
            ...previous,
            [subjectId]: previous[subjectId] ?? TASK_BATCH_SIZE,
        }));
    };

    const handleLoadMoreTasks = () => {
        if (!featuredSubject) {
            return;
        }

        setVisibleTaskCountBySubject((previous) => ({
            ...previous,
            [featuredSubject.id]: (previous[featuredSubject.id] ?? TASK_BATCH_SIZE) + TASK_BATCH_SIZE,
        }));
    };

    const handleLoadLessTasks = () => {
        if (!featuredSubject) {
            return;
        }

        setVisibleTaskCountBySubject((previous) => ({
            ...previous,
            [featuredSubject.id]: Math.max(TASK_BATCH_SIZE, (previous[featuredSubject.id] ?? TASK_BATCH_SIZE) - TASK_BATCH_SIZE),
        }));
    };

    return (
        <>
            <Head title="Tareas" />

            <article className="p-tareas">
                <AcademiaHeader
                    containerClassName="p-tareas__container"
                    activePath="/tareas"
                    moodleConnected={moodleConnected}
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-tareas__container p-tareas__main">
                    <header className="p-tareas__head">
                        <h1 className="p-tareas__heading">
                            GESTION DE TAREAS
                            <span className="p-tareas__heading-dot">.</span>
                        </h1>
                    </header>

                    {pageError && <AlertError errors={[pageError]} title="No se pudieron cargar las tareas." />}

                    {loading && (
                        <section className="p-tareas__loading" aria-live="polite" aria-busy="true">
                            <Alert className="p-tareas__loading-alert">
                                <Spinner className="p-tareas__loading-spinner" />
                                <AlertTitle>Sincronizando tareas</AlertTitle>
                                <AlertDescription>Estamos procesando las tareas y el calendario desde Moodle.</AlertDescription>
                            </Alert>

                            <section className="p-tareas__loading-grid p-tareas__workspace">
                                <article className="p-tareas__loading-featured p-tareas__featured">
                                    <Skeleton className="p-tareas__loading-line p-tareas__loading-line--title" />
                                    <Skeleton className="p-tareas__loading-line p-tareas__loading-line--subtitle" />
                                    <Skeleton className="p-tareas__loading-block p-tareas__loading-block--task" />
                                    <Skeleton className="p-tareas__loading-block p-tareas__loading-block--task" />
                                </article>
                                <article className="p-tareas__loading-calendar p-tareas__calendar">
                                    <Skeleton className="p-tareas__loading-line p-tareas__loading-line--calendar-title" />
                                    <Skeleton className="p-tareas__loading-block p-tareas__loading-block--calendar" />
                                </article>
                            </section>
                        </section>
                    )}

                    {!loading && (featuredSubject ? (
                        <section className="p-tareas__workspace">
                            <section className="p-tareas__subjects-column" aria-label="Asignatura activa y asignaturas disponibles">
                                <article className="p-tareas__featured">
                                    <header className="p-tareas__featured-hero">
                                        <section className="p-tareas__featured-hero-media" aria-hidden="true">
                                            <img className="p-tareas__featured-hero-image" src={FEATURED_SUBJECT_HERO_IMAGE} alt="" />
                                            <i className="p-tareas__featured-hero-saturation" />
                                        </section>

                                        <svg
                                            className="p-tareas__featured-hero-gradient"
                                            viewBox="0 0 100 100"
                                            preserveAspectRatio="none"
                                            aria-hidden="true"
                                            focusable="false"
                                        >
                                            <defs>
                                                <linearGradient id="featured-subject-gradient" x1="0%" y1="50%" x2="100%" y2="50%">
                                                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.9" />
                                                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            <rect x="0" y="0" width="100" height="100" fill="url(#featured-subject-gradient)" />
                                        </svg>

                                        <section className="p-tareas__featured-content">
                                            <small className="p-tareas__featured-code">{featuredSubject.code}</small>
                                            <h2 className="p-tareas__featured-title">{featuredSubject.subject}</h2>
                                        </section>
                                    </header>

                                    <section className="p-tareas__table" aria-label={`Tareas de ${featuredSubject.subject}`}>
                                        <header className="p-tareas__table-head">
                                            <p className="p-tareas__table-head-cell">TAREA</p>
                                            <p className="p-tareas__table-head-cell">FECHA ENTREGA</p>
                                            <p className="p-tareas__table-head-cell">ESTADO</p>
                                            <p className="p-tareas__table-head-cell" aria-hidden="true" />
                                        </header>

                                        <section className="p-tareas__table-body">
                                            {visibleTasks.length > 0 ? (
                                                <ul className="p-tareas__task-list">
                                                    {visibleTasks.map((task, index) => {
                                                        const previousTask = index > 0 ? visibleTasks[index - 1] : null;
                                                        const showUnitSeparator = previousTask === null || previousTask.unitName !== task.unitName;

                                                        return (
                                                            <Fragment key={task.id}>
                                                                {showUnitSeparator && (
                                                                    <li className="p-tareas__task-list-item p-tareas__task-list-item--unit-separator" aria-label={`Unidad ${task.unitName}`}>
                                                                        <span className="p-tareas__unit-separator-label">{task.unitName}</span>
                                                                    </li>
                                                                )}
                                                                <li className="p-tareas__task-list-item">
                                                                    <article className="p-tareas__task-row">
                                                                        <section className="p-tareas__task-main">
                                                                            <h3 className="p-tareas__task-title">{task.name}</h3>
                                                                            <p className="p-tareas__task-module">Modulo: {task.unitName}</p>
                                                                        </section>

                                                                        <p className="p-tareas__task-date">{task.dueLabel}</p>

                                                                        <p className={buildStatusClass('p-tareas__task-status', task.statusKey, task.statusTone)}>
                                                                            {task.statusLabel}
                                                                        </p>

                                                                        {task.url ? (
                                                                            <a className="p-tareas__task-link" href={task.url} target="_blank" rel="noreferrer" aria-label={`Abrir ${task.name} en Moodle`}>
                                                                                <ArrowRight size={16} />
                                                                            </a>
                                                                        ) : (
                                                                            <span className="p-tareas__task-link-disabled" aria-hidden="true">
                                                                                <ArrowRight size={16} />
                                                                            </span>
                                                                        )}
                                                                    </article>
                                                                </li>
                                                            </Fragment>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <p className="p-tareas__empty-inline">
                                                    {moodleConnected
                                                        ? 'No hay tareas disponibles en esta asignatura.'
                                                        : 'Conecta Moodle para cargar tus tareas.'}
                                                </p>
                                            )}
                                        </section>
                                    </section>

                                    {(canLoadMoreTasks || canLoadLessTasks) && (
                                        <footer className="p-tareas__featured-actions">
                                            {canLoadLessTasks && (
                                                <button type="button" className="p-tareas__featured-action-button" onClick={handleLoadLessTasks}>
                                                    CARGAR MENOS TAREAS
                                                </button>
                                            )}
                                            {canLoadMoreTasks && (
                                                <button type="button" className="p-tareas__featured-action-button" onClick={handleLoadMoreTasks}>
                                                    CARGAR MAS TAREAS
                                                </button>
                                            )}
                                        </footer>
                                    )}
                                </article>

                            </section>

                            <aside className="p-tareas__sidebar" aria-label="Calendario y detalle diario">
                                <section className="p-tareas__export-block" aria-label="Exportacion de calendario academico">
                                    {moodleConnected ? (
                                        <a className="p-tareas__export-button" href="/tareas/export-all.ics">
                                            <Download size={16} aria-hidden="true" />
                                            <span>DESCARGAR CALENDARIO (.ICS)</span>
                                        </a>
                                    ) : (
                                        <button type="button" className="p-tareas__export-button p-tareas__export-button--disabled" disabled>
                                            <Download size={16} aria-hidden="true" />
                                            <span>DESCARGAR CALENDARIO (.ICS)</span>
                                        </button>
                                    )}

                                    <p className="p-tareas__export-help">
                                        Compatible con Google Calendar, Apple Calendar y Outlook.
                                    </p>
                                    <p className="p-tareas__export-note">
                                        En Google Calendar: configura e importa el archivo .ics para cargar todas tus tareas.
                                    </p>
                                </section>

                                <article className="p-tareas__calendar">
                                    <header className="p-tareas__calendar-header">
                                        <h3 className="p-tareas__calendar-title">{formatMonthLabel(calendarMonth)}</h3>
                                        <section className="p-tareas__calendar-nav">
                                            <button type="button" className="p-tareas__calendar-nav-button" onClick={() => handleChangeMonth(-1)} aria-label="Mes anterior">
                                                <ChevronLeft size={14} />
                                            </button>
                                            <button type="button" className="p-tareas__calendar-nav-button" onClick={handleGoToCurrentMonth} aria-label="Volver al mes actual">
                                                HOY
                                            </button>
                                            <button type="button" className="p-tareas__calendar-nav-button" onClick={() => handleChangeMonth(1)} aria-label="Mes siguiente">
                                                <ChevronRight size={14} />
                                            </button>
                                        </section>
                                    </header>

                                    <section className="p-tareas__calendar-grid" role="grid" aria-label="Calendario de tareas">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => (
                                            <p key={label} className="p-tareas__calendar-weekday" role="columnheader">{label}</p>
                                        ))}

                                        {calendarCells.map((cell) => {
                                            const isSelected = cell.iso === selectedDate;
                                            const className = [
                                                'p-tareas__calendar-day',
                                                cell.isCurrentMonth ? '' : 'p-tareas__calendar-day--outside',
                                                isSelected ? 'p-tareas__calendar-day--selected' : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' ');

                                            return (
                                                <button
                                                    key={cell.iso}
                                                    type="button"
                                                    role="gridcell"
                                                    className={className}
                                                    aria-selected={isSelected}
                                                    onClick={() => setSelectedDate(cell.iso)}
                                                >
                                                    <span className="p-tareas__calendar-day-label">{`${cell.day}`.padStart(2, '0')}</span>
                                                    {cell.markerTone && <i className={`p-tareas__calendar-day-marker p-tareas__calendar-day-marker--${cell.markerTone}`} aria-hidden="true" />}
                                                </button>
                                            );
                                        })}
                                    </section>
                                </article>

                                <article className="p-tareas__day-detail">
                                    <header className="p-tareas__day-detail-header">
                                        <strong className="p-tareas__day-detail-day">{selectedDateDay}</strong>
                                        <section className="p-tareas__day-detail-meta">
                                            <h4 className="p-tareas__day-detail-weekday">{selectedDateWeekday}</h4>
                                            <p className="p-tareas__day-detail-label">DETALLES DEL DIA</p>
                                        </section>
                                    </header>

                                    <section className="p-tareas__day-list">
                                        {dayAgenda.length > 0 ? (
                                            <ul className="p-tareas__day-list-items">
                                                {dayAgenda.map((task) => (
                                                    <li key={`agenda-${task.id}`} className={`p-tareas__day-list-item p-tareas__day-list-item--${task.statusTone}`}>
                                                        <small className="p-tareas__day-list-time">{task.dueLabel}</small>
                                                        <h5 className="p-tareas__day-list-task">{task.name}</h5>
                                                        <p className="p-tareas__day-list-meta-text">{task.courseName} · {task.unitName}</p>
                                                        <p className={buildStatusClass('p-tareas__day-status', task.statusKey, task.statusTone)}>
                                                            {task.statusLabel}
                                                        </p>
                                                        {task.url && (
                                                            <a className="p-tareas__day-list-link" href={task.url} target="_blank" rel="noreferrer">
                                                                Link en Moodle
                                                            </a>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="p-tareas__empty-inline">
                                                {moodleConnected
                                                    ? 'No hay tareas para esta fecha.'
                                                    : 'Conecta Moodle para visualizar el detalle diario.'}
                                            </p>
                                        )}
                                    </section>
                                </article>
                            </aside>

                            {sideSubjects.length > 0 && (
                                <section className="p-tareas__side-grid" aria-label="Asignaturas contraidas" ref={sideGridRef}>
                                    {visibleSideSubjects.map((subject) => (
                                        <article key={subject.id} className="p-tareas__side-card">
                                            <button type="button" className="p-tareas__side-card-trigger" onClick={() => handleSelectSubject(subject.id)}>
                                                <figure className="p-tareas__side-media" style={buildSubjectMediaStyle(subject)} aria-hidden="true" />
                                                <section className="p-tareas__side-body">
                                                    <small className="p-tareas__side-code">{subject.code}</small>
                                                    <h3 className="p-tareas__side-title">{subject.subject}</h3>
                                                    <footer className="p-tareas__side-footer">
                                                        <p className="p-tareas__side-metrics">
                                                            <strong className="p-tareas__side-count">{subject.totalTasks.toString().padStart(2, '0')}</strong>
                                                            <span className="p-tareas__side-metrics-label">TAREAS</span>
                                                        </p>
                                                        <span className="p-tareas__side-plus" aria-hidden="true">+</span>
                                                    </footer>
                                                </section>
                                            </button>
                                        </article>
                                    ))}

                                    {(canLoadMoreSubjects || canLoadLessSubjects) && (
                                        <section className="p-tareas__side-actions">
                                            {canLoadLessSubjects && (
                                                <button
                                                    type="button"
                                                    className="p-tareas__side-action-button"
                                                    onClick={() =>
                                                        setVisibleSubjectCount((previous) =>
                                                            Math.max(minimumVisibleSubjects, previous - subjectsPerRow),
                                                        )
                                                    }
                                                >
                                                    Ver menos
                                                </button>
                                            )}
                                            {canLoadMoreSubjects && (
                                                <button type="button" className="p-tareas__side-action-button" onClick={() => setVisibleSubjectCount((previous) => previous + subjectsPerRow)}>
                                                    Ver mas
                                                </button>
                                            )}
                                        </section>
                                    )}
                                </section>
                            )}
                        </section>
                    ) : (
                        <article className="p-tareas__empty">
                            <h3 className="p-tareas__empty-title">Sin tareas disponibles</h3>
                            <p className="p-tareas__empty-description">
                                {moodleConnected
                                    ? 'No se encontraron tareas para esta cuenta en Moodle.'
                                    : 'Conecta Moodle para cargar tus tareas por asignatura.'}
                            </p>
                        </article>
                    ))}
                </main>
            </article>
        </>
    );
}
