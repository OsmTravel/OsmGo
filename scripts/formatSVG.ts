// redimensionne et harmonise les path des SVG à 15px (min) et
import fs from 'fs'
// import * as cheerio from 'cheerio'
const cheerio = require('cheerio') // TODO @dotcs: typings are wrong
import path from 'path'
import parse from 'parse-svg-path'
import scale from 'scale-svg-path'
import serialize from 'serialize-svg-path'
import { iconsSvgDir } from './_paths'

console.info('Format SVGs')

const blackList: string[] = [
    'none.svg',
    'Delete.svg',
    'Create.svg',
    'Update.svg',
    'arrow-position.svg',
    'Old.svg',
    'Fixme.svg',
    'maki-circle-custom.svg',
]

const listOfSvgsName: string[] = fs
    .readdirSync(iconsSvgDir)
    .filter((svgName) => blackList.indexOf(svgName) == -1)
    .filter((svgName) => path.extname(svgName) == '.svg')

for (let i = 0; i < listOfSvgsName.length; i++) {
    const pathSvg = path.join(iconsSvgDir, listOfSvgsName[i])
    const svgStr = fs.readFileSync(pathSvg, 'utf8')
    const _$ = cheerio.load(svgStr)

    const viewBox = _$('svg').attr('viewBox')
    let viewBoxSize = []
    if (!viewBox) {
        const svgW = Number(
            _$('svg')
                .attr('width')
                .match(/[\d,\.]+/gi)
        )
        const svgH = Number(
            _$('svg')
                .attr('height')
                .match(/[\d,\.]+/gi)
        )
        viewBoxSize = [0, 0, svgW, svgH]
    } else {
        viewBoxSize = viewBox.split(' ')
    }
    const vBWidth = Number(viewBoxSize[2]) - Number(viewBoxSize[0])
    const vBHeight = Number(viewBoxSize[3]) - Number(viewBoxSize[1])
    const dimMin = vBHeight < vBWidth ? vBHeight : vBWidth
    const dimMax = vBHeight < vBWidth ? vBWidth : vBHeight
    if (dimMin != 15) {
        // console.log(dimMin)
    }

    const factorMax = 15 / dimMax

    const maxSide = vBHeight < vBWidth ? 'w' : 'h'

    const ratioMax = maxSide == 'h' ? vBWidth / vBHeight : vBHeight / vBWidth
    // le coté le plus grand sera de 15px

    const outHMax = maxSide == 'h' ? 15 : 15 * ratioMax
    const outWMax = maxSide == 'w' ? 15 : 15 * ratioMax

    const _path = _$('path')
    let newPaths = []

    for (let i = 0; i < _path.length; i++) {
        const _pathD = _path[i].attribs['d']
        const path = parse(_pathD)
        const x = scale(path, factorMax)

        const newPath = `<path d="${serialize(x)}" fill="#FFFFFF"/>`
        newPaths.push(newPath)
    }

    const newSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="${outWMax}px" height="${outHMax}px" viewBox="0 0 ${outWMax} ${outHMax}" style="enable-background:new 0 0 15 15;" space="preserve">
    ${newPaths.join(' ')}
    </svg>`

    fs.writeFileSync(path.join(iconsSvgDir, listOfSvgsName[i]), newSvg, 'utf8')
}
