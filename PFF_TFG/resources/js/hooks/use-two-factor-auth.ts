import { router } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import { confirm as confirmPassword, confirmation } from '@/routes/password';
import {
    confirm,
    disable,
    enable,
    qrCode,
    recoveryCodes,
    regenerateRecoveryCodes,
    secretKey,
} from '@/routes/two-factor';
import type { TwoFactorSecretKey, TwoFactorSetupData } from '@/types';

export const OTP_MAX_LENGTH = 6;
export const TWO_FACTOR_ACTION_QUERY_KEY = 'two_factor_action';

export type TwoFactorAction = 'enable' | 'disable' | 'regenerate';
export type TwoFactorStatus = 'disabled' | 'pending' | 'enabled';

type TwoFactorErrors = {
    general?: string;
    code?: string;
    passwordConfirmation?: string;
};

type UseTwoFactorAuthOptions = {
    initialEnabled: boolean;
    initialPending: boolean;
};

export type UseTwoFactorAuthReturn = {
    status: TwoFactorStatus;
    qrCodeSvg: string | null;
    manualSetupKey: string | null;
    recoveryCodesList: string[];
    errors: TwoFactorErrors;
    isRefreshingSetup: boolean;
    isEnabling: boolean;
    isConfirming: boolean;
    isDisabling: boolean;
    isRegenerating: boolean;
    clearErrors: () => void;
    clearSetupData: () => void;
    refreshSetupData: () => Promise<void>;
    enableTwoFactor: () => Promise<boolean>;
    confirmTwoFactor: (code: string) => Promise<boolean>;
    disableTwoFactor: () => Promise<boolean>;
    regenerateCodes: () => Promise<boolean>;
};

type ApiErrorPayload = {
    message?: string;
    errors?: Record<string, string[]>;
};

class HttpError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly payload: ApiErrorPayload | null,
    ) {
        super(message);
    }
}

const JSON_HEADERS = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
};

const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const getCookieValue = (name: string): string | null => {
    if (typeof document === 'undefined') {
        return null;
    }

    const cookiePrefix = `${name}=`;
    const cookie = document.cookie
        .split('; ')
        .find((value) => value.startsWith(cookiePrefix));

    if (!cookie) {
        return null;
    }

    return decodeURIComponent(cookie.slice(cookiePrefix.length));
};

const resolveStatus = (isEnabled: boolean, isPending: boolean): TwoFactorStatus => {
    if (isEnabled) {
        return 'enabled';
    }

    if (isPending) {
        return 'pending';
    }

    return 'disabled';
};

const parseValidationMessage = (
    payload: ApiErrorPayload | null,
    field: string,
): string | undefined => {
    if (!payload?.errors) {
        return undefined;
    }

    const message = payload.errors[field]?.[0];

    return typeof message === 'string' ? message : undefined;
};

const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
    const method = (init?.method ?? 'GET').toUpperCase();
    const xsrfToken = CSRF_SAFE_METHODS.has(method)
        ? null
        : getCookieValue('XSRF-TOKEN');

    const response = await fetch(url, {
        ...init,
        credentials: 'same-origin',
        headers: {
            ...JSON_HEADERS,
            ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
            ...(init?.headers ?? {}),
        },
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? ((await response.json()) as ApiErrorPayload | T) : null;

    if (!response.ok) {
        throw new HttpError('Two factor request failed', response.status, (payload as ApiErrorPayload) ?? null);
    }

    return (payload as T) ?? ({} as T);
};

const buildReturnTo = (action: TwoFactorAction): string => {
    if (typeof window === 'undefined') {
        return '/settings/security#peligro';
    }

    const query = new URLSearchParams(window.location.search);
    query.set(TWO_FACTOR_ACTION_QUERY_KEY, action);

    const queryString = query.toString();

    return `${window.location.pathname}${queryString !== '' ? `?${queryString}` : ''}#peligro`;
};

export const useTwoFactorAuth = ({
    initialEnabled,
    initialPending,
}: UseTwoFactorAuthOptions): UseTwoFactorAuthReturn => {
    const [status, setStatus] = useState<TwoFactorStatus>(() =>
        resolveStatus(initialEnabled, initialPending),
    );
    const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
    const [manualSetupKey, setManualSetupKey] = useState<string | null>(null);
    const [recoveryCodesList, setRecoveryCodesList] = useState<string[]>([]);
    const [errors, setErrors] = useState<TwoFactorErrors>({});
    const [isRefreshingSetup, setIsRefreshingSetup] = useState(false);
    const [isEnabling, setIsEnabling] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isDisabling, setIsDisabling] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    useEffect(() => {
        setStatus(resolveStatus(initialEnabled, initialPending));
    }, [initialEnabled, initialPending]);

    const clearErrors = useCallback(() => {
        setErrors({});
    }, []);

    const clearSetupData = useCallback(() => {
        setQrCodeSvg(null);
        setManualSetupKey(null);
        setRecoveryCodesList([]);
        setErrors({});
    }, []);

    const redirectToPasswordConfirmation = useCallback((action: TwoFactorAction) => {
        const returnTo = buildReturnTo(action);

        setErrors({
            passwordConfirmation:
                'Confirma tu contraseña para continuar con la acción de seguridad.',
        });

        router.visit(
            confirmPassword.url({
                query: { return: returnTo },
            }),
            {
                preserveState: false,
                preserveScroll: false,
            },
        );
    }, []);

    const ensurePasswordConfirmed = useCallback(
        async (action: TwoFactorAction): Promise<boolean> => {
            try {
                const result = await requestJson<{ confirmed: boolean }>(
                    confirmation.url(),
                );

                if (result.confirmed) {
                    return true;
                }
            } catch {
                setErrors({
                    general:
                        'No se pudo verificar la sesión de confirmación de contraseña. Inténtalo de nuevo.',
                });

                return false;
            }

            redirectToPasswordConfirmation(action);

            return false;
        },
        [redirectToPasswordConfirmation],
    );

    const refreshSetupData = useCallback(async (): Promise<void> => {
        setIsRefreshingSetup(true);
        setErrors({});

        try {
            const [qrResponse, secretResponse, codesResponse] = await Promise.all([
                requestJson<TwoFactorSetupData | Record<string, never>>(qrCode.url()),
                requestJson<TwoFactorSecretKey | Record<string, never>>(secretKey.url()),
                requestJson<string[] | Record<string, never>>(recoveryCodes.url()),
            ]);

            setQrCodeSvg('svg' in qrResponse && typeof qrResponse.svg === 'string' ? qrResponse.svg : null);
            setManualSetupKey(
                'secretKey' in secretResponse && typeof secretResponse.secretKey === 'string'
                    ? secretResponse.secretKey
                    : null,
            );
            setRecoveryCodesList(Array.isArray(codesResponse) ? codesResponse : []);
        } catch (error) {
            if (error instanceof HttpError && error.status === 423) {
                setErrors({
                    passwordConfirmation:
                        'Tu confirmación de contraseña expiró. Vuelve a confirmar para gestionar el 2FA.',
                });

                redirectToPasswordConfirmation('enable');

                return;
            }

            setErrors({
                general:
                    'No se pudieron cargar los datos de configuración de 2FA. Inténtalo de nuevo.',
            });
            setQrCodeSvg(null);
            setManualSetupKey(null);
            setRecoveryCodesList([]);
        } finally {
            setIsRefreshingSetup(false);
        }
    }, [redirectToPasswordConfirmation]);

    const enableTwoFactor = useCallback(async (): Promise<boolean> => {
        if (!await ensurePasswordConfirmed('enable')) {
            return false;
        }

        setIsEnabling(true);
        setErrors({});

        try {
            await requestJson(enable.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            setStatus('pending');
            await refreshSetupData();

            return true;
        } catch (error) {
            if (error instanceof HttpError && error.status === 423) {
                redirectToPasswordConfirmation('enable');

                return false;
            }

            setErrors({
                general:
                    'No se pudo iniciar la activación de 2FA. Reintenta en unos segundos.',
            });

            return false;
        } finally {
            setIsEnabling(false);
        }
    }, [ensurePasswordConfirmed, refreshSetupData, redirectToPasswordConfirmation]);

    const confirmTwoFactor = useCallback(
        async (code: string): Promise<boolean> => {
            if (!await ensurePasswordConfirmed('enable')) {
                return false;
            }

            setIsConfirming(true);
            setErrors({});

            try {
                await requestJson(confirm.url(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code }),
                });

                setStatus('enabled');
                await refreshSetupData();

                return true;
            } catch (error) {
                if (error instanceof HttpError) {
                    if (error.status === 423) {
                        redirectToPasswordConfirmation('enable');

                        return false;
                    }

                    if (error.status === 422) {
                        setErrors({
                            code:
                                parseValidationMessage(error.payload, 'code') ??
                                'El código introducido no es válido.',
                        });

                        return false;
                    }
                }

                setErrors({
                    general:
                        'No se pudo confirmar el código TOTP. Inténtalo de nuevo.',
                });

                return false;
            } finally {
                setIsConfirming(false);
            }
        },
        [ensurePasswordConfirmed, refreshSetupData, redirectToPasswordConfirmation],
    );

    const disableTwoFactor = useCallback(async (): Promise<boolean> => {
        if (!await ensurePasswordConfirmed('disable')) {
            return false;
        }

        setIsDisabling(true);
        setErrors({});

        try {
            await requestJson(disable.url(), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            setStatus('disabled');
            clearSetupData();

            return true;
        } catch (error) {
            if (error instanceof HttpError && error.status === 423) {
                redirectToPasswordConfirmation('disable');

                return false;
            }

            setErrors({
                general:
                    'No se pudo desactivar el 2FA. Inténtalo de nuevo.',
            });

            return false;
        } finally {
            setIsDisabling(false);
        }
    }, [ensurePasswordConfirmed, clearSetupData, redirectToPasswordConfirmation]);

    const regenerateCodes = useCallback(async (): Promise<boolean> => {
        if (!await ensurePasswordConfirmed('regenerate')) {
            return false;
        }

        setIsRegenerating(true);
        setErrors({});

        try {
            await requestJson(regenerateRecoveryCodes.url(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
            });

            await refreshSetupData();

            return true;
        } catch (error) {
            if (error instanceof HttpError && error.status === 423) {
                redirectToPasswordConfirmation('regenerate');

                return false;
            }

            setErrors({
                general:
                    'No se pudieron regenerar los códigos de recuperación. Inténtalo de nuevo.',
            });

            return false;
        } finally {
            setIsRegenerating(false);
        }
    }, [ensurePasswordConfirmed, refreshSetupData, redirectToPasswordConfirmation]);

    return {
        status,
        qrCodeSvg,
        manualSetupKey,
        recoveryCodesList,
        errors,
        isRefreshingSetup,
        isEnabling,
        isConfirming,
        isDisabling,
        isRegenerating,
        clearErrors,
        clearSetupData,
        refreshSetupData,
        enableTwoFactor,
        confirmTwoFactor,
        disableTwoFactor,
        regenerateCodes,
    };
};
