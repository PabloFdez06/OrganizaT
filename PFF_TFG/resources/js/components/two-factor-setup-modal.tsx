import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { RefreshCw, ScanLine } from 'lucide-react';
import { useMemo } from 'react';
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
import { useAppearance } from '@/hooks/use-appearance';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import type { TwoFactorStatus } from '@/hooks/use-two-factor-auth';

function GridScanIcon() {
    return (
        <div className="">
            <div className="">
                <div className="">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={`col-${i + 1}`}
                            className=""
                        />
                    ))}
                </div>
                <div className="">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div
                            key={`row-${i + 1}`}
                            className=""
                        />
                    ))}
                </div>
                <ScanLine className="" />
            </div>
        </div>
    );
}

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
    const { resolvedAppearance } = useAppearance();
    const isPending = status === 'pending';
    const isEnabled = status === 'enabled';
    const shouldShowSetupData = isPending || isEnabled;

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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="">
                <DialogHeader className="">
                    <GridScanIcon />
                    <DialogTitle>{modalConfig.title}</DialogTitle>
                    <DialogDescription className="">
                        {modalConfig.description}
                    </DialogDescription>
                </DialogHeader>

                <div className="">
                    {generalError && <AlertError errors={[generalError]} />}

                    {shouldShowSetupData && (
                        <section className="space-y-4" aria-live="polite">
                            <header>
                                <h3 className="text-sm font-semibold">Configuración del autenticador</h3>
                            </header>

                            <section className="space-y-2">
                                <p className="text-sm text-muted-foreground">Escanea este código QR desde tu aplicación TOTP.</p>
                                <div className="rounded-md border p-4">
                                    {isRefreshingSetup ? (
                                        <div className="flex justify-center py-8">
                                            <Spinner />
                                        </div>
                                    ) : qrCodeSvg ? (
                                        <div
                                            dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                                            style={{
                                                filter:
                                                    resolvedAppearance === 'dark'
                                                        ? 'invert(1) brightness(1.5)'
                                                        : undefined,
                                            }}
                                        />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No se pudo cargar el QR.</p>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-2">
                                <p className="text-sm text-muted-foreground">Clave manual (si no puedes escanear QR):</p>
                                <code className="block rounded-md border bg-muted px-3 py-2 text-sm">{manualSetupKey ?? 'No disponible'}</code>
                            </section>

                            <section className="space-y-2">
                                <header>
                                    <h3 className="text-sm font-semibold">Códigos de recuperación</h3>
                                </header>
                                {recoveryCodesList.length > 0 ? (
                                    <ul className="grid gap-2 text-sm" aria-label="Códigos de recuperación">
                                        {recoveryCodesList.map((recoveryCode) => (
                                            <li key={recoveryCode} className="rounded-md border bg-muted px-3 py-2 font-mono">
                                                {recoveryCode}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No hay códigos disponibles.</p>
                                )}
                            </section>

                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => void onRefresh()} disabled={isRefreshingSetup || isConfirming || isRegeneratingCodes}>
                                    Actualizar
                                </Button>
                                <Button type="button" variant="outline" onClick={() => void onRegenerateCodes()} disabled={isRegeneratingCodes || isRefreshingSetup || isConfirming}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {isRegeneratingCodes ? 'Regenerando...' : 'Regenerar códigos'}
                                </Button>
                            </div>
                        </section>
                    )}

                    {isPending && (
                        <section className="space-y-3 pt-2">
                            <label htmlFor="two-factor-confirm-code" className="text-sm font-medium">
                                Código TOTP
                            </label>
                            <InputOTP
                                id="two-factor-confirm-code"
                                maxLength={OTP_MAX_LENGTH}
                                value={code}
                                onChange={onCodeChange}
                                disabled={isConfirming}
                                pattern={REGEXP_ONLY_DIGITS}
                                autoFocus
                            >
                                <InputOTPGroup>
                                    {Array.from({ length: OTP_MAX_LENGTH }, (_, index) => (
                                        <InputOTPSlot key={index} index={index} />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                            <InputError message={codeError} />

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={onClose} disabled={isConfirming}>
                                    Cerrar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => void onConfirm()}
                                    disabled={isConfirming || code.length !== OTP_MAX_LENGTH}
                                >
                                    {isConfirming ? 'Confirmando...' : 'Confirmar 2FA'}
                                </Button>
                            </div>
                        </section>
                    )}

                    {!isPending && (
                        <div className="flex justify-end pt-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cerrar
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
