// Use capacitor from Android folder (withou Firebase & GMS)
const path = require('path');
const fs = require('fs');

const pathCapSettingsGradle = path.join(__dirname, '..','android','capacitor.settings.gradle');

const newContent = `include ':capacitor-android'
project(':capacitor-android').projectDir = new File('./capacitor')`

fs.writeFileSync(pathCapSettingsGradle,newContent );