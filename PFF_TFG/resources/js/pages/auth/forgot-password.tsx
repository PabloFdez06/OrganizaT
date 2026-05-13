import { Form, Head, Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { rules, useFormValidation } from '@/hooks/use-form-validation';
import { translateServerError } from '@/lib/error-translator';
import { home, login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    const { clientErrors, handleChange, handleBlur, validateAll } = useFormValidation({
        email: [rules.required(), rules.email()],
    });

    return (
        <>
            <Head title="Forgot password" />

            <main className="c-auth-editorial c-auth-editorial--login">
                <section
                    className="c-auth-editorial__hero"
                    aria-hidden="true"
                    style={{
                        '--auth-hero-image': 'url("https://www.figma.com/api/mcp/asset/09035ce8-031f-4d6a-8a86-e9e729994e2b")',
                    } as CSSProperties}
                >
                    <header className="c-auth-editorial__hero-top">SYSTEM_ARCHIVE_v.2.4</header>
                    <section className="c-auth-editorial__hero-content">
                        <h1 className="c-auth-editorial__hero-title">PRECISION ACADEMICA</h1>
                        <p className="c-auth-editorial__hero-description">
                            Infraestructura digital disenada para la excelencia
                            editorial y la preservacion del conocimiento tecnico
                            de vanguardia.
                        </p>
                    </section>
                </section>

                <section className="c-auth-editorial__panel-wrap">
                    <article className="c-auth-editorial__panel">
                        <header className="c-auth-editorial__header">
                            <Link href={home()} className="c-auth-editorial__brand">
                                <span>OrganizaT</span>
                            </Link>
                            <h2 className="c-auth-editorial__header-title">Recuperar Contrasena</h2>
                            <p className="c-auth-editorial__header-description">Te enviaremos un enlace para restablecer tu acceso.</p>
                        </header>

                        <Form method="post" action={email().url} onBefore={() => validateAll()} className="c-auth-form c-auth-form--editorial">
                            {({ processing, errors }) => (
                                <>
                                    <div className="c-auth-form__fields">
                                        <div className="c-auth-form__field c-auth-form__field--filled">
                                            <Label htmlFor="email">Correo electronico</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                autoComplete="off"
                                                autoFocus
                                                required
                                                tabIndex={1}
                                                placeholder="usuario@institucion.edu"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                            />

                                            <InputError message={clientErrors.email || translateServerError(errors.email)} />
                                        </div>

                                        <Button
                                            className="c-auth-form__submit c-auth-form__submit--editorial"
                                            disabled={processing}
                                            data-test="email-password-reset-link-button"
                                            tabIndex={2}
                                        >
                                            {processing && <Spinner />}
                                            Enviar enlace de recuperacion
                                        </Button>
                                    </div>

                                    <footer className="c-auth-form__alt c-auth-form__alt--centered">
                                        <span>Volver a</span>
                                        <TextLink href={login()} tabIndex={3}>
                                            iniciar sesion
                                        </TextLink>
                                    </footer>
                                </>
                            )}
                        </Form>

                        {status && <div className="c-auth-form__status">{status}</div>}
                    </article>
                </section>
            </main>
        </>
    );
}
