import type { Auth } from '@/types/auth';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth & { role?: 'admin' | 'user' | null };
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
