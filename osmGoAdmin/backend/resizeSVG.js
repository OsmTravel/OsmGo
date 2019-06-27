// redimensionne et harmonise les path des SVG à 15px (min) et 
const fs = require('fs')
const cheerio = require('cheerio');
const path = require('path');
var parse = require('parse-svg-path')
var scale = require('scale-svg-path')
var serialize = require('serialize-svg-path')

const iconsSVGsPath = path.join(__dirname, './data/SvgForSprites/SVGs/');
const blackList = ['none.svg', 'Delete.svg', 'Create.svg', 'Update.svg', 'arrow-position.svg'];
const listOfSvgsName = fs.readdirSync(iconsSVGsPath)
    .filter(svgName => blackList.indexOf(svgName) == -1)
    .filter(svgName => path.extname(svgName) == '.svg')

for (let i = 0; i < listOfSvgsName.length; i++) {
    const pathSvg = path.join(iconsSVGsPath, listOfSvgsName[i]);
    let svgStr = fs.readFileSync(pathSvg, 'utf8');
    let _$ = cheerio.load(svgStr)

    let viewBox = _$('svg').attr('viewBox')
    let viewBoxSize = [];
    if (!viewBox){
        const svgW = Number(_$('svg').attr('width').match(/[\d,\.]+/gi));
        const svgH = Number(_$('svg').attr('height').match(/[\d,\.]+/gi));
        viewBoxSize = [0,0,svgW,svgH ]
        
    } else {
        viewBoxSize = viewBox.split(' ');
    }
    const vBWidth = Number(viewBoxSize[2]) - Number(viewBoxSize[0])
    const vBHeight = Number(viewBoxSize[3]) - Number(viewBoxSize[1])
    const dimMin = (vBHeight < vBWidth) ? vBHeight : vBWidth
    if (dimMin != 15){
        // console.log(dimMin)
    }
    const factor = 15 / dimMin
    
    let minSide = (vBHeight < vBWidth ) ? 'h' : 'w';

    const ratio= minSide == 'h' ? vBWidth/vBHeight : vBHeight/vBWidth
    // le coté le plus petit sera de 15px
    let outH = (minSide == 'h') ? 15 : 15 * ratio;
    let outW = (minSide == 'w') ? 15 : 15 * ratio;
    if (outW > 20){
        console.log('trop large! ', listOfSvgsName[i] )
    }

    _path = _$('path');
    let newPaths = []
    for (let i  = 0; i < _path.length; i++){
        const _pathD = _path[i].attribs['d']
        let path = parse(_pathD)
        var x = scale(path, factor)
        const newPath = `<path d="${serialize(x)}" fill="#FFFFFF"/>`
        newPaths.push(newPath)
    }


    const newSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="${outW}px" height="${outH}px" viewBox="0 0 ${outW} ${outH}" style="enable-background:new 0 0 15 15;" space="preserve">
    ${newPaths.join(' ')}
    </svg>`

    fs.writeFileSync(path.join(iconsSVGsPath,listOfSvgsName[i]), newSvg, 'utf8')
    // fa-chess-knight-solid.svg
}


