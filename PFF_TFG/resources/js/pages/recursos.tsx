import { Head, router } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    Download,
    ExternalLink,
    FileArchive,
    FileText,
    Folder,
    Image,
    Link as LinkIcon,
    PlayCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { index as recursosIndex } from '@/actions/App/Http/Controllers/RecursosController';
import AcademiaHeader from '@/components/academia-header';

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
            return 'is-document';
        case 'archive':
            return 'is-archive';
        case 'folder':
            return 'is-folder';
        case 'multimedia':
            return 'is-multimedia';
        case 'external_link':
            return 'is-link';
        case 'image':
            return 'is-image';
        default:
            return 'is-other';
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
}: RecursosProps) {
    const [isSelectedExpanded, setIsSelectedExpanded] = useState(true);
    const [selectedBuckets, setSelectedBuckets] = useState<MetadataBucket[]>(['links', 'images', 'files', 'folders', 'others']);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

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

    const sideSubjects = useMemo(
        () => subjects.filter((subject) => subject.id !== selectedSubjectId),
        [selectedSubjectId, subjects],
    );

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
                        <h1>RECURSOS</h1>
                        <section className="p-recursos__total" aria-label="Total de recursos disponibles">
                            <strong>{summary.totalResources}</strong>
                            <span>Recursos totales</span>
                        </section>
                    </header>

                    {pageError && <p className="p-recursos__error">{pageError}</p>}

                    <section className="p-recursos__workspace" aria-label="Panel de recursos">
                        <aside className="p-recursos__sidebar">
                            <article className="p-recursos__analysis" aria-label="Analisis de formato">
                                <h2>ANALISIS DE FORMATO</h2>

                                <section className="p-recursos__analysis-item">
                                    <header>
                                        <span>Documentos</span>
                                        <strong>{formatDistribution.documents}%</strong>
                                    </header>
                                    <progress max={100} value={formatDistribution.documents} aria-label="Porcentaje de documentos" />
                                </section>

                                <section className="p-recursos__analysis-item">
                                    <header>
                                        <span>Multimedia</span>
                                        <strong>{formatDistribution.multimedia}%</strong>
                                    </header>
                                    <progress max={100} value={formatDistribution.multimedia} aria-label="Porcentaje de multimedia" />
                                </section>

                                <section className="p-recursos__analysis-item">
                                    <header>
                                        <span>Enlaces externos</span>
                                        <strong>{formatDistribution.links}%</strong>
                                    </header>
                                    <progress max={100} value={formatDistribution.links} aria-label="Porcentaje de enlaces" />
                                </section>
                            </article>

                            <article className="p-recursos__filters" aria-label="Filtro por metadatos">
                                <h2>METADATA FILTER</h2>
                                <ul>
                                    {METADATA_FILTERS.map((item) => {
                                        const isActive = selectedBuckets.includes(item.bucket);
                                        const count = metadataCounts[item.bucket];

                                        return (
                                            <li key={item.bucket}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleBucket(item.bucket)}
                                                    aria-pressed={isActive}
                                                    className={isActive ? 'is-active' : ''}
                                                >
                                                    {item.label}
                                                    <span>{count}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </article>
                        </aside>

                        <section className="p-recursos__content" aria-label="Recursos por asignatura">
                            {filteredSelectedSubject && (
                                <article className="p-recursos__subject is-featured">
                                    <button
                                        type="button"
                                        className="p-recursos__subject-head"
                                        onClick={() => {
                                            setIsSelectedExpanded((previous) => ! previous);
                                        }}
                                        aria-expanded={isSelectedExpanded}
                                    >
                                        <section>
                                            <small>{filteredSelectedSubject.code}</small>
                                            <h2>{filteredSelectedSubject.subject}</h2>
                                        </section>
                                        {isSelectedExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>

                                    {isSelectedExpanded && (
                                        <section className="p-recursos__subject-body">
                                            {filteredSelectedSubject.units.map((unit, unitIndex) => (
                                                <section key={`${filteredSelectedSubject.id}-${unit.name}`} className="p-recursos__unit">
                                                    <header>
                                                        <span>{`${`${unitIndex + 1}`.padStart(2, '0')}`}</span>
                                                        <h3>{unit.name}</h3>
                                                    </header>

                                                    <ul>
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
                                                                                    <p>{resource.name}</p>
                                                                                    <small>
                                                                                        {resource.children && resource.children.length > 0
                                                                                            ? `${resource.children.length} archivos`
                                                                                            : resource.kindLabel}
                                                                                    </small>
                                                                                </section>
                                                                            </section>

                                                                            <section className="p-recursos__folder-actions">
                                                                                {resource.url && (
                                                                                    <a
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
                                                                                                <p>{child.name}</p>
                                                                                                <small>
                                                                                                    {child.sizeLabel ? `${child.sizeLabel} / ${child.kindLabel}` : child.kindLabel}
                                                                                                </small>
                                                                                            </section>

                                                                                            {child.downloadUrl ? (
                                                                                                <a href={child.downloadUrl} aria-label={downloadResourceLabel(child)} download>
                                                                                                    <Download size={16} />
                                                                                                </a>
                                                                                            ) : child.url ? (
                                                                                                <a href={child.url} target="_blank" rel="noreferrer" aria-label={openResourceLabel(child)}>
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
                                                                            <p>{resource.name}</p>
                                                                            <small>
                                                                                {resource.sizeLabel ? `${resource.sizeLabel} / ${resource.kindLabel}` : resource.kindLabel}
                                                                            </small>
                                                                        </section>

                                                                        {resource.downloadUrl ? (
                                                                            <a href={resource.downloadUrl} aria-label={downloadResourceLabel(resource)} download>
                                                                                <Download size={16} />
                                                                            </a>
                                                                        ) : resource.url ? (
                                                                            <a
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
                                            ))}
                                        </section>
                                    )}
                                </article>
                            )}

                            {sideSubjects.map((subject) => {
                                return (
                                    <article key={subject.id} className="p-recursos__subject">
                                        <button
                                            type="button"
                                            className="p-recursos__subject-head"
                                            onClick={() => {
                                                handleSelectSubject(subject.id);
                                            }}
                                            aria-expanded={false}
                                        >
                                            <section>
                                                <small>{subject.code}</small>
                                                <h2>{subject.subject}</h2>
                                            </section>
                                            <section className="p-recursos__subject-meta">
                                                <span>Ver recursos</span>
                                                <ChevronDown size={16} />
                                            </section>
                                        </button>
                                    </article>
                                );
                            })}

                            {subjects.length === 0 && (
                                <article className="p-recursos__empty">
                                    <h3>Sin recursos para mostrar</h3>
                                    <p>
                                        {moodleConnected
                                            ? 'No se encontraron recursos en las asignaturas con los filtros actuales.'
                                            : 'Conecta Moodle para cargar recursos compartidos por tus docentes.'}
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
