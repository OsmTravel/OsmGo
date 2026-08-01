// Use capacitor from Android folder (withou Firebase & GMS)

import fs from 'fs'
import path from 'path'
import { androidDir } from './_paths'

const pathCapSettingsGradle = path.join(androidDir, 'capacitor.settings.gradle')

const newContent = `include ':capacitor-android'
project(':capacitor-android').projectDir = new File('./capacitor')`

fs.writeFileSync(pathCapSettingsGradle, newContent)
