import * as React from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = React.ComponentProps<'main'> & {
    variant?: AppVariant;
};

export function AppContent({ variant = 'sidebar', children, ...props }: Props) {
    if (variant === 'sidebar') {
        return <SidebarInset id="main-content" {...props}>{children}</SidebarInset>;
    }

    return (
        <main
            id="main-content"
            className=""
            {...props}
        >
            {children}
        </main>
    );
}
