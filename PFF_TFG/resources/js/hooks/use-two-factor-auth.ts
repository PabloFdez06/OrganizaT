import { usePage } from '@inertiajs/react';
import { useState } from 'react';
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

    const clearErrors = (): void => {
        setErrors([]);
    };

    // QR code and secret key come from Inertia page props — no fetch needed
    const fetchQrCode = async (): Promise<void> => {};
    const fetchSetupKey = async (): Promise<void> => {};
    const fetchSetupData = async (): Promise<void> => {};
    const clearSetupData = (): void => clearErrors();

    const fetchRecoveryCodes = async (): Promise<void> => {
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
    };

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
