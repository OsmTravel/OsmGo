/// <reference lib="webworker" />

import { convert } from '../../../scripts/osmToOsmgo/index.js'

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
}

addEventListener('message', (event) => {
    try {
        const input = event.data
        const data = convert(input.osmData, {
            tagConfig: input.tagsConfig,
            primaryKeys: input.primaryKeys,
            oldGeojson: input.oldGeojson,
            geojsonChanged: input.geojsonChanged,
            oldBboxFeature: input.oldBboxFeature,
            limitFeatures: input.limitFeatures,
        })
        postMessage({ ok: true, data })
    } catch (error) {
        postMessage({ ok: false, error: getErrorMessage(error) })
    }
})
