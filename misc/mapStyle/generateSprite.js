const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const parseString = require('xml2js').parseString;

const Spritesmith = require('spritesmith');
const sharp = require('sharp');


const iconsSVGsPath = path.join(__dirname,'../mapStyle/SvgForSprites/SVGs/');
const markersModelPath = path.join(__dirname,'../mapStyle/SvgForSprites/markersModel/');
const tagsPath = path.join(__dirname,'../../src/assets/tags/tags.json');
const outputFolderSVG = path.join(__dirname,'../../src/assets/mapStyle/IconsSVG/');


fs.removeSync(outputFolderSVG);
fs.mkdirsSync(outputFolderSVG);

let iconsSVG = [];
function exportIcons(iconName, iconSVGpath) {
    const iconSVGexport = '<?xml version="1.0" encoding="utf-8"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
        '<svg version="1.1" id="icon" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"  y="0px" width="15px" height="15px" viewBox="0 0 15 15" enable-background="new 0 0 15 15" xml:space="preserve">' +
        iconSVGpath +
        '</svg>';
    fs.writeFileSync( outputFolderSVG + iconName + '.svg', iconSVGexport)
}

function generateMarkerIcon(iconName, colorIcon, colorMarker, unknowTag = false) {
    let iconSVG ;
    if (iconName == '') {
         if (unknowTag){
            iconSVG = fs.readFileSync(iconsSVGsPath + 'wiki_question.svg').toString();
        }else{
            iconSVG = fs.readFileSync(iconsSVGsPath + 'maki-circle-15.svg').toString();
        }

    } else {
        iconSVG = fs.readFileSync(iconsSVGsPath + iconName + '.svg').toString();
    }


    parseString(fs.readFileSync(markersModelPath + 'marker-circle.svg').toString(), function (err, result) {
        pathMarkerXMLCircle = '<path fill="' + colorMarker + '" d="' + result.svg.path[0].$.d + '"></path>';
    });

    pathMarkerXMLPenta = '<polygon fill="' + colorMarker + '" points="12,36 24,12 18,0 6.017,0 0,12.016 "/>'

    parseString(fs.readFileSync(markersModelPath + 'marker-square.svg').toString(), function (err, result) {
        pathMarkerXMLSquare = '<path fill="' + colorMarker + '" d="' + result.svg.path[0].$.d + '"></path>';
    });


    let $ = cheerio.load(iconSVG)
    pathIconXMLstr = '';
    let iconSVGpath = ''
    $('path').attr('d', function (a, b) {
        pathIconXMLstr += '<path fill="' + colorIcon + '" transform="translate(4.5 4.5)" d="' + b + '"></path> ';
        iconSVGpath += '<path fill="#FFFFFF" d="' + b + '"></path> ';
    })
    iconDpath = $('path').attr('d');

    if (iconsSVG.indexOf(iconName) == -1) {
        iconsSVG.push(iconName)
        if (iconName !== ''){
             exportIcons(iconName, iconSVGpath);
        } else{
            exportIcons('maki-circle-15', iconSVGpath);
        }
    }

    const xmlHeader = '<?xml version="1.0" encoding="utf-8"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
        '<svg version="1.1" id="marker-circle-blue" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"  y="0px" width="24px" height="36px" viewBox="0 0 24 36" enable-background="new 0 0 24 36" xml:space="preserve">';

    const xmlEnd = '</svg>'

    const SVGcircle = xmlHeader + pathMarkerXMLCircle + pathIconXMLstr + xmlEnd;
    fs.writeFileSync(outputFolderSVG + 'circle-' + colorMarker + '-' + iconName + '.svg', SVGcircle);

    const SVGpenta = xmlHeader + pathMarkerXMLPenta + pathIconXMLstr + xmlEnd;
    fs.writeFileSync(outputFolderSVG + 'penta-' + colorMarker + '-' + iconName + '.svg', SVGpenta);

    const SVGsquare = xmlHeader + pathMarkerXMLSquare + pathIconXMLstr + xmlEnd;
    fs.writeFileSync(outputFolderSVG + 'square-' + colorMarker + '-' + iconName + '.svg', SVGsquare);
}


const tags = JSON.parse(fs.readFileSync(tagsPath).toString());
console.log('génération des markers');
let iconsMarkersStr = [];
for (key in tags) {
    for (let i = 0; i < tags[key].values.length; i++) {

        let strIcM = tags[key].values[i].markerColor + '|' + tags[key].values[i].icon    
        if (iconsMarkersStr.indexOf(strIcM) == -1) {
            iconsMarkersStr.push(strIcM);
            generateMarkerIcon(tags[key].values[i].icon, "#ffffff", tags[key].values[i].markerColor)
        }
    }
}

generateMarkerIcon('', "#ffffff", "#000000", true)


//copy whiteliste 
const whiteList = ['none', 'Delete', 'Create', 'Update'];

for (let i = 0; i < whiteList.length; i++) {
    fs.copySync(iconsSVGsPath + whiteList[i] + '.svg', outputFolderSVG + whiteList[i] + '.svg');
}


const svgNames = fs.readdirSync(outputFolderSVG);
// filtrer que les SVG


const generateSprites = async (outPath, factor = 1) => {
    const pngFolder = path.join(__dirname,'tmp', 'PNG', `@${factor}`);
    await fs.emptyDir(pngFolder)

    for (let i = 0; i < svgNames.length; i ++){
        const svgFileName = svgNames[i];
        const filePath = path.join(outputFolderSVG, svgFileName)
        const image = sharp(filePath, { density: 72 * factor });
        await image
            .png()
            .toFile( path.join(pngFolder, `${svgFileName}.png`))
        
    }

    const pngsNameFile = fs.readdirSync(pngFolder);
    const pngPaths = pngsNameFile.map(n => path.join(pngFolder,n ))
    var sprites = pngPaths

    return new Promise(  (resolve, reject) => {
        Spritesmith.run({src:sprites}, async function handleResult (err, result) {
            if (err){
                reject(err);
            }
       
          const outFileName = factor === 1 ? 'sprites' : `sprites@${factor}x` 
           await  sharp(result.image).toFile(path.join(outPath, outFileName + '.png'))

            const jsonSprites = {};
            for ( const k in result.coordinates){
                const basename = path.basename(k).replace('.svg.png', '');
                jsonSprites[basename] = {...result.coordinates[k], "pixelRatio":factor}
            }
            fs.writeFileSync(path.join(outPath, outFileName + '.json'), JSON.stringify(jsonSprites));
            await fs.remove(pngFolder)
            
            resolve({'json': path.join(outPath, outFileName + '.json'), 'png': path.join(outPath, outFileName + '.png') })

          });

    })

 
}

// fs.mkdirSync(pngFolder)
;

const outPath = path.join(__dirname,'../../src/assets/mapStyle/')
Promise.all( [generateSprites(outPath, 1), generateSprites(outPath, 2), generateSprites(outPath, 3)])
    .then( e => {
        console.log(e);
    console.log('fini')
})



