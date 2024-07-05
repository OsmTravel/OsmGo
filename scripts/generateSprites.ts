import fs from 'fs-extra'
import path from 'path'
// import * as cheerio from 'cheerio'
import cheerio from 'cheerio'
// const cheerio = require('cheerio') // TODO @dotcs: typings are wrong
import { parseString } from 'xml2js'
import svgRender from 'svg-render'
import Spritesmith from 'spritesmith'
import { assetsDir, iconsSvgDir } from './_paths'

export const generateSprites = () => {
    let iconsUsed = []
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

    let iconsSVG = []

    const generateMarkerColor = (colorMarker) => {
        let pathMarkerXMLCircle: string
        let pathMarkerXMLSquare: string
        parseString(
            fs
                .readFileSync(path.join(markersModelPath, 'marker-circle.svg'))
                .toString(),
            function (err, result) {
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
            function (err, result) {
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

        let $ = cheerio.load(iconSVG)
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

        $('path').attr('d', function (a, b) {
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

    const svgNames = fs.readdirSync(outputFolderSVG)
    // filtrer que les SVG
    const sizeOf = require('image-size')

    const svgToPNG = async (filePath, factor) => {
        const dimensions = sizeOf(filePath)
        const svgBuffer = fs.readFileSync(filePath)

        return await svgRender({
            buffer: svgBuffer,
            width: dimensions.width * factor,
            height: dimensions.height * factor,
        })
    }

    const generateSprites = async (outPath, factor = 1) => {
        const iconsPngPath = path.join(
            assetsDir,
            'mapStyle',
            'iconsPNG',
            `@${factor}`
        )
        const pngFolder = path.join(outputTmp, 'PNG', `@${factor}`)
        await fs.emptyDir(pngFolder)

        for (const markerColor of markerColorUsed) {
            // console.log(markerColor)
            const makerFileNames = [
                `circle-${markerColor}`,
                `square-${markerColor}`,
                `penta-${markerColor}`,
            ]
            makerFileNames.forEach(async (fileName) => {
                const filePath = path.join(outputFolderSVG, `${fileName}.svg`)
                const image = await svgToPNG(filePath, factor)
                const outputPath = path.join(pngFolder, `${fileName}.png`)
                fs.writeFileSync(outputPath, image)
            })
        }

        for (const iconName of [...whiteList, ...iconsUsed]) {
            const filePath = path.join(outputFolderSVG, `${iconName}.svg`)
            const image = await svgToPNG(filePath, factor)
            const outputPath = path.join(pngFolder, `${iconName}.png`)
            fs.writeFileSync(outputPath, image)
        }

        const pngsNameFile = fs.readdirSync(pngFolder)
        const sprites = pngsNameFile.map((n) => path.join(pngFolder, n))

        return new Promise((resolve, reject) => {
            Spritesmith.run(
                { src: sprites },
                async function handleResult(err, result) {
                    if (err) {
                        reject(err)
                    }

                    const outFileName =
                        factor === 1 ? 'sprites' : `sprites@${factor}x`
                    fs.writeFileSync(
                        path.join(outPath, outFileName + '.png'),
                        result.image
                    )

                    const jsonSprites = {}
                    for (const k in result.coordinates) {
                        const basename = path.basename(k).replace('.png', '')
                        jsonSprites[basename] = {
                            ...result.coordinates[k],
                            pixelRatio: factor,
                        }
                    }
                    fs.writeFileSync(
                        path.join(outPath, outFileName + '.json'),
                        JSON.stringify(jsonSprites)
                    )
                    await fs.remove(pngFolder)

                    resolve({
                        json: path.join(outPath, outFileName + '.json'),
                        png: path.join(outPath, outFileName + '.png'),
                    })
                }
            )
        })
    }

    return Promise.all([
        generateSprites(outPath, 1),
        generateSprites(outPath, 2),
    ]).then((e) => {
        console.log('END')
        fs.removeSync(outputTmp)
    })
}
