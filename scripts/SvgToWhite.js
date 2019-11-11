const fs = require('fs-extra');
const path = require('path');
const cheerio = require('cheerio');

const iconsSVGsPath = path.join(__dirname, '..','src', 'assets', 'mapStyle', 'IconsSVG');
const whiteList = ['none', 'Delete', 'Create', 'Update', 'arrow-position', 'Old', 'Fixme'];

let files = fs.readdirSync(iconsSVGsPath);
for (let i = 0; i < files.length; i++) {
    let fileName = files[i];
    if (fileName.split('.').length == 2 &&
        fileName.split('.')[1] == 'svg' &&
        whiteList.indexOf(fileName.split('.')[0]) == -1) {

        let iconSvg = fs.readFileSync(path.join(iconsSVGsPath, fileName), 'utf8');

        const $ = cheerio.load(iconSvg, { useHtmlParser2: true });
        //    let $ = cheerio.load(iconSvg);
        $.root()
            .contents()
            .filter(function () { return this.type === 'comment'; })
            .remove();

        $('path').removeAttr('style');
        $('path').attr('fill', '#FFFFFF');
        let cleanSvg = $.xml('svg');

        fs.writeFileSync( path.join(iconsSVGsPath,fileName) , cleanSvg, 'utf8')
    }
}


