const DEFAULT_TIMEOUT_MS = 10_000

export const fetchResponse = async (
    url: string,
    timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> => {
    let response: Response
    try {
        response = await fetch(url, {
            signal: AbortSignal.timeout(timeoutMs),
        })
    } catch (error) {
        if (error instanceof Error && error.name === 'TimeoutError') {
            throw new Error(`Request timed out after ${timeoutMs} ms: ${url}`)
        }
        throw error
    }

    if (!response.ok) {
        throw new Error(
            `Request failed with ${response.status} ${response.statusText}: ${url}`
        )
    }

    return response
}

export const fetchJson = async <T>(url: string): Promise<T> => {
    const response = await fetchResponse(url)
    return (await response.json()) as T
}
