import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    workerIdleMemoryLimit: '1024MB',
    maxWorkers: 1,
    maxConcurrency: 1,
    fileParallelism: false,
    isolate: true,
    sequence: {
      concurrent: false
    },
    teardownTimeout: 10000,
    forceRerunTriggers: ['**/test/**'],
    poolOptions: {
      threads: {
        maxThreads: 1,
        minThreads: 1,
        isolate: false
      },
      workers: {
        singleWorker: true,
        wrangler: {
          configPath: './wrangler.jsonc'
        },
        miniflare: {
          bindings: {
            GOOGLE_CLIENT_ID: 'test-client-id',
            GOOGLE_CLIENT_SECRET: 'test-client-secret',
            GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
            GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
          }
        },
        isolatedStorage: false
      }
    },
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.ts'],
      enabled: true,
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      clean: true,
      thresholds: {
        'src/api/drive/upload.ts': {
          lines: 85,
          functions: 100,
          branches: 74,
          statements: 83
        }
      }
    }
  },
  define: {
    global: 'globalThis',
  }
})