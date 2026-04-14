import { Form, Head, Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { home } from '@/routes';
import { update } from '@/routes/password';

type Props = {
    token: string;
    email: string;
};

export default function ResetPassword({ token, email }: Props) {
    return (
        <>
            <Head title="Reset password" />

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
                        <h1>PRECISION ACADEMICA</h1>
                        <p>
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
                            <h2>Restablecer Contrasena</h2>
                            <p>Introduce tu nueva contrasena para recuperar el acceso.</p>
                        </header>

                        <Form
                            method="post"
                            action={update().url}
                            transform={(data) => ({ ...data, token, email })}
                            resetOnSuccess={['password', 'password_confirmation']}
                            className="c-auth-form c-auth-form--editorial"
                        >
                            {({ processing, errors }) => (
                                <div className="c-auth-form__fields">
                                    <div className="c-auth-form__field c-auth-form__field--filled">
                                        <Label htmlFor="email">Correo electronico</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            autoComplete="email"
                                            value={email}
                                            className="c-auth-form__readonly"
                                            readOnly
                                            tabIndex={1}
                                        />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="c-auth-form__field c-auth-form__field--filled">
                                        <Label htmlFor="password">Nueva contrasena</Label>
                                        <PasswordInput
                                            id="password"
                                            name="password"
                                            autoComplete="new-password"
                                            autoFocus
                                            placeholder="************"
                                            tabIndex={2}
                                        />
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="c-auth-form__field c-auth-form__field--filled">
                                        <Label htmlFor="password_confirmation">
                                            Confirmar contrasena
                                        </Label>
                                        <PasswordInput
                                            id="password_confirmation"
                                            name="password_confirmation"
                                            autoComplete="new-password"
                                            placeholder="************"
                                            tabIndex={3}
                                        />
                                        <InputError message={errors.password_confirmation} />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="c-auth-form__submit c-auth-form__submit--editorial"
                                        disabled={processing}
                                        data-test="reset-password-button"
                                        tabIndex={4}
                                    >
                                        {processing && <Spinner />}
                                        Restablecer contrasena
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
