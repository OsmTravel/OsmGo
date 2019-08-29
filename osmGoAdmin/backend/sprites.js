const generateSprites = require('./generateSprite')

const run = async () => {
  await generateSprites.generateSprites('fr', 'FR');
}

run();



