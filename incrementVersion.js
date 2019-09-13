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


let configXMLPath = path.join(__dirname, 'config.xml');
let configXML = fs.readFileSync(configXMLPath, 'utf8');
// console.log(buildGradle)
let currentVersionCodeStr = configXML.match(/version="[0-9]+\.[0-9]+\.[0-9]+"/g);

configXML = configXML.replace( /version="[0-9]+\.[0-9]+\.[0-9]+"/g, `version="${version}"` );
console.log(currentVersionCodeStr, ' => ', version);
fs.writeFileSync(configXMLPath, configXML, 'utf8');
