const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');
const parseString = require('xml2js').parseString;
var svg2img = require('svg2img');

const Spritesmith = require('spritesmith');

exports.generateSprites = () => {

    const iconsUsed = [];

  
    const iconsSVGsPath = path.join(__dirname, '..', 'resources','IconsSVG');
    const markersModelPath = path.join(__dirname, '..', 'resources','markersModel');
    const tagsPath = path.join(__dirname, '..', 'src','assets','tags&presets', 'tags.json');
    const outputTmp = path.join(__dirname, 'tmp');
    const outputFolderSVG = path.join(outputTmp, 'SVG');
  
    const outPath = path.join(__dirname, '..', 'src','assets', 'mapStyle','sprites') // les sprites en sorti

    const outPathIconSprites = path.join(__dirname, '..', 'src','assets') // les sprites en sorti


    fs.removeSync(outputTmp);
    fs.mkdirsSync(outputFolderSVG);


    let iconsSVG = [];

    const generateMarkerIcon = (iconName, colorIcon, colorMarker,geometries= undefined, unknowTag = false) => {
        if (!geometries){
            geometries = ['point', 'vertex','area','line']
        }
        let iconSVG;
        if (iconName == '') {
            if (unknowTag) {
                iconSVG = fs.readFileSync(path.join(iconsSVGsPath,  'wiki_question.svg')).toString();
            } else {
                iconSVG = fs.readFileSync(path.join(iconsSVGsPath , 'maki-circle.svg')).toString();
            }

        } else {
            iconSVG = fs.readFileSync(path.join(iconsSVGsPath , iconName + '.svg')).toString();
        }


        parseString(fs.readFileSync(path.join(markersModelPath, 'marker-circle.svg')).toString(), function (err, result) {
            pathMarkerXMLCircle = '<path fill="' + colorMarker + '" d="' + result.svg.path[0].$.d + '"></path>';
        });

        pathMarkerXMLPenta = '<polygon fill="' + colorMarker + '" points="12,36 24,12 18,0 6.017,0 0,12.016 "/>'

        parseString(fs.readFileSync(path.join(markersModelPath, 'marker-square.svg')).toString(), function (err, result) {
            pathMarkerXMLSquare = '<path fill="' + colorMarker + '" d="' + result.svg.path[0].$.d + '"></path>';
        });


        let $ = cheerio.load(iconSVG)
        pathIconXMLstr = '';
  
        $('path').attr('d', function (a, b) {
            pathIconXMLstr += '<path fill="' + colorIcon + '" transform="translate(4.5 4.5)" d="' + b + '"></path> ';
        })
        iconDpath = $('path').attr('d');

        if (iconsSVG.indexOf(iconName) == -1) {
            iconsSVG.push(iconName)
        }

        const xmlHeader = '<?xml version="1.0" encoding="utf-8"?> <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">' +
            '<svg version="1.1" id="marker-circle-blue" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px"  y="0px" width="24px" height="36px" viewBox="0 0 24 36" enable-background="new 0 0 24 36" xml:space="preserve">';

        const xmlEnd = '</svg>'
        if (geometries.includes('point') || geometries.includes('vertex') ){
            const SVGcircle = xmlHeader + pathMarkerXMLCircle + pathIconXMLstr + xmlEnd;
            fs.writeFileSync(path.join(outputFolderSVG, 'circle-' + colorMarker + '-' + iconName + '.svg'), SVGcircle);
        }

        if (geometries.includes('line')){
            const SVGpenta = xmlHeader + pathMarkerXMLPenta + pathIconXMLstr + xmlEnd;
            fs.writeFileSync(path.join(outputFolderSVG, 'penta-' + colorMarker + '-' + iconName + '.svg'), SVGpenta);
        }
        if (geometries.includes('area')){
            const SVGsquare = xmlHeader + pathMarkerXMLSquare + pathIconXMLstr + xmlEnd;
            fs.writeFileSync(path.join(outputFolderSVG, 'square-' + colorMarker + '-' + iconName + '.svg'), SVGsquare);
        }
    }


    const tags = JSON.parse(fs.readFileSync(tagsPath).toString());
    console.log('génération des markers');
    let iconsMarkersStr = [];
    for (key in tags) {
        for (let i = 0; i < tags[key].values.length; i++) {
            if (tags[key].values[i].icon && !iconsUsed.includes(tags[key].values[i].icon)){
              
                iconsUsed.push(tags[key].values[i].icon);
            }
            let strIcM = tags[key].values[i].markerColor + '|' + tags[key].values[i].icon
            if (iconsMarkersStr.indexOf(strIcM) == -1) {
                iconsMarkersStr.push(strIcM);
             
                generateMarkerIcon(tags[key].values[i].icon, "#ffffff", tags[key].values[i].markerColor, tags[key].values[i].geometry)
            }
        }
    }

    // unknows tag config
    generateMarkerIcon('', "#ffffff", "#000000",['point','line','area'], true)


    //copy whiteliste 
    const whiteList = ['none', 'Delete', 'Create', 'Update', 'Old', 'Fixme'];
  
    for (let i = 0; i < whiteList.length; i++) {
        fs.copySync(path.join(iconsSVGsPath, whiteList[i] + '.svg'), path.join(outputFolderSVG, whiteList[i] + '.svg'));
    }


    const svgNames = fs.readdirSync(outputFolderSVG);
    // filtrer que les SVG
    var sizeOf = require('image-size');


    const svgToPNG = (filePath, factor) => {
        var dimensions = sizeOf(filePath);
        // console.log(filePath);

        // console.log(dimensions.width, dimensions.height);
        const svgString = fs.readFileSync(filePath, 'utf8');
        return new Promise((resolve, reject) => {


            svg2img(svgString, { 'width': dimensions.width * factor, 'height': dimensions.height * factor }, function (error, buffer) {
                if (error) {
                    reject(error);
                } else {
                    resolve(buffer)
                }
                //returns a Buffer

            });

        })


    }


    const generateSprites = async (outPath, factor = 1) => {
        const pngFolder = path.join(outputTmp, 'PNG', `@${factor}`);
        await fs.emptyDir(pngFolder)
        console.log(factor);
        console.log('length', svgNames.length)
        console.time('svgToPNG')
        for (let i = 0; i < svgNames.length; i++) {
            const svgFileName = svgNames[i];
            // console.log(svgFileName);
            const filePath = path.join(outputFolderSVG, svgFileName)

            const image = await svgToPNG(filePath, factor);
            fs.writeFileSync(path.join(pngFolder, `${svgFileName}.png`), image)
        }
        console.timeEnd('svgToPNG')

        const pngsNameFile = fs.readdirSync(pngFolder);
        const pngPaths = pngsNameFile.map(n => path.join(pngFolder, n))
        var sprites = pngPaths

        return new Promise((resolve, reject) => {
            Spritesmith.run({ src: sprites }, async function handleResult(err, result) {
                if (err) {
                    reject(err);
                }

                const outFileName = factor === 1 ? 'sprites' : `sprites@${factor}x`
                fs.writeFileSync(path.join(outPath, outFileName + '.png'), result.image)
                // await sharp(result.image).toFile(path.join(outPath, outFileName + '.png'))

                const jsonSprites = {};
                for (const k in result.coordinates) {
                    const basename = path.basename(k).replace('.svg.png', '');
                    jsonSprites[basename] = { ...result.coordinates[k], "pixelRatio": factor }
                }
                fs.writeFileSync(path.join(outPath, outFileName + '.json'), JSON.stringify(jsonSprites));
                await fs.remove(pngFolder)

                resolve({ 'json': path.join(outPath, outFileName + '.json'), 'png': path.join(outPath, outFileName + '.png') })

            });

        })
    }

    // just icons sprites for interface
    const generateIconSprites = async () => {
        console.info('Sprites for Ui')
        const factor = 2;
        const pngFolder = path.join(outputTmp, 'PNG_icons');
        await fs.emptyDir(pngFolder)
        for (let svgFileName of iconsUsed){
            const filePath = path.join(iconsSVGsPath, `${svgFileName}.svg`)
            
            const image = await svgToPNG(filePath, factor);
            fs.writeFileSync(path.join(pngFolder, `${svgFileName}.png`), image)
        }

        const pngsNameFile = fs.readdirSync(pngFolder);
        const pngPaths = pngsNameFile.map(n => path.join(pngFolder, n))
        var sprites = pngPaths

  
        return new Promise((resolve, reject) => {
            Spritesmith.run({ src: sprites }, async function handleResult(err, result) {
                if (err) {
                    reject(err);
                }

                const outFileName = 'iconsSprites';// factor === 1 ? 'sprites' : `sprites@${factor}x`
                fs.writeFileSync(path.join(outPathIconSprites, outFileName + '.png'), result.image)
                // await sharp(result.image).toFile(path.join(outPath, outFileName + '.png'))

                const jsonSprites = {};
                for (const k in result.coordinates) {
                    // console.log(path.basename(k))
                    const basename = path.basename(k).replace('.png', '');
                    // console.log(basename)
                    jsonSprites[basename] = { ...result.coordinates[k], "pixelRatio": factor }
                }
                fs.writeFileSync(path.join(outPathIconSprites, outFileName + '.json'), JSON.stringify(jsonSprites));
                await fs.remove(pngFolder)

                resolve({ 'json': path.join(outPath, outFileName + '.json'), 'png': path.join(outPath, outFileName + '.png') })

            });

        })

       
    }
    
    return Promise.all(
    [
        generateIconSprites(),
        generateSprites(outPath, 1), 
        generateSprites(outPath, 2), 
        generateSprites(outPath, 3)
    ]).then(e => {
        fs.removeSync(outputTmp);
    })
}