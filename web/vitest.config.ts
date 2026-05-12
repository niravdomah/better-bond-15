import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: [
      'src/**/__tests__/**/*.[jt]s?(x)',
      'src/**/?(*.)+(test).[jt]s?(x)',
    ],
    exclude: [
      'node_modules/',
      '**/*.spec.[jt]s',
      'src/**/__tests__/helpers/**',
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.stories.{js,jsx,ts,tsx}',
        'src/**/__tests__/**',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // vitest-axe@0.1.0: matchers sub-path has no package.json export condition.
      // Alias it directly to the dist file so Vite can resolve it.
      {
        find: 'vitest-axe/matchers',
        replacement: path.resolve(
          __dirname,
          './node_modules/vitest-axe/dist/matchers.js',
        ),
      },
      // Internal alias used by the shim so it can import the real vitest-axe main
      // entry without triggering the 'vitest-axe' alias again (circular).
      {
        find: '__vitest_axe_real__',
        replacement: path.resolve(
          __dirname,
          './node_modules/vitest-axe/dist/index.js',
        ),
      },
      // vitest-axe@0.1.0 main entry exports axe/configureAxe but NOT toHaveNoViolations.
      // Alias to a local shim that re-exports both axe and toHaveNoViolations.
      {
        find: 'vitest-axe',
        replacement: path.resolve(__dirname, './src/__mocks__/vitest-axe.ts'),
      },
    ],
  },
});
