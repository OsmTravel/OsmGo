const spritezero = require('@mapbox/spritezero');
const fs = require('fs-extra');
const glob = require('glob');
const path = require('path');
const cheerio = require('cheerio');
const parseString = require('xml2js').parseString;


const iconsSVGsPath = path.join(__dirname, '../mapStyle/SvgForSprites/SVGs/');
const whiteList = ['none', 'Delete', 'Create', 'Update', 'arrow-position'];

let files = fs.readdirSync(iconsSVGsPath);
for (let i = 0; i < files.length; i++) {
    let fileName = files[i];
    if (fileName.split('.').length == 2 &&
        fileName.split('.')[1] == 'svg' &&
        whiteList.indexOf(fileName.split('.')[0]) == -1) {

        let iconSvg = fs.readFileSync(iconsSVGsPath + fileName, 'utf8');

        const $ = cheerio.load(iconSvg, { useHtmlParser2: true });
        //    let $ = cheerio.load(iconSvg);
        $.root()
            .contents()
            .filter(function () { return this.type === 'comment'; })
            .remove();

        $('path').removeAttr('style');
        $('path').attr('fill', '#FFFFFF');
        let cleanSvg = $.xml('svg');

        fs.writeFileSync(iconsSVGsPath + fileName, cleanSvg, 'utf8')
    }
}


