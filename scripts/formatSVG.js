// redimensionne et harmonise les path des SVG à 15px (min) et 
const fs = require('fs')
const cheerio = require('cheerio');
const path = require('path');
var parse = require('parse-svg-path')
var scale = require('scale-svg-path')
var serialize = require('serialize-svg-path')

console.info('Format SVGs')

const iconsSVGsPath = path.join(__dirname, '..','resources', 'IconsSVG');
const blackList = ['none.svg', 'Delete.svg', 'Create.svg', 'Update.svg', 'arrow-position.svg', 'Old.svg', 'Fixme.svg', 'maki-circle-custom.svg'];

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
    const dimMin = (vBHeight < vBWidth) ? vBHeight : vBWidth;
    const dimMax = (vBHeight < vBWidth) ? vBWidth : vBHeight
    if (dimMin != 15){
        // console.log(dimMin)
    }
 
    const factorMax = 15 / dimMax
    
    let maxSide = (vBHeight < vBWidth ) ? 'w': 'h';

    const ratioMax = maxSide == 'h' ? vBWidth/vBHeight : vBHeight/vBWidth
    // le coté le plus grand sera de 15px

    let outHMax = (maxSide == 'h') ? 15 : 15 * ratioMax;
    let outWMax = (maxSide == 'w') ? 15 : 15 * ratioMax;
  

    _path = _$('path');
    let newPaths = [];
  
    for (let i  = 0; i < _path.length; i++){
        const _pathD = _path[i].attribs['d']
        let path = parse(_pathD)        
        var x = scale(path, factorMax);

        const newPath = `<path d="${serialize(x)}" fill="#FFFFFF"/>`
        newPaths.push(newPath)
    }

    const newSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="${outWMax}px" height="${outHMax}px" viewBox="0 0 ${outWMax} ${outHMax}" style="enable-background:new 0 0 15 15;" space="preserve">
    ${newPaths.join(' ')}
    </svg>`

    fs.writeFileSync(path.join(iconsSVGsPath,listOfSvgsName[i]), newSvg, 'utf8')
}


