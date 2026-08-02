// import * as cheerio from 'cheerio'
import cheerio from 'cheerio'
import fs from 'fs-extra'
import path from 'path'
import sharp from 'sharp'
// const cheerio = require('cheerio') // TODO @dotcs: typings are wrong
import { parseString } from 'xml2js'
import { assetsDir, iconsSvgDir } from './_paths'

type SvgRenderer = (filePath: string, factor: number) => Promise<Buffer>

interface SpriteSheetOptions {
    fileNames: string[]
    inputFolder: string
    outputFolder: string
    temporaryFolder: string
    factor: number
    render: SvgRenderer
}

interface SpriteResult {
    image: Buffer
    coordinates: Record<string, Record<string, number>>
}

const packSprites = async (
    sprites: string[],
    factor: number
): Promise<SpriteResult> => {
    const maxRowWidth = 1024 * factor
    const coordinates: Record<string, Record<string, number>> = {}
    const composite: sharp.OverlayOptions[] = []
    let x = 0
    let y = 0
    let rowHeight = 0
    let sheetWidth = 0

    for (const filePath of sprites) {
        const image = await fs.readFile(filePath)
        const metadata = await sharp(image).metadata()
        if (!metadata.width || !metadata.height) {
            throw new Error(
                `Cannot read rendered sprite dimensions: ${filePath}`
            )
        }
        if (x > 0 && x + metadata.width > maxRowWidth) {
            x = 0
            y += rowHeight
            rowHeight = 0
        }
        coordinates[filePath] = {
            x,
            y,
            width: metadata.width,
            height: metadata.height,
        }
        composite.push({ input: image, left: x, top: y })
        x += metadata.width
        rowHeight = Math.max(rowHeight, metadata.height)
        sheetWidth = Math.max(sheetWidth, x)
    }

    const sheetHeight = y + rowHeight
    if (!sheetWidth || !sheetHeight) {
        throw new Error('Cannot generate an empty sprite sheet.')
    }
    const image = await sharp({
        create: {
            width: sheetWidth,
            height: sheetHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite(composite)
        .png()
        .toBuffer()

    return { image, coordinates }
}

const commitSpritePair = async (
    stagedPngPath: string,
    stagedJsonPath: string,
    pngPath: string,
    jsonPath: string
): Promise<void> => {
    const suffix = `${process.pid}-${Date.now()}`
    const pngBackup = `${pngPath}.backup-${suffix}`
    const jsonBackup = `${jsonPath}.backup-${suffix}`
    const hadPng = await fs.pathExists(pngPath)
    const hadJson = await fs.pathExists(jsonPath)
    let commitStarted = false

    try {
        if (hadPng) await fs.copy(pngPath, pngBackup)
        if (hadJson) await fs.copy(jsonPath, jsonBackup)
        commitStarted = true
        await fs.move(stagedPngPath, pngPath, { overwrite: true })
        await fs.move(stagedJsonPath, jsonPath, { overwrite: true })
        await fs.remove(pngBackup)
        await fs.remove(jsonBackup)
    } catch (error) {
        if (commitStarted) {
            if (hadPng && (await fs.pathExists(pngBackup))) {
                await fs.copy(pngBackup, pngPath, { overwrite: true })
            } else if (!hadPng) {
                await fs.remove(pngPath)
            }
            if (hadJson && (await fs.pathExists(jsonBackup))) {
                await fs.copy(jsonBackup, jsonPath, { overwrite: true })
            } else if (!hadJson) {
                await fs.remove(jsonPath)
            }
        }
        await fs.remove(pngBackup)
        await fs.remove(jsonBackup)
        throw error
    }
}

export const renderSvgToPng: SvgRenderer = async (filePath, factor) => {
    const image = sharp(filePath)
    const metadata = await image.metadata()
    if (!metadata.width || !metadata.height) {
        throw new Error(`Cannot read SVG dimensions: ${filePath}`)
    }

    return image
        .resize(metadata.width * factor, metadata.height * factor)
        .png()
        .toBuffer()
}

export const generateSpriteSheet = async ({
    fileNames,
    inputFolder,
    outputFolder,
    temporaryFolder,
    factor,
    render,
}: SpriteSheetOptions) => {
    await fs.emptyDir(temporaryFolder)
    await fs.ensureDir(outputFolder)

    for (const fileName of fileNames) {
        const image = await render(
            path.join(inputFolder, `${fileName}.svg`),
            factor
        )
        await fs.writeFile(path.join(temporaryFolder, `${fileName}.png`), image)
    }

    const pngFileNames = (await fs.readdir(temporaryFolder)).sort()
    const sprites = pngFileNames.map((fileName) =>
        path.join(temporaryFolder, fileName)
    )
    const result = await packSprites(sprites, factor)

    const outputName = factor === 1 ? 'sprites' : `sprites@${factor}x`
    const pngPath = path.join(outputFolder, `${outputName}.png`)
    const jsonPath = path.join(outputFolder, `${outputName}.json`)
    const stagedPngPath = path.join(temporaryFolder, `${outputName}.png`)
    const stagedJsonPath = path.join(temporaryFolder, `${outputName}.json`)
    await fs.writeFile(stagedPngPath, result.image)

    const jsonSprites: Record<string, Record<string, number>> = {}
    for (const filePath in result.coordinates) {
        const basename = path.basename(filePath).replace('.png', '')
        jsonSprites[basename] = {
            ...result.coordinates[filePath],
            pixelRatio: factor,
        }
    }
    await fs.writeFile(stagedJsonPath, JSON.stringify(jsonSprites))

    const validatedJson = JSON.parse(await fs.readFile(stagedJsonPath, 'utf8'))
    const metadata = await sharp(stagedPngPath).metadata()
    if (
        metadata.format !== 'png' ||
        !metadata.width ||
        !metadata.height ||
        Object.keys(validatedJson).length !== fileNames.length
    ) {
        throw new Error(`Generated ${outputName} assets failed validation.`)
    }

    await commitSpritePair(stagedPngPath, stagedJsonPath, pngPath, jsonPath)
    await fs.remove(temporaryFolder)

    return { json: jsonPath, png: pngPath }
}

export const generateSprites = () => {
    const iconsUsed = []
    const markerColorUsed = []

    const markersModelPath = path.join(
        __dirname,
        '..',
        'resources',
        'markersModel'
    )
    const tagsPath = path.join(
        __dirname,
        '..',
        'src',
        'assets',
        'tagsAndPresets',
        'tags.json'
    )
    const outputTmp = path.join(__dirname, 'tmp')
    const outputFolderSVG = path.join(outputTmp, 'SVG')

    const outPath = path.join(assetsDir, 'mapStyle', 'sprites') // les sprites en sorti
    const outPathIconSprites = path.join(assetsDir) // les sprites en sorti

    fs.removeSync(outputTmp)
    fs.mkdirsSync(outputFolderSVG)

    const whiteList = [
        'none',
        'Delete',
        'Create',
        'Update',
        'Old',
        'Fixme',
        'location-without-orientation',
        'location-with-orientation',
    ]

    const iconsSVG = []

    const generateMarkerColor = (colorMarker) => {
        let pathMarkerXMLCircle: string
        let pathMarkerXMLSquare: string
        parseString(
            fs
                .readFileSync(path.join(markersModelPath, 'marker-circle.svg'))
                .toString(),
            (err, result) => {
                pathMarkerXMLCircle =
                    '<path fill="' +
                    colorMarker +
                    '" d="' +
                    result.svg.path[0].$.d +
                    '"></path>'
            }
        )

        const pathMarkerXMLPenta =
            '<polygon fill="' +
            colorMarker +
            '" points="12,36 24,12 18,0 6.017,0 0,12.016 "/>'

        parseString(
            fs
                .readFileSync(path.join(markersModelPath, 'marker-square.svg'))
                .toString(),
            (err, result) => {
                pathMarkerXMLSquare =
                    '<path fill="' +
                    colorMarker +
                    '" d="' +
                    result.svg.path[0].$.d +
                    '"></path>'
            }
        )

        const xmlHeader =
            '<?xml version="1.0" encoding="utf-8"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
            '<svg version="1.1" id="marker-circle-blue" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"  y="0px" width="24px" height="36px" viewBox="0 0 24 36" enable-background="new 0 0 24 36" xml:space="preserve">'

        const xmlEnd = '</svg>'

        const SVGcircle = xmlHeader + pathMarkerXMLCircle + xmlEnd
        fs.writeFileSync(
            path.join(outputFolderSVG, 'circle-' + colorMarker + '.svg'),
            SVGcircle
        )

        const SVGpenta = xmlHeader + pathMarkerXMLPenta + xmlEnd
        fs.writeFileSync(
            path.join(outputFolderSVG, 'penta-' + colorMarker + '.svg'),
            SVGpenta
        )

        const SVGsquare = xmlHeader + pathMarkerXMLSquare + xmlEnd
        fs.writeFileSync(
            path.join(outputFolderSVG, 'square-' + colorMarker + '.svg'),
            SVGsquare
        )
    }

    const generateIcons = (iconName, colorIcon = '#ffffff') => {
        let iconSVG: string

        iconSVG = fs
            .readFileSync(path.join(iconsSvgDir, iconName + '.svg'))
            .toString()

        const $ = cheerio.load(iconSVG)
        let pathIconXMLstr = ''

        let width: number
        let height: number
        $('svg').attr('width', (a, b) => {
            width = Number(b.replace('px', ''))
            return width + 'px'
        })

        $('svg').attr('height', (a, b) => {
            height = Number(b.replace('px', ''))
            return height + 'px'
        })

        const translateX = 4.5 + (15 - width) / 2 // width - 11.5
        const translateY = 4.5 + (15 - height) / 2

        $('path').attr('d', (a, b) => {
            pathIconXMLstr += `<path fill='${colorIcon}' transform='translate(${translateX} ${translateY})' d='${b}'></path> `
            return pathIconXMLstr
        })
        const iconDpath = $('path').attr('d')

        if (iconsSVG.indexOf(iconName) == -1) {
            iconsSVG.push(iconName)
        }

        const xmlHeader =
            '<?xml version="1.0" encoding="utf-8"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
            '<svg version="1.1" id="marker-circle-blue" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"  y="0px" width="24px" height="36px" viewBox="0 0 24 36" enable-background="new 0 0 24 36" xml:space="preserve">'

        const xmlEnd = '</svg>'

        fs.writeFileSync(
            path.join(outputFolderSVG, iconName + '.svg'),
            xmlHeader + iconDpath + xmlEnd
        )
    }

    const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'))
    console.log('génération des markers')

    for (let i = 0; i < tags.tags.length; i++) {
        if (tags.tags[i].icon && !iconsUsed.includes(tags.tags[i].icon)) {
            iconsUsed.push(tags.tags[i].icon)
        }
        if (
            tags.tags[i].markerColor &&
            !markerColorUsed.includes(tags.tags[i].markerColor)
        ) {
            markerColorUsed.push(tags.tags[i].markerColor)
        }
    }

    markerColorUsed.push('#000000')
    markerColorUsed.forEach((color) => {
        generateMarkerColor(color)
    })

    if (!iconsUsed.includes('maki-circle')) {
        iconsUsed.push('maki-circle')
    }

    if (!iconsUsed.includes('wiki-question')) {
        iconsUsed.push('wiki-question')
    }

    iconsUsed.forEach((iconName) => {
        generateIcons(iconName)
    })
    generateIcons('maki-circle-custom', '#d40000ff')

    for (let i = 0; i < whiteList.length; i++) {
        fs.copySync(
            path.join(iconsSvgDir, whiteList[i] + '.svg'),
            path.join(outputFolderSVG, whiteList[i] + '.svg')
        )
    }

    const markerFileNames = []
    for (const markerColor of markerColorUsed) {
        markerFileNames.push(
            `circle-${markerColor}`,
            `square-${markerColor}`,
            `penta-${markerColor}`
        )
    }
    const fileNames = [...markerFileNames, ...whiteList, ...iconsUsed]

    return Promise.all([
        generateSpriteSheet({
            fileNames,
            inputFolder: outputFolderSVG,
            outputFolder: outPath,
            temporaryFolder: path.join(outputTmp, 'PNG', '@1'),
            factor: 1,
            render: renderSvgToPng,
        }),
        generateSpriteSheet({
            fileNames,
            inputFolder: outputFolderSVG,
            outputFolder: outPath,
            temporaryFolder: path.join(outputTmp, 'PNG', '@2'),
            factor: 2,
            render: renderSvgToPng,
        }),
    ]).then((e) => {
        console.log('END')
        fs.removeSync(outputTmp)
    })
}
