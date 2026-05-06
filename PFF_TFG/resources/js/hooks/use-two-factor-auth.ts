import { usePage } from '@inertiajs/react';
import { useCallback, useState } from 'react';
import { recoveryCodes } from '@/routes/two-factor';

export type UseTwoFactorAuthReturn = {
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    recoveryCodesList: string[];
    hasSetupData: boolean;
    errors: string[];
    clearErrors: () => void;
    clearSetupData: () => void;
    fetchQrCode: () => Promise<void>;
    fetchSetupKey: () => Promise<void>;
    fetchSetupData: () => Promise<void>;
    fetchRecoveryCodes: () => Promise<void>;
};

export const OTP_MAX_LENGTH = 6;

export const useTwoFactorAuth = (): UseTwoFactorAuthReturn => {
    const { props } = usePage<{ twoFactorQrCodeSvg?: string | null; twoFactorSecretKey?: string | null }>();
    const [recoveryCodesList, setRecoveryCodesList] = useState<string[]>([]);
    const [errors, setErrors] = useState<string[]>([]);

    const qrCodeSvg = props.twoFactorQrCodeSvg ?? null;
    const manualSetupKey = props.twoFactorSecretKey ?? null;
    const hasSetupData = qrCodeSvg !== null && manualSetupKey !== null;

    const clearErrors = useCallback((): void => {
        setErrors([]);
    }, []);

    // QR code and secret key come from Inertia page props — no fetch needed
    const fetchQrCode = useCallback(async (): Promise<void> => {}, []);
    const fetchSetupKey = useCallback(async (): Promise<void> => {}, []);
    const fetchSetupData = useCallback(async (): Promise<void> => {}, []);
    const clearSetupData = useCallback((): void => clearErrors(), [clearErrors]);

    const fetchRecoveryCodes = useCallback(async (): Promise<void> => {
        try {
            clearErrors();

            const response = await fetch(recoveryCodes.url(), {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status}`);
            }

            const codes = (await response.json()) as string[];

            setRecoveryCodesList(codes);
        } catch {
            setErrors((prev) => [...prev, 'Failed to fetch recovery codes']);
            setRecoveryCodesList([]);
        }
    }, [clearErrors]);

    return {
        qrCodeSvg,
        manualSetupKey,
        recoveryCodesList,
        hasSetupData,
        errors,
        clearErrors,
        clearSetupData,
        fetchQrCode,
        fetchSetupKey,
        fetchSetupData,
        fetchRecoveryCodes,
    };
};
