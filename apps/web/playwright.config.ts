import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8765',
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'uv run --frozen mtools serve --port 8765',
    cwd: '../..',
    url: 'http://127.0.0.1:8765/health/ready',
    reuseExistingServer: false,
    env: {
      MTOOLS_ALLOWED_ORIGINS: '["http://127.0.0.1:8765"]',
      MTOOLS_DATA_DIR: '.runtime/e2e',
    },
  },
});
