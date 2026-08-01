import assert from 'assert'
import os from 'os'
import path from 'path'
import fs from 'fs-extra'
import svgRender from 'svg-render'
import { generateSpriteSheet } from './generateSprites'

const fileNames = ['circle-test', 'square-test', 'penta-test']
const fixtureSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2">
    <rect width="2" height="2" fill="#008000" />
</svg>`

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
            await fs.writeFile(
                path.join(inputFolder, `${fileName}.svg`),
                fixtureSvg
            )
        }

        const render = async (filePath: string, factor: number) => {
            if (path.basename(filePath) === 'penta-test.svg') {
                await delay(50)
            }
            return svgRender({
                buffer: await fs.readFile(filePath),
                width: 2 * factor,
                height: 2 * factor,
            })
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

            assert((await fs.stat(pngPath)).size > 0)
            assert.deepStrictEqual(
                Object.keys(sprites).sort(),
                [...fileNames].sort()
            )
            for (const fileName of fileNames) {
                assert.strictEqual(sprites[fileName].pixelRatio, factor)
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
