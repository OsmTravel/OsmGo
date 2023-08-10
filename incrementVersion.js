// var replace = require('replace-in-file');
const path = require('path')
const fs = require('fs')
const envPath = path.join(
    __dirname,
    'src',
    'environments',
    'environment.prod.ts'
)
let env = fs.readFileSync(envPath, 'utf8')

const package = require('./package.json')
const version = package.version
console.log('version : ', version)

env = env.replace(
    /version:\s'[0-9]+\.[0-9]+\.[0-9]+'/g,
    `version: '${version}'`
)
fs.writeFileSync(envPath, env, 'utf8')

let buildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle')
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8')
// console.log(buildGradle)

let currentVersionCodeStr = buildGradle.match(/versionCode\s[0-9]+/g)[0]

// time in seconds since 1970-01-01 00:00:00 UTC
const time = Math.floor(new Date().getTime() / 1000)
buildGradle = buildGradle.replace(currentVersionCodeStr, `versionCode ${time}`)
buildGradle = buildGradle.replace(
    /versionName\s"[0-9]+\.[0-9]+\.[0-9]+"/g,
    `versionName "${version}"`
)

console.log('versionCode:', time)
fs.writeFileSync(buildGradlePath, buildGradle, 'utf8')
