// var replace = require('replace-in-file');
const path = require('path');
const fs = require('fs')
const envPath = path.join(__dirname, 'src', 'environments','environment.prod.ts');
let env = fs.readFileSync(envPath, 'utf8');

const package = require('./package.json')
const version =  package.version;
console.log('version : ', version);

env = env.replace( /version:\s'[0-9]+\.[0-9]+\.[0-9]+'/g, `version: '${version}'` );
fs.writeFileSync(envPath, env, 'utf8');
