import assert from 'assert'
import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import sharp from 'sharp'
import { generateSpriteSheet, renderSvgToPng } from './generateSprites'

const fixtureColors: Record<string, number[]> = {
    'circle-test': [255, 0, 0],
    'square-test': [0, 255, 0],
    'penta-test': [0, 0, 255],
}
const fileNames = Object.keys(fixtureColors)

const delay = (milliseconds: number) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds))

const run = async () => {
    const temporaryRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), 'osmgo-sprites-')
    )
    const inputFolder = path.join(temporaryRoot, 'svg')
    const outputFolder = path.join(temporaryRoot, 'output')

    try {
        await fs.ensureDir(inputFolder)
        for (const fileName of fileNames) {
            const color = fixtureColors[fileName].join(',')
            const fixtureSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2">
    <rect width="2" height="2" fill="rgb(${color})" />
</svg>`
            await fs.writeFile(
                path.join(inputFolder, `${fileName}.svg`),
                fixtureSvg
            )
        }

        const render = async (filePath: string, factor: number) => {
            if (path.basename(filePath) === 'penta-test.svg') {
                await delay(50)
            }
            return renderSvgToPng(filePath, factor)
        }

        await Promise.all(
            [1, 2].map((factor) =>
                generateSpriteSheet({
                    fileNames,
                    inputFolder,
                    outputFolder,
                    temporaryFolder: path.join(temporaryRoot, `png-${factor}`),
                    factor,
                    render,
                })
            )
        )

        for (const factor of [1, 2]) {
            const outputName = factor === 1 ? 'sprites' : 'sprites@2x'
            const pngPath = path.join(outputFolder, `${outputName}.png`)
            const jsonPath = path.join(outputFolder, `${outputName}.json`)
            const sprites = JSON.parse(await fs.readFile(jsonPath, 'utf8'))
            const metadata = await sharp(pngPath).metadata()

            assert((await fs.stat(pngPath)).size > 0)
            assert.strictEqual(metadata.format, 'png')
            assert.deepStrictEqual(
                Object.keys(sprites).sort(),
                [...fileNames].sort()
            )
            const spriteValues = fileNames.map((fileName) => sprites[fileName])
            assert.strictEqual(
                metadata.width,
                Math.max(
                    ...spriteValues.map((sprite) => sprite.x + sprite.width)
                )
            )
            assert.strictEqual(
                metadata.height,
                Math.max(
                    ...spriteValues.map((sprite) => sprite.y + sprite.height)
                )
            )
            for (const fileName of fileNames) {
                const sprite = sprites[fileName]
                assert.strictEqual(sprite.pixelRatio, factor)
                assert.strictEqual(sprite.width, 2 * factor)
                assert.strictEqual(sprite.height, 2 * factor)

                const pixel = await sharp(pngPath)
                    .extract({
                        left: sprite.x,
                        top: sprite.y,
                        width: 1,
                        height: 1,
                    })
                    .raw()
                    .toBuffer()
                assert.deepStrictEqual(
                    Array.from(pixel.subarray(0, 3)),
                    fixtureColors[fileName]
                )
            }
        }
    } finally {
        await fs.remove(temporaryRoot)
    }
}

run().catch((error) => {
    console.error(error)
    process.exitCode = 1
})
