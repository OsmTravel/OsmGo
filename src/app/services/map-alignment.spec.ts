import {
    Map as MapLibreMap,
    type StyleSpecification,
    setWorkerUrl,
} from 'maplibre-gl'

import { getMarkerLayout, MapService } from './map.service'

describe('map marker alignment', () => {
    let container: HTMLDivElement
    let map: MapLibreMap

    beforeEach(() => {
        setWorkerUrl('/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs')
        container = document.createElement('div')
        container.style.position = 'relative'
        container.style.width = '320px'
        container.style.height = '240px'
        document.body.appendChild(container)
    })

    afterEach(() => {
        map?.remove()
        container.remove()
    })

    it('renders the marker tip at its OSM coordinate with a DPR 2 sprite', async () => {
        const coordinate: [number, number] = [34.8651317, 32.1931511]
        const style: StyleSpecification = {
            version: 8,
            sources: {},
            layers: [
                {
                    id: 'background',
                    type: 'background',
                    paint: { 'background-color': '#ffffff' },
                },
            ],
        }
        map = new MapLibreMap({
            container,
            style,
            center: coordinate,
            zoom: 19,
            pitch: 30,
            bearing: 90,
            interactive: false,
            attributionControl: false,
            canvasContextAttributes: { preserveDrawingBuffer: true },
        })

        await new Promise<void>((resolve, reject) => {
            map.once('error', reject)
            map.once('load', () => {
                const width = 48
                const height = 72
                const pixels = new Uint8Array(width * height * 4)
                for (let index = 0; index < pixels.length; index += 4) {
                    pixels[index] = 255
                    pixels[index + 3] = 255
                }

                map.addImage(
                    'test-marker',
                    { width, height, data: pixels },
                    { pixelRatio: 2 }
                )
                map.addSource('point', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: { marker: 'test-marker' },
                        geometry: { type: 'Point', coordinates: coordinate },
                    },
                })
                map.addLayer({
                    id: 'marker',
                    type: 'symbol',
                    source: 'point',
                    layout: getMarkerLayout(),
                })
                const mapService = Object.create(
                    MapService.prototype
                ) as MapService
                const moveMarker = mapService
                    .createDomMoveMarker(coordinate, null)
                    .addTo(map)
                const moveMarkerElement = moveMarker.getElement()
                moveMarkerElement.style.position = 'absolute'
                moveMarkerElement.style.top = '0'
                moveMarkerElement.style.left = '0'
                moveMarkerElement.style.width = '24px'
                moveMarkerElement.style.height = '36px'

                map.once('idle', () => {
                    try {
                        const mapCanvas = map.getCanvas()
                        const capture = document.createElement('canvas')
                        capture.width = mapCanvas.width
                        capture.height = mapCanvas.height
                        const context = capture.getContext('2d')
                        if (!context) {
                            throw new Error(
                                'Unable to create a canvas context.'
                            )
                        }
                        context.drawImage(mapCanvas, 0, 0)
                        const image = context.getImageData(
                            0,
                            0,
                            capture.width,
                            capture.height
                        )

                        let left = capture.width
                        let right = 0
                        let bottom = 0
                        for (let y = 0; y < capture.height; y++) {
                            for (let x = 0; x < capture.width; x++) {
                                const index = (y * capture.width + x) * 4
                                if (
                                    image.data[index] > 200 &&
                                    image.data[index + 1] < 50
                                ) {
                                    left = Math.min(left, x)
                                    right = Math.max(right, x)
                                    bottom = Math.max(bottom, y + 1)
                                }
                            }
                        }

                        const scale = mapCanvas.width / container.clientWidth
                        const projected = map.project(coordinate)
                        const markerCenter = (left + right + 1) / 2 / scale
                        const markerBottom = bottom / scale
                        const canvasBounds = mapCanvas.getBoundingClientRect()
                        const moveMarkerBounds = moveMarker
                            .getElement()
                            .getBoundingClientRect()
                        const moveMarkerCenter =
                            moveMarkerBounds.left +
                            moveMarkerBounds.width / 2 -
                            canvasBounds.left
                        const moveMarkerBottom =
                            moveMarkerBounds.bottom - canvasBounds.top
                        expect(markerCenter).toBeCloseTo(projected.x, 0)
                        expect(markerBottom).toBeCloseTo(projected.y, 0)
                        expect(moveMarkerCenter).toBeCloseTo(projected.x, 0)
                        expect(moveMarkerBottom).toBeCloseTo(projected.y, 0)
                        moveMarker.remove()
                        resolve()
                    } catch (error) {
                        reject(error)
                    }
                })
            })
        })
    })
})
