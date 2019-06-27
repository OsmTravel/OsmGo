const generateSprites = require('./generateSprite')
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const run = async () => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'assets', 'i18n', 'i18n.json'), 'utf8'))
  const confTags = config.tags;
  // console.log(conf)

  // confTags.forEach(elem => {
  for (const elem of confTags) {
    // console.log(elem)
    const language = elem.language;
    // elem.country.forEach(country => {
    for (const country of elem.country) {
      const currentConfigTag = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'assets', 'i18n', language, country.region, 'tags.json'), 'utf8')
      const currentTagsHash = crypto.createHash('md5').update(currentConfigTag).digest("hex");

      if (country.tagsHash !== currentTagsHash) {
        console.log(language, country.region, 'Les tags ont changés')
        await generateSprites.generateSprites(language, country.region);
        country.tagsHash = currentTagsHash;
        fs.writeFileSync(path.join(__dirname, '..', '..', 'src', 'assets', 'i18n', 'i18n.json'), JSON.stringify(config) )
        // on modifie le fichier 
    
      } else {
        console.log(language, country.region, 'rien a faire')
      }
    }

  };
}

run();



