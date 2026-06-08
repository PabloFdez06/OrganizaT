export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    two_factor_pending_confirmation?: boolean;
    created_at: string;
    updated_at: string;
    role: 'admin' | 'user';
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    role?: 'admin' | 'user' | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
