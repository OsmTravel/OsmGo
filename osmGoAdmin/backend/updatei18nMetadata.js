const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const run = async () => {
    let osmGoAssetsPath = path.join(__dirname, '..', '..', 'src', 'assets')

    const dir = path.join(osmGoAssetsPath, 'i18n');
    const list = await fs.readdir(dir);
    let i18 = { 'tags': [], 'interface': [] };

    for (let file of list) {
        fileFullPath = path.resolve(dir, file);
        const fileStat = await fs.stat(fileFullPath)
        if (fileStat && fileStat.isDirectory()) {
            const dirCountry = await fs.readdir(fileFullPath);
            let regions = [];

            dirCountry.forEach(async region => {
                const tagsPath = path.join(fileFullPath, region, "tags.json");
                const tagsStr = fs.readFileSync(tagsPath, 'utf8');
                const tagsHash = crypto.createHash('md5').update(tagsStr).digest("hex");

                const presetsPath = path.join(fileFullPath, region, "presets.json");
                const presetsStr = fs.readFileSync(presetsPath, 'utf8');
                const presetsHash = crypto.createHash('md5').update(presetsStr).digest("hex");
                regions = [...regions, { region: region, tagsHash: tagsHash, presetsHash: presetsHash }]
            })

            i18.tags = [...i18.tags, { 'language': file, 'country': regions }]
        } else {
            if (path.extname(file) === '.json' && file !== 'i18n.json') {
                i18.interface = [...i18.interface, file.replace('.json', '')]
            }
        }
    }
    fs.writeFileSync(path.join(osmGoAssetsPath, 'i18n', 'i18n.json'), JSON.stringify(i18))
}

run();



