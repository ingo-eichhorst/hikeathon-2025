import { defineConfig } from 'vitest/config'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  // @ts-expect-error - type issue with config
  test: {
    environment: 'nuxt',
    globals: true,
    exclude: ['test/e2e/**/*', 'node_modules/**/*'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/[.]**',
        'packages/*/test/**',
        '**/*.d.ts',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.{eslint,mocha,prettier}rc.{js,cjs,yml}',
        '**/test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/test-*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*{.,-}test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/*{.,-}spec.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        '**/tests/**',
        '**/__tests__/**',
        '**/.nuxt/**',
        '**/supabase/**',
        '**/public/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    setupFiles: ['./test/setup.ts'],
    testTimeout: 10000
  }
})