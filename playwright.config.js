import { defineConfig } from '@playwright/test';

// Ports and report destinations are overridable so a verification run can claim
// its own API/browser pair — and its own reports — while another suite still
// holds the defaults. Two runs sharing one port silently truncate each other.
const webPort = Number(process.env.CFT_TEST_WEB_PORT || 5174);
const apiPort = Number(process.env.CFT_TEST_API_PORT || 5051);
const reports = process.env.CFT_TEST_REPORT_DIR || '../docs';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 10000 },
  outputDir: `${reports}/playwright-results`,
  reporter: [['list'], ['html', { outputFolder: `${reports}/playwright-report`, open: 'never' }], ['junit', { outputFile: `${reports}/playwright.junit.xml` }], ['json', { outputFile: `${reports}/playwright-results.json` }]],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    browserName: 'chromium',
    channel: 'msedge',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${webPort} --strictPort`,
    url: `http://127.0.0.1:${webPort}`,
    reuseExistingServer: false,
    env: { CFT_DEV_API_TARGET: `http://127.0.0.1:${apiPort}` },
    timeout: 30000,
  },
});
