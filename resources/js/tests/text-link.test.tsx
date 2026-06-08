import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TextLink from '@/components/text-link';

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        children?: React.ReactNode;
    }) => <a {...props}>{children}</a>,
}));

describe('TextLink', () => {
    it('renders an element with the text passed as children', () => {
        render(<TextLink href="/test">Click here</TextLink>);
        expect(screen.getByText('Click here')).toBeInTheDocument();
    });
});
