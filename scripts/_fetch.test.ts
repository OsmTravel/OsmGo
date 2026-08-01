import assert from 'node:assert/strict'
import { fetchJson, fetchResponse } from './_fetch'

const originalFetch = global.fetch

const run = async (): Promise<void> => {
    try {
        global.fetch = async () =>
            new Response(JSON.stringify({ name: 'Osm Go!' }), {
                headers: { 'content-type': 'application/json' },
            })

        assert.deepEqual(await fetchJson('https://example.test/data'), {
            name: 'Osm Go!',
        })

        global.fetch = async () =>
            new Response('Unavailable', {
                status: 503,
                statusText: 'Service Unavailable',
            })

        await assert.rejects(
            fetchJson('https://example.test/failure'),
            /503 Service Unavailable/
        )

        global.fetch = async (_input, init) =>
            new Promise((_resolve, reject) => {
                const fallback = setTimeout(() => {
                    reject(new Error('The timeout signal was not triggered'))
                }, 100)
                init.signal.addEventListener('abort', () => {
                    clearTimeout(fallback)
                    reject(init.signal.reason)
                })
            })

        await assert.rejects(
            fetchResponse('https://example.test/timeout', 5),
            /Request timed out after 5 ms/
        )
    } finally {
        global.fetch = originalFetch
    }

    console.log('Node fetch helper tests passed')
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
