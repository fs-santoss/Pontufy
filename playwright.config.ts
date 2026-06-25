import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3457',
    headless: true,
    launchOptions: {
      executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    },
  },
});
