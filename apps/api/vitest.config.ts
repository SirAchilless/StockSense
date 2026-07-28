import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      JWT_ACCESS_SECRET: 'test-access-secret-please-change',
      JWT_REFRESH_SECRET: 'test-refresh-secret-please-change',
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://localhost:5432/stocksense_test',
    },
    include: ['src/**/*.test.ts'],
  },
});
