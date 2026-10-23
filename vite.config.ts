import { defineConfig } from 'vite';

export default defineConfig({
  worker: {
    format: 'es'
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 600
  },
  // @ts-expect-error vitest types inline config
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
