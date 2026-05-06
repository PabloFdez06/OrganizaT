import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { Check, Copy, KeyRound, RefreshCw, ScanLine, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import AlertError from '@/components/alert-error';
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

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader className="space-y-3">
                    <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground sm:mx-0">
                        <ScanLine className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <DialogTitle>{modalConfig.title}</DialogTitle>
                    <DialogDescription>
                        {modalConfig.description}
                    </DialogDescription>
                </DialogHeader>

                <section className="space-y-4">
                    {generalError && <AlertError errors={[generalError]} />}

                    {!shouldShowSetupData && (
                        <section className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                            <header className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                                <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                Setup no iniciado
                            </header>
                            <p className="text-sm text-muted-foreground">
                                Activa el 2FA desde la pantalla de seguridad para cargar automaticamente el QR, la clave manual y los codigos de recuperacion.
                            </p>
                        </section>
                    )}

                    {shouldShowSetupData && (
                        <section className="space-y-4 rounded-lg border border-border bg-muted/20 p-4" aria-live="polite">
                            <header className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                Configuracion del autenticador
                            </header>

                            <section className="space-y-2">
                                <h3 className="text-sm font-medium text-foreground">Codigo QR</h3>
                                <p className="text-sm text-muted-foreground">Escanealo en tu app autenticadora para vincular el dispositivo.</p>
                                <div className="rounded-lg border border-border bg-background p-4">
                                    {isRefreshingSetup ? (
                                        <div className="flex justify-center py-8">
                                            <Spinner />
                                        </div>
                                    ) : qrCodeSvg ? (
                                        <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: qrCodeSvg }} />
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No se pudo cargar el QR.</p>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-sm font-medium text-foreground">Clave manual</h3>
                                <p className="text-sm text-muted-foreground">Usala solo si no puedes escanear el QR.</p>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <code className="block rounded-md border border-border bg-background px-3 py-2 text-sm font-mono">
                                        {manualSetupKey ?? 'No disponible'}
                                    </code>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => void handleCopyManualSetupKey()}
                                        disabled={!manualSetupKey}
                                    >
                                        {hasCopiedManualKey ? (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Copiada
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="mr-2 h-4 w-4" />
                                                Copiar
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </section>

                            <section className="space-y-2">
                                <h3 className="text-sm font-medium text-foreground">Codigos de recuperacion</h3>
                                <p className="text-sm text-muted-foreground">Guarda estos codigos en un lugar seguro para recuperar acceso si pierdes tu dispositivo.</p>
                                {recoveryCodesList.length > 0 ? (
                                    <ul className="grid gap-2 text-sm sm:grid-cols-2" aria-label="Codigos de recuperacion">
                                        {recoveryCodesList.map((recoveryCode) => (
                                            <li key={recoveryCode} className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs sm:text-sm">
                                                {recoveryCode}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No hay códigos disponibles.</p>
                                )}
                            </section>

                            <div className="flex flex-wrap gap-2">
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
                        <section className="space-y-3 rounded-lg border border-border bg-background p-4">
                            <header className="space-y-1">
                                <h3 className="text-sm font-medium text-foreground">Verificacion del codigo TOTP</h3>
                                <p className="text-sm text-muted-foreground">Introduce el codigo de 6 digitos para confirmar y dejar activo el 2FA.</p>
                            </header>

                            <label htmlFor="two-factor-confirm-code" className="text-sm font-medium text-foreground">
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
                                containerClassName="justify-start"
                                className="disabled:cursor-not-allowed"
                            >
                                <InputOTPGroup className="gap-2">
                                    {Array.from({ length: OTP_MAX_LENGTH }, (_, index) => (
                                        <InputOTPSlot
                                            key={index}
                                            index={index}
                                            className="h-11 w-10 rounded-md border border-border bg-muted/30 text-center text-base font-semibold text-foreground shadow-sm"
                                        />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                            <InputError message={codeError} />
                        </section>
                    )}

                    <DialogFooter>
                        {isPending ? (
                            <>
                                <Button type="button" variant="outline" onClick={onClose} disabled={isConfirming}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => void onConfirm()}
                                    disabled={isConfirming || code.length !== OTP_MAX_LENGTH}
                                >
                                    <KeyRound className="mr-2 h-4 w-4" />
                                    {isConfirming ? 'Confirmando...' : 'Confirmar 2FA'}
                                </Button>
                            </>
                        ) : (
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cerrar
                            </Button>
                        )}
                    </DialogFooter>
                </section>
            </DialogContent>
        </Dialog>
    );
}
