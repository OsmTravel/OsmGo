import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './e2e/playwright',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:4173',
        locale: 'en-GB',
        viewport: { width: 800, height: 600 },
        deviceScaleFactor: 2,
        geolocation: { longitude: 2.2945, latitude: 48.8584 },
        permissions: ['geolocation'],
        serviceWorkers: 'block',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium-dpr-1',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 800, height: 600 },
                deviceScaleFactor: 1,
            },
        },
        {
            name: 'chromium-dpr-2',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 800, height: 600 },
                deviceScaleFactor: 2,
            },
        },
    ],
    webServer: {
        command: process.env.CI
            ? 'http-server www -p 4173 -c-1 --silent'
            : 'npm run build && http-server www -p 4173 -c-1 --silent',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
})
