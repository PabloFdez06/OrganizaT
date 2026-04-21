import { Head, router } from '@inertiajs/react';
import {
    BarChart3,
    ChevronDown,
    ChevronUp,
    Download,
    ExternalLink,
    FileArchive,
    FileText,
    Filter,
    Folder,
    Image,
    Link as LinkIcon,
    PlayCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { index as recursosIndex } from '@/actions/App/Http/Controllers/RecursosController';
import AcademiaHeader from '@/components/academia-header';
import AlertError from '@/components/alert-error';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

type ResourceItem = {
    id: string;
    name: string;
    kind: 'document' | 'archive' | 'folder' | 'multimedia' | 'external_link' | 'image' | 'other';
    kindLabel: string;
    bucket: 'links' | 'images' | 'files' | 'folders' | 'others';
    sizeLabel: string | null;
    extension: string | null;
    url: string | null;
    downloadUrl: string | null;
    module: string | null;
    folderName: string | null;
    children: ResourceItem[] | null;
};

type SubjectUnit = {
    name: string;
    resources: ResourceItem[];
};

type SubjectItem = {
    id: number;
    code: string;
    subject: string;
    teacher: string;
};

type SelectedSubject = SubjectItem & {
    resourceCount: number;
    units: SubjectUnit[];
};

type RecursosProps = {
    moodleConnected: boolean;
    studentName: string | null;
    profileAvatarUrl: string | null;
    subjects: SubjectItem[];
    selectedSubject: SelectedSubject | null;
    selectedSubjectId: number | null;
    summary: {
        totalResources: number;
        formatDistribution: {
            documents: number;
            multimedia: number;
            links: number;
        };
        metadata: {
            links: number;
            images: number;
            files: number;
            folders: number;
            others: number;
        };
    };
    pageError: string | null;
    loading: boolean;
};

type MetadataBucket = 'links' | 'images' | 'files' | 'folders' | 'others';

const METADATA_FILTERS: Array<{ bucket: MetadataBucket; label: string }> = [
    { bucket: 'links', label: 'Enlaces' },
    { bucket: 'images', label: 'Imagenes' },
    { bucket: 'files', label: 'Archivos' },
    { bucket: 'folders', label: 'Carpetas' },
    { bucket: 'others', label: 'Otros' },
];

function formatPercent(value: number, total: number): number {
    if (total <= 0) {
        return 0;
    }

    return Math.round((value / total) * 100);
}

function getModuleLabel(code: string, index: number): string {
    const numericMatch = code.match(/(\d+)/);
    const moduleNumber = numericMatch ? Number.parseInt(numericMatch[1], 10) : index + 1;

    return `MODULO ${moduleNumber.toString().padStart(2, '0')}`;
}

function kindIcon(kind: ResourceItem['kind']) {
    switch (kind) {
        case 'document':
            return <FileText size={16} />;
        case 'archive':
            return <FileArchive size={16} />;
        case 'folder':
            return <Folder size={16} />;
        case 'multimedia':
            return <PlayCircle size={16} />;
        case 'external_link':
            return <LinkIcon size={16} />;
        case 'image':
            return <Image size={16} />;
        default:
            return <Folder size={16} />;
    }
}

function kindToneClass(kind: ResourceItem['kind']): string {
    switch (kind) {
        case 'document':
            return 'p-recursos__resource-icon--document';
        case 'archive':
            return 'p-recursos__resource-icon--archive';
        case 'folder':
            return 'p-recursos__resource-icon--folder';
        case 'multimedia':
            return 'p-recursos__resource-icon--multimedia';
        case 'external_link':
            return 'p-recursos__resource-icon--link';
        case 'image':
            return 'p-recursos__resource-icon--image';
        default:
            return 'p-recursos__resource-icon--other';
    }
}

export default function Recursos({
    moodleConnected,
    studentName,
    profileAvatarUrl,
    subjects,
    selectedSubject,
    selectedSubjectId,
    summary,
    pageError,
    loading,
}: RecursosProps) {
    const [selectedBuckets, setSelectedBuckets] = useState<MetadataBucket[]>(['links', 'images', 'files', 'folders', 'others']);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

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
                only: ['studentName', 'profileAvatarUrl', 'subjects', 'selectedSubject', 'selectedSubjectId', 'summary', 'pageError', 'loading'],
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

    const filteredSelectedSubject = useMemo(() => {
        if (! selectedSubject) {
            return null;
        }

        const units = selectedSubject.units
            .map((unit) => ({
                ...unit,
                resources: unit.resources.filter((resource) => selectedBuckets.includes(resource.bucket)),
            }))
            .filter((unit) => unit.resources.length > 0);

        return {
            ...selectedSubject,
            units,
            filteredResourceCount: units.reduce((acc, unit) => acc + unit.resources.length, 0),
        };
    }, [selectedBuckets, selectedSubject]);

    const filteredTotals = useMemo(() => {
        const resources = filteredSelectedSubject?.units.flatMap((unit) => unit.resources) ?? [];

        return {
            total: resources.length,
            documents: resources.filter((resource) => resource.kind === 'document' || resource.kind === 'archive').length,
            multimedia: resources.filter((resource) => resource.kind === 'multimedia').length,
            links: resources.filter((resource) => resource.kind === 'external_link').length,
        };
    }, [filteredSelectedSubject]);

    const formatDistribution = {
        documents: formatPercent(filteredTotals.documents, filteredTotals.total),
        multimedia: formatPercent(filteredTotals.multimedia, filteredTotals.total),
        links: formatPercent(filteredTotals.links, filteredTotals.total),
    };

    const handleToggleBucket = (bucket: MetadataBucket) => {
        setSelectedBuckets((previous) => {
            if (previous.includes(bucket)) {
                const next = previous.filter((item) => item !== bucket);

                if (next.length > 0) {
                    return next;
                }

                return previous;
            }

            return [...previous, bucket];
        });
    };

    const handleSelectSubject = (subjectId: number) => {
        router.visit(
            recursosIndex({ query: { subject_id: subjectId } }).url,
            {
                preserveState: false,
                preserveScroll: true,
            },
        );
    };

    const metadataCounts = useMemo(() => {
        const resources = filteredSelectedSubject?.units.flatMap((unit) => unit.resources) ?? [];

        return {
            links: resources.filter((resource) => resource.bucket === 'links').length,
            images: resources.filter((resource) => resource.bucket === 'images').length,
            files: resources.filter((resource) => resource.bucket === 'files').length,
            folders: resources.filter((resource) => resource.bucket === 'folders').length,
            others: resources.filter((resource) => resource.bucket === 'others').length,
        };
    }, [filteredSelectedSubject]);

    const handleToggleFolder = (resourceId: string) => {
        setExpandedFolders((previous) => ({
            ...previous,
            [resourceId]: ! previous[resourceId],
        }));
    };

    const openResourceLabel = (resource: ResourceItem): string => {
        if (resource.kind === 'external_link') {
            return `Abrir enlace ${resource.name}`;
        }

        if (resource.kind === 'folder') {
            return `Abrir carpeta ${resource.name}`;
        }

        return `Abrir recurso ${resource.name}`;
    };

    const downloadResourceLabel = (resource: ResourceItem): string => `Descargar ${resource.name}`;

    return (
        <>
            <Head title="Recursos" />

            <article className="p-recursos">
                <AcademiaHeader
                    containerClassName="p-recursos__container"
                    activePath="/recursos"
                    moodleConnected={moodleConnected}
                    profileAvatarUrl={profileAvatarUrl}
                    studentName={studentName}
                />

                <main className="p-recursos__container p-recursos__main">
                    <header className="p-recursos__head">
                        <h1 className="p-recursos__head-title">RECURSOS</h1>

                        <section className="p-recursos__head-tools" aria-label="Herramientas de recursos">
                            <section className="p-recursos__total" aria-label="Total de recursos disponibles">
                                <strong className="p-recursos__total-value">{summary.totalResources}</strong>
                                <span className="p-recursos__total-label">Recursos totales</span>
                            </section>
                        </section>
                    </header>

                    {pageError && <AlertError errors={[pageError]} title="No se pudieron cargar los recursos." />}

                    {loading && (
                        <section className="p-recursos__loading" aria-live="polite" aria-busy="true">
                            <Alert className="p-recursos__loading-alert">
                                <Spinner className="p-recursos__loading-spinner" />
                                <AlertTitle>Sincronizando recursos</AlertTitle>
                                <AlertDescription>Estamos obteniendo materiales de Moodle para la asignatura seleccionada.</AlertDescription>
                            </Alert>

                            <section className="p-recursos__loading-grid p-recursos__workspace">
                                <aside className="p-recursos__loading-rail p-recursos__left-rail">
                                    <Skeleton className="p-recursos__loading-line p-recursos__loading-line--rail-title" />
                                    <Skeleton className="p-recursos__loading-block p-recursos__loading-block--rail" />
                                    <Skeleton className="p-recursos__loading-block p-recursos__loading-block--rail" />
                                </aside>
                                <section className="p-recursos__loading-content p-recursos__content">
                                    <Skeleton className="p-recursos__loading-line p-recursos__loading-line--content-title" />
                                    <Skeleton className="p-recursos__loading-block p-recursos__loading-block--content" />
                                    <Skeleton className="p-recursos__loading-block p-recursos__loading-block--content" />
                                    <Skeleton className="p-recursos__loading-block p-recursos__loading-block--content" />
                                </section>
                            </section>
                        </section>
                    )}

                    <section className="p-recursos__workspace" aria-label="Panel de recursos">
                        <aside className="p-recursos__left-rail" aria-label="Listado de asignaturas">
                            <header className="p-recursos__rail-head">
                                <h2 className="p-recursos__rail-title">ASIGNATURAS</h2>

                                <section className="p-recursos__dropdowns" aria-label="Paneles de analisis y filtros">
                                    <details className="p-recursos__dropdown p-recursos__dropdown--icon">
                                        <summary className="p-recursos__dropdown-summary p-recursos__dropdown-summary--icon" aria-label="Analisis de formato" title="Analisis de formato">
                                            <BarChart3 className="p-recursos__dropdown-summary-icon" size={15} aria-hidden="true" />
                                        </summary>

                                        <article className="p-recursos__analysis" aria-label="Analisis de formato">
                                            <section className="p-recursos__analysis-item">
                                                <header className="p-recursos__analysis-item-head">
                                                    <span className="p-recursos__analysis-item-label">Documentos</span>
                                                    <strong className="p-recursos__analysis-item-value">{formatDistribution.documents}%</strong>
                                                </header>
                                                <progress className="p-recursos__analysis-item-progress" max={100} value={formatDistribution.documents} aria-label="Porcentaje de documentos" />
                                            </section>

                                            <section className="p-recursos__analysis-item">
                                                <header className="p-recursos__analysis-item-head">
                                                    <span className="p-recursos__analysis-item-label">Multimedia</span>
                                                    <strong className="p-recursos__analysis-item-value">{formatDistribution.multimedia}%</strong>
                                                </header>
                                                <progress className="p-recursos__analysis-item-progress" max={100} value={formatDistribution.multimedia} aria-label="Porcentaje de multimedia" />
                                            </section>

                                            <section className="p-recursos__analysis-item">
                                                <header className="p-recursos__analysis-item-head">
                                                    <span className="p-recursos__analysis-item-label">Enlaces externos</span>
                                                    <strong className="p-recursos__analysis-item-value">{formatDistribution.links}%</strong>
                                                </header>
                                                <progress className="p-recursos__analysis-item-progress" max={100} value={formatDistribution.links} aria-label="Porcentaje de enlaces" />
                                            </section>
                                        </article>
                                    </details>

                                    <details className="p-recursos__dropdown p-recursos__dropdown--icon">
                                        <summary className="p-recursos__dropdown-summary p-recursos__dropdown-summary--icon" aria-label="Filtro por metadatos" title="Filtro por metadatos">
                                            <Filter className="p-recursos__dropdown-summary-icon" size={15} aria-hidden="true" />
                                        </summary>

                                        <article className="p-recursos__filters" aria-label="Filtro por metadatos">
                                            <ul className="p-recursos__filter-list">
                                                {METADATA_FILTERS.map((item) => {
                                                    const isActive = selectedBuckets.includes(item.bucket);
                                                    const count = metadataCounts[item.bucket];

                                                    return (
                                                        <li className="p-recursos__filter-item" key={item.bucket}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleBucket(item.bucket)}
                                                                aria-pressed={isActive}
                                                                className={[
                                                                    'p-recursos__filter-button',
                                                                    isActive ? 'p-recursos__filter-button--active' : '',
                                                                ].filter(Boolean).join(' ')}
                                                            >
                                                                {item.label}
                                                                <span className="p-recursos__filter-button-count">{count}</span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </article>
                                    </details>
                                </section>
                            </header>

                            <section className="p-recursos__subject-scroll">
                                {subjects.map((subject, index) => {
                                    const isActive = subject.id === selectedSubjectId;

                                    return (
                                        <button
                                            key={subject.id}
                                            type="button"
                                            className={`p-recursos__subject-item ${isActive ? 'p-recursos__subject-item--active' : ''}`}
                                            onClick={() => {
                                                handleSelectSubject(subject.id);
                                            }}
                                            aria-current={isActive ? 'page' : undefined}
                                        >
                                            <section className="p-recursos__subject-item-main">
                                                <small className="p-recursos__subject-item-code">{getModuleLabel(subject.code, index)}</small>
                                                <h3 className="p-recursos__subject-item-title">{subject.subject}</h3>
                                            </section>
                                        </button>
                                    );
                                })}
                            </section>
                        </aside>

                        <section className="p-recursos__content" aria-label="Recursos por asignatura">
                            {!loading && filteredSelectedSubject && (
                                <article className="p-recursos__subject p-recursos__subject--featured">
                                    <header className="p-recursos__subject-head">
                                        <section className="p-recursos__subject-head-main">
                                            <small className="p-recursos__subject-head-code">{filteredSelectedSubject.code}</small>
                                            <h2 className="p-recursos__subject-head-title">{filteredSelectedSubject.subject}</h2>
                                        </section>
                                    </header>

                                    <section className="p-recursos__subject-body">
                                        {filteredSelectedSubject.units.length > 0 ? filteredSelectedSubject.units.map((unit, unitIndex) => (
                                            <section key={`${filteredSelectedSubject.id}-${unit.name}`} className="p-recursos__unit">
                                                <header className="p-recursos__unit-head">
                                                    <span className="p-recursos__unit-index">{`${`${unitIndex + 1}`.padStart(2, '0')}`}</span>
                                                    <h3 className="p-recursos__unit-title">{unit.name}</h3>
                                                </header>

                                                <ul className="p-recursos__unit-list">
                                                    {unit.resources.map((resource) => (
                                                        <li key={resource.id}>
                                                            {resource.kind === 'folder' ? (
                                                                <article className="p-recursos__folder-card">
                                                                    <button
                                                                        type="button"
                                                                        className="p-recursos__folder-head"
                                                                        onClick={() => {
                                                                            handleToggleFolder(resource.id);
                                                                        }}
                                                                        aria-expanded={Boolean(expandedFolders[resource.id])}
                                                                    >
                                                                        <section className="p-recursos__folder-main">
                                                                            <section className={`p-recursos__resource-icon ${kindToneClass(resource.kind)}`} aria-hidden="true">
                                                                                {kindIcon(resource.kind)}
                                                                            </section>
                                                                            <section className="p-recursos__resource-content">
                                                                                <p className="p-recursos__resource-name">{resource.name}</p>
                                                                                <small className="p-recursos__resource-meta">
                                                                                    {resource.children && resource.children.length > 0
                                                                                        ? `${resource.children.length} archivos`
                                                                                        : resource.kindLabel}
                                                                                </small>
                                                                            </section>
                                                                        </section>

                                                                        <section className="p-recursos__folder-actions">
                                                                            {resource.url && (
                                                                                <a
                                                                                    className="p-recursos__folder-action-link"
                                                                                    href={resource.url}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    aria-label={openResourceLabel(resource)}
                                                                                    onClick={(event) => {
                                                                                        event.stopPropagation();
                                                                                    }}
                                                                                >
                                                                                    <ExternalLink size={16} />
                                                                                </a>
                                                                            )}
                                                                            {expandedFolders[resource.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                        </section>
                                                                    </button>

                                                                    {expandedFolders[resource.id] && resource.children && resource.children.length > 0 && (
                                                                        <ul className="p-recursos__folder-list">
                                                                            {resource.children.map((child) => (
                                                                                <li key={child.id}>
                                                                                    <article className="p-recursos__resource-card p-recursos__resource-card--child">
                                                                                        <section className={`p-recursos__resource-icon ${kindToneClass(child.kind)}`} aria-hidden="true">
                                                                                            {kindIcon(child.kind)}
                                                                                        </section>

                                                                                        <section className="p-recursos__resource-content">
                                                                                            <p className="p-recursos__resource-name">{child.name}</p>
                                                                                            <small className="p-recursos__resource-meta">
                                                                                                {child.sizeLabel ? `${child.sizeLabel} / ${child.kindLabel}` : child.kindLabel}
                                                                                            </small>
                                                                                        </section>

                                                                                        {child.downloadUrl ? (
                                                                                            <a className="p-recursos__resource-link" href={child.downloadUrl} aria-label={downloadResourceLabel(child)} download>
                                                                                                <Download size={16} />
                                                                                            </a>
                                                                                        ) : child.url ? (
                                                                                            <a className="p-recursos__resource-link" href={child.url} target="_blank" rel="noreferrer" aria-label={openResourceLabel(child)}>
                                                                                                <ExternalLink size={16} />
                                                                                            </a>
                                                                                        ) : (
                                                                                            <span className="p-recursos__resource-disabled" aria-hidden="true">
                                                                                                <Folder size={16} />
                                                                                            </span>
                                                                                        )}
                                                                                    </article>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    )}
                                                                </article>
                                                            ) : (
                                                                <article className="p-recursos__resource-card">
                                                                    <section className={`p-recursos__resource-icon ${kindToneClass(resource.kind)}`} aria-hidden="true">
                                                                        {kindIcon(resource.kind)}
                                                                    </section>

                                                                    <section className="p-recursos__resource-content">
                                                                        <p className="p-recursos__resource-name">{resource.name}</p>
                                                                        <small className="p-recursos__resource-meta">
                                                                            {resource.sizeLabel ? `${resource.sizeLabel} / ${resource.kindLabel}` : resource.kindLabel}
                                                                        </small>
                                                                    </section>

                                                                    {resource.downloadUrl ? (
                                                                        <a className="p-recursos__resource-link" href={resource.downloadUrl} aria-label={downloadResourceLabel(resource)} download>
                                                                            <Download size={16} />
                                                                        </a>
                                                                    ) : resource.url ? (
                                                                        <a
                                                                            className="p-recursos__resource-link"
                                                                            href={resource.url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            aria-label={openResourceLabel(resource)}
                                                                        >
                                                                            <ExternalLink size={16} />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="p-recursos__resource-disabled" aria-hidden="true">
                                                                            <Folder size={16} />
                                                                        </span>
                                                                    )}
                                                                </article>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </section>
                                        )) : (
                                            <article className="p-recursos__empty p-recursos__empty--inline">
                                                <h3 className="p-recursos__empty-title">No hay recursos para esta seleccion</h3>
                                                <p className="p-recursos__empty-description">Puede deberse a que los filtros estan ocultando el contenido o a que esta asignatura aun no tiene material publicado.</p>
                                            </article>
                                        )}
                                    </section>
                                </article>
                            )}

                            {!loading && subjects.length === 0 && (
                                <article className="p-recursos__empty">
                                    <h3 className="p-recursos__empty-title">Sin recursos para mostrar</h3>
                                    <p className="p-recursos__empty-description">
                                        {moodleConnected
                                            ? 'No se encontraron recursos en las asignaturas con los filtros actuales.'
                                            : 'Conecta Moodle para cargar recursos compartidos por tus docentes.'}
                                    </p>
                                    <ul className="p-recursos__empty-reasons">
                                        <li>Moodle no esta conectado o la sesion ha caducado.</li>
                                        <li>La asignatura todavia no tiene archivos, enlaces o carpetas compartidas.</li>
                                        <li>Los filtros de metadatos estan ocultando todos los tipos de recurso disponibles.</li>
                                        <li>Puede haber restricciones de permisos o una sincronizacion pendiente en Moodle.</li>
                                    </ul>
                                </article>
                            )}
                        </section>
                    </section>
                </main>
            </article>
        </>
    );
}
