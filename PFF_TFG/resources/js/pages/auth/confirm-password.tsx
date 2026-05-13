import { Form, Head, Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { rules, useFormValidation } from '@/hooks/use-form-validation';
import { translateServerError } from '@/lib/error-translator';
import { home } from '@/routes';
import { store } from '@/routes/password/confirm';

export default function ConfirmPassword() {
    const { clientErrors, handleChange, handleBlur, validateAll } = useFormValidation({
        password: [rules.required()],
    });

    return (
        <>
            <Head title="Confirmar contrasena" />

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
                            <h2 className="c-auth-editorial__header-title">Confirmar Contrasena</h2>
                            <p className="c-auth-editorial__header-description">
                                Esta es una zona segura. Confirma tu contrasena para continuar.
                            </p>
                        </header>

                        <Form
                            method="post"
                            action={store().url}
                            resetOnSuccess={['password']}
                            onBefore={() => validateAll()}
                            className="c-auth-form c-auth-form--editorial"
                        >
                            {({ processing, errors }) => (
                                <div className="c-auth-form__fields">
                                    <div className="c-auth-form__field c-auth-form__field--filled">
                                        <Label htmlFor="password">Contrasena actual</Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            placeholder="************"
                                            autoComplete="current-password"
                                            autoFocus
                                            required
                                            tabIndex={1}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                        />

                                        <InputError message={clientErrors.password || translateServerError(errors.password)} />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="c-auth-form__submit c-auth-form__submit--editorial"
                                        disabled={processing}
                                        data-test="confirm-password-button"
                                        tabIndex={2}
                                    >
                                        {processing && <Spinner />}
                                        Confirmar y continuar
                                    </Button>
                                </div>
                            )}
                        </Form>
                    </article>
                </section>
            </main>
        </>
    );
}
