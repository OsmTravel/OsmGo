# Translate

You can translate Osm Go! at POEditor:

-   Add missing translations
-   Improve existing ones
-   Add comments on translations and so so...

⏩ Follow [**this link**](https://poeditor.com/join/project/f2ASHUwwGp) to improve the translations.

[![POEditor](https://poeditor.com/public/images/logo_small.png)](https://poeditor.com/join/project/f2ASHUwwGp)

After joining, the [main site of the POEditor](https://poeditor.com/projects/) should list Osm Go! for logged in users.

### iD presets

Some translations are from iD presets. For iD presets translation see [their documentation](https://github.com/openstreetmap/iD/blob/develop/CONTRIBUTING.md#translating).

### TagInfo descriptions

Some translations are extracted from TagInfo like the element "descriptions". See the column "description" in TagInfo ([example for a bench](https://taginfo.openstreetmap.org/keys/bench#wiki)).

TagInfo get those descriptions from OSM wiki. Make sure to add the "| description = " in the infobox of the related article in the wiki ([example for bench](https://wiki.openstreetmap.org/wiki/Key%3Abench)). Note you can also press the "pencil" icon in the description field of the infobox. It will redirect you to the corresponding wiki Item ([example for bench](https://wiki.openstreetmap.org/wiki/Item:Q88)).

# Development

## Compile/run

Osm Go! is a _PWA_ application using:

-   Angular 16
-   Ionic 8
-   Capacitor 6
-   MapLibre GL

Osm Go! can be compiled on Linux and Windows (MacOs not tested yet)

### Requirements

Use Node.js 18.20.8 and npm 10.8.2. The Node.js version is pinned in `.nvmrc` for the migration from Angular 16.

💡 Be sure to checkout the branch develop to get the latest updates.

### Get the code

```sh
git clone https://github.com/DoFabien/OsmGo.git
cd OsmGo
git checkout develop
```

### Install

```sh
nvm install
nvm use
npm ci
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

### Hosting

-   Pushes to `develop` deploy the development PWA to this repository's GitHub Pages site.
-   Pushes to `main` deploy the production PWA to Cloudflare Pages.

Enable GitHub Actions as the GitHub Pages source in the repository settings. For production, create a Cloudflare Pages Direct Upload project and configure these repository values:

-   variable `CLOUDFLARE_PAGES_PROJECT` with the Cloudflare Pages project name;
-   secret `CLOUDFLARE_ACCOUNT_ID` with the Cloudflare account ID;
-   secret `CLOUDFLARE_API_TOKEN` with a token limited to Cloudflare Pages edit access.

### Build for android (make apk)

Requirements:

-   [Android Studio](https://developer.android.com) with JDK and gradle

```sh
npm run buildAndroid
```

Then open Android Studio and you can compile the app and run it on your device.

### Debug on Android

Requirements:

-   [Android Studio](https://developer.android.com) with JDK and gradle

```sh
npm run buildAndroidDebug
```

Then open Android Studio, compile the app and run it on your device.

After you can use Google Chrome or Edge to attach a debugger to the web app on the device.

-   For Edge, visit [edge://inspect](edge://inspect)
-   For Chrome, visit [chrome://inspect](chrome://inspect)

Find your device in those pages. Then click on the inspect button. You can set breakpoint in JavaScript files and inspect HTML code.

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

## Update tags and presets

### Add CHANGE_ME colors

Here is a simple jq query to list tags by "id : markerColor". It will help you to identify the 'correct' color for your new tags.

`cat src/assets/tagsAndPresets/tags.json | jq '.tags | sort_by(.id)[] | .id + " : " + .markerColor'`
