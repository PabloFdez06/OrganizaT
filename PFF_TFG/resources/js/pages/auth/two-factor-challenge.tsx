import { Form, Head } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { store } from '@/routes/two-factor/login';

export default function TwoFactorChallenge() {
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const authConfigContent = useMemo<{
        title: string;
        description: string;
        buttonText: string;
        toggleText: string;
    }>(() => {
        if (showRecoveryInput) {
            return {
                title: 'Código de Recuperación',
                description:
                    'Introduce uno de tus códigos de emergencia guardados previamente.',
                buttonText: 'ACCEDER',
                toggleText: 'VOLVER AL CÓDIGO DE APLICACIÓN',
            };
        }

        return {
            title: 'Verificación de Seguridad',
            description:
                'Introduce el código de 6 dígitos de tu aplicación de autenticación para continuar.',
            buttonText: 'VERIFICAR',
            toggleText: 'USAR CÓDIGO DE RECUPERACIÓN',
        };
    }, [showRecoveryInput]);

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title="Verificación de dos factores" />

            <main className="c-two-factor-auth-shell">
                <article className="c-two-factor-auth" aria-labelledby="two-factor-auth-title">
                    <header className="c-two-factor-auth__strip" aria-hidden="true" />

                    <section className="c-two-factor-auth__body">
                        <p className="c-two-factor-auth__eyebrow">AUTENTICACIÓN</p>

                        <h1 id="two-factor-auth-title" className="c-two-factor-auth__title">
                            {showRecoveryInput ? (
                                <>
                                    Código de
                                    <br />
                                    Recuperación
                                </>
                            ) : (
                                authConfigContent.title
                            )}
                        </h1>

                        <p className="c-two-factor-auth__description">
                            {authConfigContent.description}
                        </p>

                        <Form
                            method="post"
                            action={store().url}
                            className="c-two-factor-auth__form"
                            resetOnError
                            resetOnSuccess={!showRecoveryInput}
                        >
                            {({ errors, processing, clearErrors }) => (
                                <>
                                    {showRecoveryInput ? (
                                        <section className="c-two-factor-auth__recovery-field">
                                            <label
                                                htmlFor="recovery-code"
                                                className="c-two-factor-auth__label"
                                            >
                                                CÓDIGO DE RECUPERACIÓN
                                            </label>

                                            <Input
                                                id="recovery-code"
                                                name="recovery_code"
                                                type="text"
                                                placeholder="XXXX-XXXX-XXXX"
                                                autoFocus={showRecoveryInput}
                                                autoComplete="one-time-code"
                                                disabled={processing}
                                                required
                                                className="c-two-factor-auth__recovery-input"
                                            />

                                            <InputError
                                                className="c-two-factor-auth__error"
                                                message={errors.recovery_code}
                                            />
                                        </section>
                                    ) : (
                                        <section className="c-two-factor-auth__otp-section" aria-label="Código de autenticación de 6 dígitos">
                                            <InputOTP
                                                name="code"
                                                maxLength={OTP_MAX_LENGTH}
                                                value={code}
                                                onChange={(value) => setCode(value)}
                                                disabled={processing}
                                                pattern={REGEXP_ONLY_DIGITS}
                                                autoFocus={!showRecoveryInput}
                                                containerClassName="c-two-factor-auth__otp-container"
                                                className="c-two-factor-auth__otp-input"
                                            >
                                                <InputOTPGroup className="c-two-factor-auth__otp-group">
                                                    {Array.from(
                                                        { length: OTP_MAX_LENGTH },
                                                        (_, index) => (
                                                            <InputOTPSlot
                                                                key={index}
                                                                index={index}
                                                                className="c-two-factor-auth__otp-slot"
                                                            />
                                                        ),
                                                    )}
                                                </InputOTPGroup>
                                            </InputOTP>

                                            <InputError
                                                className="c-two-factor-auth__error c-two-factor-auth__error--otp"
                                                message={errors.code}
                                            />
                                        </section>
                                    )}

                                    <Button
                                        type="submit"
                                        className={`c-two-factor-auth__submit${showRecoveryInput ? ' c-two-factor-auth__submit--recovery' : ''}`}
                                        disabled={processing}
                                    >
                                        <span>{authConfigContent.buttonText}</span>
                                        {showRecoveryInput && (
                                            <span
                                                aria-hidden="true"
                                                className="c-two-factor-auth__submit-arrow"
                                            >
                                                →
                                            </span>
                                        )}
                                    </Button>

                                    <button
                                        type="button"
                                        className={`c-two-factor-auth__toggle${showRecoveryInput ? ' c-two-factor-auth__toggle--recovery' : ' c-two-factor-auth__toggle--totp'}`}
                                        onClick={() => toggleRecoveryMode(clearErrors)}
                                    >
                                        {showRecoveryInput && (
                                            <span
                                                aria-hidden="true"
                                                className="c-two-factor-auth__toggle-arrow"
                                            >
                                                ←
                                            </span>
                                        )}
                                        <span>{authConfigContent.toggleText}</span>
                                    </button>
                                </>
                            )}
                        </Form>
                    </section>

                    <footer className="c-two-factor-auth__footer" aria-label="Indicadores de estado tecnico">
                        <span className="c-two-factor-auth__footer-item">SECURE_ACCESS_V1.0</span>
                        <span className="c-two-factor-auth__footer-item">ESTADO: PENDIENTE</span>
                        <span className="c-two-factor-auth__footer-item">ENC: SHA-256</span>
                    </footer>
                </article>
            </main>
        </>
    );
}
