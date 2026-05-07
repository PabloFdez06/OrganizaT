import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, Copy, RefreshCw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Spinner } from '@/components/ui/spinner';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import type { TwoFactorStatus } from '@/hooks/use-two-factor-auth';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    status: TwoFactorStatus;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    recoveryCodesList: string[];
    code: string;
    codeError?: string;
    generalError?: string;
    isRefreshingSetup: boolean;
    isConfirming: boolean;
    isRegeneratingCodes: boolean;
    onCodeChange: (value: string) => void;
    onConfirm: () => Promise<void>;
    onRegenerateCodes: () => Promise<void>;
    onRefresh: () => Promise<void>;
};

export default function TwoFactorSetupModal({
    isOpen,
    onClose,
    status,
    qrCodeSvg,
    manualSetupKey,
    recoveryCodesList,
    code,
    codeError,
    generalError,
    isRefreshingSetup,
    isConfirming,
    isRegeneratingCodes,
    onCodeChange,
    onConfirm,
    onRegenerateCodes,
    onRefresh,
}: Props) {
    const isPending = status === 'pending';
    const isEnabled = status === 'enabled';
    const shouldShowSetupData = isPending || isEnabled;
    const [hasCopiedManualKey, setHasCopiedManualKey] = useState(false);

    const modalConfig = useMemo<{
        title: string;
        description: string;
    }>(() => {
        if (isEnabled) {
            return {
                title: 'Verificación en 2 pasos activa',
                description:
                    'Tu cuenta está protegida con TOTP. Puedes regenerar códigos de recuperación cuando lo necesites.',
            };
        }

        if (isPending) {
            return {
                title: 'Finaliza la activación del 2FA',
                description:
                    'Escanea el QR, guarda los códigos de recuperación y confirma con un código TOTP válido.',
            };
        }

        return {
            title: 'Gestión de 2FA',
            description:
                'Activa la verificación en 2 pasos desde la zona de peligro para ver los datos de configuración.',
        };
    }, [isEnabled, isPending]);

    const handleCopyManualSetupKey = async (): Promise<void> => {
        if (!manualSetupKey) {
            return;
        }

        try {
            await navigator.clipboard.writeText(manualSetupKey);
            setHasCopiedManualKey(true);

            window.setTimeout(() => {
                setHasCopiedManualKey(false);
            }, 1500);
        } catch {
            setHasCopiedManualKey(false);
        }
    };

    const handleDownloadRecoveryCodes = (): void => {
        if (recoveryCodesList.length === 0 || typeof window === 'undefined') {
            return;
        }

        const fileContent = [
            'ORGANIZAT - CODIGOS DE RECUPERACION 2FA',
            `Generado: ${new Date().toISOString()}`,
            '',
            ...recoveryCodesList.map((code, index) => `${String(index + 1).padStart(2, '0')}. ${code}`),
        ].join('\n');

        const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = objectUrl;
        anchor.download = 'organizat-2fa-recovery-codes.txt';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="p-settings__two-factor-modal">
                <header className="p-settings__two-factor-modal-close-row">
                    <button type="button" className="p-settings__two-factor-modal-close-button" onClick={onClose}>
                        CLOSE
                        <X aria-hidden="true" />
                    </button>
                </header>

                <DialogHeader className="p-settings__two-factor-modal-header">
                    <DialogTitle className="p-settings__two-factor-modal-title">{modalConfig.title}</DialogTitle>
                    <DialogDescription className="p-settings__two-factor-modal-description">
                        {modalConfig.description}
                    </DialogDescription>
                </DialogHeader>

                {generalError && <AlertError errors={[generalError]} />}

                {!shouldShowSetupData && (
                    <section className="p-settings__two-factor-empty">
                        <p>
                            Activa el 2FA desde la zona de peligro para cargar automaticamente el QR, la clave manual y los codigos de recuperacion.
                        </p>
                    </section>
                )}

                {shouldShowSetupData && (
                    <section className="p-settings__two-factor-layout" aria-live="polite">
                        <section className="p-settings__two-factor-left-column">
                            <section className="p-settings__two-factor-qr-card">
                                <div className="p-settings__two-factor-qr-frame">
                                    {isRefreshingSetup ? (
                                        <div className="p-settings__two-factor-loading">
                                            <Spinner />
                                        </div>
                                    ) : qrCodeSvg ? (
                                        <div className="p-settings__two-factor-qr-image" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                                    ) : (
                                        <p className="p-settings__two-factor-subtext">No se pudo cargar el QR.</p>
                                    )}
                                </div>

                                <p className="p-settings__two-factor-label">AUTHENTICATION ID</p>
                                <p className="p-settings__two-factor-subtext">Escanea con Google Authenticator o Authy</p>
                            </section>

                            <section className="p-settings__two-factor-manual-section">
                                <h3 className="p-settings__two-factor-manual-title">MANUAL SETUP</h3>
                                <div className="p-settings__two-factor-manual-row">
                                    <code className="p-settings__two-factor-manual-code">{manualSetupKey ?? 'No disponible'}</code>
                                    <Button
                                        type="button"
                                        variant="default"
                                        className="p-settings__two-factor-copy-button"
                                        onClick={() => void handleCopyManualSetupKey()}
                                        disabled={!manualSetupKey}
                                    >
                                        {hasCopiedManualKey ? (
                                            <>
                                                <Check aria-hidden="true" />
                                                Copiado
                                            </>
                                        ) : (
                                            <>
                                                <Copy aria-hidden="true" />
                                                Copiar
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </section>
                        </section>

                        <section className="p-settings__two-factor-right-column">
                            <section className="p-settings__two-factor-recovery-card">
                                <header className="p-settings__two-factor-recovery-header">
                                    <div>
                                        <h3 className="p-settings__two-factor-recovery-title">Codigos de recuperacion</h3>
                                        <p className="p-settings__two-factor-subtext">Guarda estos codigos en un lugar seguro.</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="p-settings__two-factor-icon-action"
                                        onClick={() => void onRefresh()}
                                        disabled={isRefreshingSetup || isConfirming || isRegeneratingCodes}
                                        aria-label="Actualizar datos de configuracion"
                                    >
                                        <RefreshCw aria-hidden="true" />
                                    </Button>
                                </header>

                                <div className="p-settings__two-factor-recovery-list-wrapper">
                                    {recoveryCodesList.length > 0 ? (
                                        <ul className="p-settings__two-factor-recovery-list" aria-label="Codigos de recuperacion">
                                            {recoveryCodesList.map((recoveryCode, index) => (
                                                <li key={recoveryCode} className="p-settings__two-factor-recovery-item">
                                                    <span className="p-settings__two-factor-recovery-index">
                                                        {String(index + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="p-settings__two-factor-recovery-code">{recoveryCode}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="p-settings__two-factor-subtext">No hay codigos disponibles.</p>
                                    )}
                                </div>

                                <div className="p-settings__two-factor-recovery-actions">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="p-settings__two-factor-recovery-button"
                                        onClick={() => void onRegenerateCodes()}
                                        disabled={isRegeneratingCodes || isRefreshingSetup || isConfirming}
                                    >
                                        {isRegeneratingCodes ? 'Regenerando...' : 'Regenerar codigos'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="p-settings__two-factor-recovery-button p-settings__two-factor-recovery-button--download"
                                        onClick={handleDownloadRecoveryCodes}
                                        disabled={recoveryCodesList.length === 0}
                                    >
                                        Descargar PDF
                                    </Button>
                                </div>
                            </section>

                            {isPending && (
                                <section className="p-settings__two-factor-verification">
                                    <h3 className="p-settings__two-factor-verification-title">VERIFICACION DEL CODIGO TOTP</h3>

                                    <label htmlFor="two-factor-confirm-code" className="p-settings__two-factor-verification-label">
                                        CODIGO DE 6 DIGITOS
                                    </label>
                                    <InputOTP
                                        id="two-factor-confirm-code"
                                        maxLength={OTP_MAX_LENGTH}
                                        value={code}
                                        onChange={onCodeChange}
                                        disabled={isConfirming}
                                        pattern={REGEXP_ONLY_DIGITS}
                                        autoFocus
                                        containerClassName="p-settings__two-factor-otp"
                                        className="p-settings__two-factor-otp-input"
                                    >
                                        <InputOTPGroup className="p-settings__two-factor-otp-group">
                                            {Array.from({ length: OTP_MAX_LENGTH }, (_, index) => (
                                                <InputOTPSlot key={index} index={index} className="p-settings__two-factor-otp-slot" />
                                            ))}
                                        </InputOTPGroup>
                                    </InputOTP>
                                    <p className="p-settings__two-factor-subtext">Introduce el codigo generado por tu app autenticadora para activar el 2FA.</p>
                                    <InputError message={codeError} />

                                    <div className="p-settings__two-factor-verification-actions">
                                        <Button
                                            type="button"
                                            variant="default"
                                            className="p-settings__two-factor-confirm-button"
                                            onClick={() => void onConfirm()}
                                            disabled={isConfirming || code.length !== OTP_MAX_LENGTH}
                                        >
                                            {isConfirming ? 'Confirmando...' : 'Confirmar 2FA'}
                                        </Button>
                                        <button
                                            type="button"
                                            className="p-settings__two-factor-cancel-link"
                                            onClick={onClose}
                                            disabled={isConfirming}
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </section>
                            )}
                        </section>
                    </section>
                )}

            </DialogContent>
        </Dialog>
    );
}
