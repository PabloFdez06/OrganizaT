import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        setupFiles: ['resources/js/tests/setup.ts'],
        include: ['resources/js/**/*.test.{ts,tsx}'],
    },
});
