const generateSprites = require('./generateSprites')

const run = async () => {
  await generateSprites.generateSprites('fr', 'FR');
}

run();
