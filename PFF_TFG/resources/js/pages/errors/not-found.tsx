import { Head, Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { store } from '@/actions/App/Http/Controllers/ErrorReportController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';

type NotFoundProps = {
    status?: number;
    timestamp?: string;
    serverNode?: string;
    requestedUrl?: string;
};

type SharedProps = {
    auth?: {
        user?: {
            name?: string;
            email?: string;
        } | null;
    };
};

const ArrowRightIcon = () => (
    <svg viewBox="0 0 12 12" className="p-error-404__action-icon" aria-hidden="true" focusable="false">
        <path d="M1.2 6h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M6.2 2.7 9.6 6l-3.4 3.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const FlagIcon = () => (
    <svg viewBox="0 0 12 12" className="p-error-404__action-icon" aria-hidden="true" focusable="false">
        <path d="M2.2 1.2v9.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M3 2h5.8l-1.5 2 1.5 2H3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export default function NotFound({ status = 404, timestamp, serverNode, requestedUrl }: NotFoundProps) {
    const { auth } = usePage<SharedProps>().props;
    const authenticatedName = typeof auth?.user?.name === 'string' ? auth.user.name : '';
    const authenticatedEmail = typeof auth?.user?.email === 'string' ? auth.user.email : '';

    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [submissionFeedback, setSubmissionFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);
    const closeTimerRef = useRef<number | null>(null);

    const {
        data,
        setData,
        post,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({
        name: authenticatedName,
        email: authenticatedEmail,
        description: '',
        error_url: requestedUrl ?? '',
    });
    const incidentReportError = (errors as Record<string, string | undefined>).incident_report;

    const resolvedTimestamp = timestamp ?? new Date().toISOString();
    const resolvedServerNode = serverNode ?? 'ARCHIVE-CL-04';
    const footerYear = Number.isNaN(new Date(resolvedTimestamp).getUTCFullYear())
        ? '2024'
        : String(new Date(resolvedTimestamp).getUTCFullYear());

    useEffect(() => {
        const fallbackUrl = typeof window !== 'undefined' ? window.location.href : '';
        setData('error_url', requestedUrl ?? fallbackUrl);
    }, [requestedUrl, setData]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current !== null) {
                window.clearTimeout(closeTimerRef.current);
            }
        };
    }, []);

    const handleIncidentModalChange = (isOpen: boolean) => {
        setIsIncidentModalOpen(isOpen);

        if (!isOpen) {
            setSubmissionFeedback(null);
            clearErrors();
            reset('description');
        }
    };

    const handleReportSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmissionFeedback(null);

        if (closeTimerRef.current !== null) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        post(store().url, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setSubmissionFeedback({
                    type: 'success',
                    message: 'Reporte enviado correctamente. El modal se cerrará automáticamente.',
                });
                reset('description');

                closeTimerRef.current = window.setTimeout(() => {
                    setIsIncidentModalOpen(false);
                    setSubmissionFeedback(null);
                }, 2600);
            },
            onError: (formErrors) => {
                setSubmissionFeedback({
                    type: 'error',
                    message: formErrors.incident_report ?? 'No se pudo enviar el reporte. Revisa los campos e inténtalo de nuevo.',
                });
            },
        });
    };

    return (
        <>
            <Head title={`${status} - Ruta no encontrada`} />

            <main className="p-error-404" aria-labelledby="error-404-title">
                <section className="p-error-404__canvas">
                    <section className="p-error-404__content" aria-label="Mensaje tecnico de navegacion">
                        <p className="p-error-404__error-type">ERROR_TYPE: NAVIGATION_FAILURE</p>
                        <h1 id="error-404-title" className="p-error-404__code">{status}</h1>

                        <hr className="p-error-404__divider" />

                        <header className="p-error-404__message-head">
                            <h2 className="p-error-404__title">RUTA NO ENCONTRADA // ERROR_CODE: 0x404</h2>
                            <p className="p-error-404__description">
                                Parece que el recurso o la seccion que buscas ha sido archivada o no existe en nuestra base de datos academica.
                            </p>
                        </header>

                        <nav className="p-error-404__actions" aria-label="Acciones de recuperacion">
                            <Link href={dashboard()} className="p-error-404__action p-error-404__action--primary">
                                VOLVER AL DASHBOARD
                                <ArrowRightIcon />
                            </Link>
                            <button
                                type="button"
                                className="p-error-404__action p-error-404__action--secondary"
                                onClick={() => setIsIncidentModalOpen(true)}
                            >
                                REPORTAR INCIDENCIA
                                <FlagIcon />
                            </button>
                        </nav>

                        <dl className="p-error-404__meta">
                            <dt className="p-error-404__meta-label">TIMESTAMP</dt>
                            <dd className="p-error-404__meta-value">{resolvedTimestamp}</dd>
                            <dt className="p-error-404__meta-label">SERVER_NODE</dt>
                            <dd className="p-error-404__meta-value">{resolvedServerNode}</dd>
                        </dl>
                    </section>

                    <figure className="p-error-404__visual" aria-label="Composicion visual del estado de archivo">
                        <section className="p-error-404__visual-panel" aria-hidden="true" />
                        <figcaption className="p-error-404__status-chip">
                            <span className="p-error-404__status-label">STATUS</span>
                            <span className="p-error-404__status-value">ESPACIO NO ENCONTRADO</span>
                        </figcaption>
                    </figure>
                </section>

                <footer className="p-error-404__strip" aria-label="Metadatos de sistema">
                    <p className="p-error-404__strip-item p-error-404__strip-item--left">
                        <span className="p-error-404__strip-dot" aria-hidden="true" />
                        CONEXION: CIFRADA
                    </p>
                    <p className="p-error-404__strip-item">ORGANIZAT ACADEMIC FRAMEWORK v2.4.0</p>
                    <p className="p-error-404__strip-item">(C) {footerYear} EDITORIAL ARCHIVE</p>
                </footer>
            </main>

            <Dialog open={isIncidentModalOpen} onOpenChange={handleIncidentModalChange}>
                <DialogContent className="p-error-404__modal">
                    <DialogHeader>
                        <DialogTitle className="p-error-404__modal-title">Reportar incidencia 404</DialogTitle>
                        <DialogDescription className="p-error-404__modal-description">
                            Cuéntanos qué estabas intentando hacer y te responderemos por correo.
                        </DialogDescription>
                    </DialogHeader>

                    <form className="p-error-404__modal-form" onSubmit={handleReportSubmit}>
                        <section className="p-error-404__modal-field">
                            <Label htmlFor="incident-name">Nombre</Label>
                            <Input
                                id="incident-name"
                                name="name"
                                type="text"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                required
                                disabled={processing}
                            />
                            <InputError message={errors.name} />
                        </section>

                        <section className="p-error-404__modal-field">
                            <Label htmlFor="incident-email">Email</Label>
                            <Input
                                id="incident-email"
                                name="email"
                                type="email"
                                value={data.email}
                                onChange={(event) => setData('email', event.target.value)}
                                required
                                disabled={processing}
                            />
                            <InputError message={errors.email} />
                        </section>

                        <section className="p-error-404__modal-field">
                            <Label htmlFor="incident-description">Descripción</Label>
                            <textarea
                                id="incident-description"
                                name="description"
                                className="p-error-404__modal-textarea"
                                rows={5}
                                value={data.description}
                                onChange={(event) => setData('description', event.target.value)}
                                required
                                disabled={processing}
                            />
                            <InputError message={errors.description} />
                        </section>

                        {submissionFeedback && (
                            <p
                                className={[
                                    'p-error-404__modal-feedback',
                                    submissionFeedback.type === 'error'
                                        ? 'p-error-404__modal-feedback--error'
                                        : 'p-error-404__modal-feedback--success',
                                ].join(' ')}
                            >
                                {submissionFeedback.message}
                            </p>
                        )}

                        <InputError message={incidentReportError} />

                        <DialogFooter className="p-error-404__modal-footer">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleIncidentModalChange(false)}
                                disabled={processing}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner className="p-error-404__modal-spinner" />}
                                Enviar reporte
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
