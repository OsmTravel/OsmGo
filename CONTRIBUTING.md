# Translate

You can translate Osm Go! at POEditor:
- Add missing translations
- Improve existing ones
- And discuss translations

Follow [**this link** to improve the translations](https://poeditor.com/join/project/f2ASHUwwGp):

[![POEditor](https://poeditor.com/public/images/logo_small.png)](https://poeditor.com/join/project/f2ASHUwwGp)

After joining, the [main site of the POEditor](https://poeditor.com/projects/) should list Osm Go! for logged in users.

### iD presets

Some translations are from iD presets. For iD preset translation see [their documentation](https://github.com/openstreetmap/iD/blob/develop/CONTRIBUTING.md#translating).

### TagInfo descriptions

Some translations are extracted from TagInfo like the element "descriptions". See the column "description" in TagInfo for a bench: https://taginfo.openstreetmap.org/keys/bench#wiki

TagInfo get those descriptions from OSM wiki. Make sure to add the "| description = " in the infobox of the related article in the wiki. Example for bench: https://wiki.openstreetmap.org/wiki/Key%3Abench Note you can also press the "pencil" icon in the description field of the infobox. It will redirect you to the corresponding wiki Item. Example for bench: https://wiki.openstreetmap.org/wiki/Item:Q88

# Development

## Compile/run
Osm Go! is a _PWA_ application using:
- Angular 12
- Ionic 5
- Capacitor 3
- MapLibre GL

Osm Go! can be compiled on Linux and Windows (MacOs not tested yet)

### Requirements
Osm Go! use angular-cli 12, given this [compatibility list](https://gist.github.com/LayZeeDK/c822cc812f75bb07b7c55d07ba2719b3), you should install NodeJs 12 or 14. But it seems to work fine with NodeJs 16, you will just get some warning when installing dependencies via npm install.

### Install
```sh
npm install -g @ionic/cli
git clone https://github.com/DoFabien/OsmGo.git
cd OsmGo
npm install
```

### Run
Test it in a browser
```sh
npm run start
```

### Build for web (=> ./www)
```sh
npm run build
```

### Build for android (make apk)
Requirements:
- [Android Studio](https://developer.android.com) with JDK and gradle

```sh
npm run buildAndroid
```

## Known issues when developing

### Running WebApp on Linux
You may have following error:

`Watchpack Error (watcher): Error: ENOSPC: System limit for number of file watchers reached`

If so, we are gonna increase the max number of watches from 16384 (default) to 524288:

```sh
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

### Building Android App on Linux
Set the following envvar to your Android Studio installation:

`export CAPACITOR_ANDROID_STUDIO_PATH=/opt/android-studio-2021.2.1/android-studio/bin/studio.sh`

Then you can use the buildAndroid target with npm