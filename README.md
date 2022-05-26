# Osm Go! 

✅ ***Mapping less frustrating!***

**Osm Go!** is a Android app and a PWA (**P**rogressive **W**eb **A**pp) for contributing to [OpenStreetMap](https://www.openstreetmap.org).

Map your environment simply and fast, directly from the app. Keep your eyes wide open and contribute to OSM while on the run.

# Use it

## Desktop
Install the [PWA](https://osmgo.com) or just navigate to **https://osmgo.com**

## Android
[<img src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png" alt="Get it on Google Play" height="80">](https://play.google.com/store/apps/details?id=fr.dogeo.osmgo)

Or install it as a PWA by opening https://osmgo.com

APK can be found in [the release list of this repository](https://github.com/DoFabien/OsmGo/releases) 

## iOS
[<img style="vertical-align:middle; padding: 0px 13px" src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Safari_browser_logo.svg/60px-Safari_browser_logo.svg.png" alt="Install on iOS as a PWA" height="60">Install on iOS as a PWA</p>](https://osmgo.com)

# User manual
A short user documentation can be found [here](https://dofabien.github.io/OsmGo/).

<img width="170" src="./docs/assets/map-modif.png?raw=true"/> <img width="170" src="./docs/assets/map-ortho.png?raw=true"/> <img width="170" src="./docs/assets/select-primary-tag-velo.png?raw=true"/> <img width="170" src="./docs/assets/fiche.png?raw=true"/>

# Development
Osm Go! is a _PWA_ application using Ionic 4 and Angular 8.
It uses the map rendering engine Mapbox GL JS to display and run the in-app map.

Osm Go! can be compiled on Linux and Windows (MacOs not tested yet)

## Install
```sh
npm install -g @ionic/cli
git clone https://github.com/DoFabien/OsmGo.git
cd OsmGo
npm install
```

## Run
Test it in a browser
```sh
npm run start
```

## Build for web (=> ./www)
```sh
ng build --prod 
```

## Build for android (make apk)
Requirements:
- [Android Studio](https://developer.android.com) with JDK and gradle

```sh
npm run buildAndroid`
```

## Contributing
If you want to contribute to Osm Go! and make it better, your help is welcome !

 1. Fork this repo
 2. Clone your fork on your local machine
 3. Create a new branch from develop (feature) or master (hotfix)
 4. Implement your feature and tests
 5. Push your branch on Github
 6. Open a pull request
 

### Interface translation [Deprecated]
You can help me translate the app into other languages. 
The easiest way is to go [through this app](https://admin.osmgo.com/), and click on "translate Ui".
