import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'jsdom',
        server: {
            deps: {
                inline: [/@ionic/],
            },
        },
    },
})
