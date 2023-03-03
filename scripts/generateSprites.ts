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
    const iconsUsed = []
    const markerUsed = []

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

    let iconsSVG = []

    const generateMarkerIcon = (
        iconName,
        colorIcon,
        colorMarker,
        geometries = undefined,
        unknowTag = false
    ) => {
        if (!geometries) {
            geometries = ['point', 'vertex', 'area', 'line']
        }

        let iconSVG: string
        let pathMarkerXMLCircle: string
        let pathMarkerXMLSquare: string

        if (iconName == '') {
            if (unknowTag) {
                iconSVG = fs
                    .readFileSync(path.join(iconsSvgDir, 'wiki_question.svg'))
                    .toString()
            } else {
                iconSVG = fs
                    .readFileSync(path.join(iconsSvgDir, 'maki-circle.svg'))
                    .toString()
            }
        } else {
            iconSVG = fs
                .readFileSync(path.join(iconsSvgDir, iconName + '.svg'))
                .toString()
        }

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

        if (geometries.includes('point') || geometries.includes('vertex')) {
            const id = 'circle-' + colorMarker + '-' + iconName

            if (!markerUsed.includes(id)) {
                markerUsed.push(id)
                const SVGcircle =
                    xmlHeader + pathMarkerXMLCircle + pathIconXMLstr + xmlEnd
                fs.writeFileSync(
                    path.join(outputFolderSVG, id + '.svg'),
                    SVGcircle
                )
            }
        }

        if (geometries.includes('line')) {
            const id = 'penta-' + colorMarker + '-' + iconName
            if (!markerUsed.includes(id)) {
                markerUsed.push(id)
                const SVGpenta =
                    xmlHeader + pathMarkerXMLPenta + pathIconXMLstr + xmlEnd
                fs.writeFileSync(
                    path.join(outputFolderSVG, id + '.svg'),
                    SVGpenta
                )
            }
        }
        if (geometries.includes('area')) {
            const id = 'square-' + colorMarker + '-' + iconName
            if (!markerUsed.includes(id)) {
                markerUsed.push(id)
                const SVGsquare =
                    xmlHeader + pathMarkerXMLSquare + pathIconXMLstr + xmlEnd
                fs.writeFileSync(
                    path.join(outputFolderSVG, id + '.svg'),
                    SVGsquare
                )
            }
        }
    }

    const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'))
    console.log('génération des markers')
    let iconsMarkersStr = []

    for (let i = 0; i < tags.tags.length; i++) {
        if (tags.tags[i].icon && !iconsUsed.includes(tags.tags[i].icon)) {
            iconsUsed.push(tags.tags[i].icon)
        }
        let strIcM = tags.tags[i].markerColor + '|' + tags.tags[i].icon
        iconsMarkersStr.push(strIcM)
        generateMarkerIcon(
            tags.tags[i].icon,
            '#ffffff',
            tags.tags[i].markerColor,
            tags.tags[i].geometry
        )
    }

    // unknows tag config
    generateMarkerIcon(
        '',
        '#ffffff',
        '#000000',
        ['point', 'line', 'area'],
        true
    )

    // userTag
    generateMarkerIcon('maki-circle-custom', '#d40000ff', '#000000', [
        'point',
        'line',
        'area',
    ])
    iconsUsed.push('maki-circle-custom')

    //copy whiteliste
    const whiteList = ['none', 'Delete', 'Create', 'Update', 'Old', 'Fixme']

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
        const pngFolder = path.join(outputTmp, 'PNG', `@${factor}`)
        await fs.emptyDir(pngFolder)
        console.log(factor)
        console.log('length', svgNames.length)
        for (const svgFileName of svgNames) {
            const filePath = path.join(outputFolderSVG, svgFileName)
            const image = await svgToPNG(filePath, factor)

            if (/#000000-.svg/.test(svgFileName)) {
                console.log(svgFileName)
                const shape = svgFileName.split('-#')[0]
                fs.writeFileSync(
                    path.join(
                        assetsDir,
                        'mapStyle',
                        'unknown-marker',
                        `${shape}-unknown@${factor}X.png`
                    ),
                    image
                )
            }
            fs.writeFileSync(path.join(pngFolder, `${svgFileName}.png`), image)
        }

        const pngsNameFile = fs.readdirSync(pngFolder)
        const pngPaths = pngsNameFile.map((n) => path.join(pngFolder, n))
        var sprites = pngPaths

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
                    // await sharp(result.image).toFile(path.join(outPath, outFileName + '.png'))

                    const jsonSprites = {}
                    for (const k in result.coordinates) {
                        const basename = path
                            .basename(k)
                            .replace('.svg.png', '')
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

    // just icons sprites for interface
    const generateIconSprites = async (factor) => {
        console.info('Sprites for Ui X', factor)
        const pngFolder = path.join(outputTmp, 'PNG_icons')

        await fs.emptyDir(pngFolder)

        for (let svgFileName of iconsUsed) {
            const filePath = path.join(iconsSvgDir, `${svgFileName}.svg`)
            // copy SVG to assets

            const image = await svgToPNG(filePath, factor)
            fs.writeFileSync(path.join(pngFolder, `${svgFileName}.png`), image)
        }

        const pngsNameFile = fs.readdirSync(pngFolder)
        const pngPaths = pngsNameFile.map((n) => path.join(pngFolder, n))
        var sprites = pngPaths

        return new Promise((resolve, reject) => {
            Spritesmith.run(
                { src: sprites },
                async function handleResult(err, result) {
                    if (err) {
                        reject(err)
                    }

                    const outFileName = 'iconsSprites' // factor === 1 ? 'sprites' : `sprites@${factor}x`
                    fs.writeFileSync(
                        path.join(
                            outPathIconSprites,
                            `${outFileName}@x${factor}.png`
                        ),
                        result.image
                    )
                    // await sharp(result.image).toFile(path.join(outPath, outFileName + '.png'))

                    const jsonSprites = {}
                    for (const k in result.coordinates) {
                        // console.log(path.basename(k))
                        const basename = path.basename(k).replace('.png', '')
                        // console.log(basename)
                        jsonSprites[basename] = {
                            ...result.coordinates[k],
                            pixelRatio: factor,
                        }
                    }
                    fs.writeFileSync(
                        path.join(
                            outPathIconSprites,
                            `${outFileName}@x${factor}.json`
                        ),
                        JSON.stringify(jsonSprites)
                    )
                    await fs.remove(pngFolder)

                    resolve({
                        json: path.join(
                            outPath,
                            `${outFileName}@x${factor}.json`
                        ),
                        png: path.join(
                            outPath,
                            `${outFileName}@x${factor}.png`
                        ),
                    })
                }
            )
        })
    }

    return Promise.all([
        generateIconSprites(1),
        generateIconSprites(2),
        generateSprites(outPath, 1),
        generateSprites(outPath, 2),
    ]).then((e) => {
        console.log('END')
        fs.removeSync(outputTmp)
    })
}
