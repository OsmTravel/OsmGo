importScripts('../osmToOsmgo.min.js')

function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error)
}

function formatOsmData(event) {
    try {
        const input = event.data
        const data = osmToOsmgo.convert(input.osmData, {
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
}

addEventListener('message', formatOsmData, false)
