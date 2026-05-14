import { usePage } from '@inertiajs/react';
import { LayoutGrid, ShieldCheck, TerminalSquare } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as adminIndex } from '@/routes/admin';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { auth } = usePage().props;
    const isAdmin = auth.role === 'admin';

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Moodle Console',
            href: '/moodle-console',
            icon: TerminalSquare,
        },
        ...(isAdmin
            ? [
                  {
                      title: 'Panel de administración',
                      href: adminIndex().url,
                      icon: ShieldCheck,
                  } satisfies NavItem,
              ]
            : []),
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
