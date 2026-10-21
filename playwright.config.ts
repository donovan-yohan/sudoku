import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: './test-results/ui',
  use: { baseURL: process.env.SUDOKU_URL || 'http://127.0.0.1:5175', browserName: 'chromium', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: true, timeout: 30_000 },
})
