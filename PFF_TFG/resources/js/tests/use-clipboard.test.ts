import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useClipboard } from '@/hooks/use-clipboard';

describe('useClipboard', () => {
    it('exposes copy as a function', () => {
        const { result } = renderHook(() => useClipboard());
        const [, copy] = result.current;
        expect(typeof copy).toBe('function');
    });

    it('initial copied value is falsy (not copied)', () => {
        const { result } = renderHook(() => useClipboard());
        const [copiedText] = result.current;
        expect(copiedText).toBeFalsy();
    });
});
