import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInitials } from '@/hooks/use-initials';

describe('useInitials', () => {
    it('returns two uppercase initials for a full name', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('John Doe')).toBe('JD');
    });

    it('returns one uppercase initial for a single word name', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('Alice')).toBe('A');
    });

    it('returns empty string for an empty string', () => {
        const { result } = renderHook(() => useInitials());
        expect(result.current('')).toBe('');
    });
});
