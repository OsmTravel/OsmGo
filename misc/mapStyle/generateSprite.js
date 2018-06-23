const spritezero = require('@mapbox/spritezero');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const cheerio = require('cheerio');
const parseString = require('xml2js').parseString;


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

function generateMarkerIcon(iconName, colorIcon, colorMarker) {
    let iconSVG ;
    if (iconName == '') {
         iconSVG = fs.readFileSync(iconsSVGsPath + 'maki-circle-15.svg').toString();

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
            console.log(strIcM);

            generateMarkerIcon(tags[key].values[i].icon, "#ffffff", tags[key].values[i].markerColor)
        }
    }
}


//copy whiteliste 
const whiteList = ['none', 'Delete', 'Create', 'Update', 'arrow-position'];

for (let i = 0; i < whiteList.length; i++) {
    fs.copySync(iconsSVGsPath + whiteList[i] + '.svg', outputFolderSVG + whiteList[i] + '.svg');
}

console.log('génération des srpites');
for (let i = 1; i <=2; i++){
    const pxRatio = i;
    let svgs = glob.sync(path.resolve(outputFolderSVG + '*.svg'))
        .map(function (f) {
            return {
                svg: fs.readFileSync(f),
                id: path.basename(f).replace('.svg', '')
            };
        });
    // var pngPath = path.resolve(path.join(__dirname, './output/sprites@' + pxRatio + '.png'));
    const jsonPath = path.join(__dirname,'../../src/assets/mapStyle/sprites' + 
            ((pxRatio == 1) ? '' : ('@'+ pxRatio+'x')) + 
            '.json');

    // Pass `true` in the layout parameter to generate a data layout
    // suitable for exporting to a JSON sprite manifest file.

    spritezero.generateLayout({ imgs: svgs, pixelRatio: pxRatio, format: true }, function (err, dataLayout) {
        if (err) {
            console.log(err);
            return;
        }
        fs.writeFileSync(jsonPath, JSON.stringify(dataLayout));
    });

        const pngPath = path.join(__dirname,'../../src/assets/mapStyle/sprites' + 
        ((pxRatio == 1) ? '' : ('@'+ pxRatio+'x')) + 
        '.png');

    // Pass `false` in the layout parameter to generate an image layout
    // suitable for exporting to a PNG sprite image file.
    spritezero.generateLayout({ imgs: svgs, pixelRatio: pxRatio, format: false }, function (err, imageLayout) {
        spritezero.generateImage(imageLayout, function (err, image) {
            if (err) {
                console.log(err);
                return;
            }
            fs.writeFileSync(pngPath, image);
        });
    });
    
};


