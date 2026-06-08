import viteConfig from './vite.config';
import { defineConfig, mergeConfig } from 'vitest/config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            setupFiles: ['resources/js/tests/setup.ts'],
            include: ['resources/js/**/*.test.{ts,tsx}'],
        },
    }),
);
