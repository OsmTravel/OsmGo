# Osm Go ! 

### Mapping less frustrating! 

It's all POI !
_OSM Go !_ is an Android application for contributing to OpenStreetMap.
Map your environment simple and fast directly from within the app. Keep your eyes wide open and contribute to OSM while on the run.

The APK can be found in [the release list of this repository](https://github.com/DoFabien/OsmGo/releases) 

The application on [Google Play](https://play.google.com/store/apps/details?id=fr.dogeo.osmgo)

A short and breaking down documentation can be found at the [repo wiki](https://github.com/DoFabien/OsmGo/wiki).

 <p align="center">
  <img src="https://raw.githubusercontent.com/wiki/DoFabien/OsmGo/assets/map-vt.png?raw=true"/>
  <img src="https://raw.githubusercontent.com/wiki/DoFabien/OsmGo/assets/map-ortho.png?raw=true"/>
  <img src="https://raw.githubusercontent.com/wiki/DoFabien/OsmGo/assets/fiche.png?raw=true"/>
  <img src="https://raw.githubusercontent.com/wiki/DoFabien/OsmGo/assets/map-modif.png?raw=true"/>
  <img src="https://raw.githubusercontent.com/wiki/DoFabien/OsmGo/assets/select-primary-tag-velo.png?raw=true"/>
  <img src="https://raw.githubusercontent.com/wiki/DoFabien/OsmGo/assets/send-data.png"/>
</p>


### Dev
Osm Go! is a _hybrid_ application utilizing Ionic 4 and Cordova with Angular 7. It uses the map rendering engine Mapbox GL JS to display and run the in-app map.

#### Installation 
1) Install npm dependencies globally
```sh
npm install -g cordova
npm install -g ionic
```
2) Clone this repo and install
```sh
https://github.com/DoFabien/OsmGo.git
cd OsmGo
npm install
```
3) Test it
```sh
ionic serve 
```

#### Android
Debugging the app on your Android smartphone requires you to set up the whole development environment JDK, Gradle, SDK Android etc. Please be patient! It's Java... :)

1) Add the android platform to ionic
```sh
ionic cordova platform add android
```
2) Connect your smartphone via USB and put it in debugging mode. Execute the following command from within terminal.
```sh
ionic cordova run android
```

#### iOS
The app hasn't been made available to iOS users yet. For this app to work in iOS extremely modifications needs to be done.
I do not have an iPhone nor a Mac to develop nor to debug an iOS version of this app. You will need a Mac and a developer account for 100$ per year to develop iOS apps.
If someone has all this and wants to make a port, I would be happy to help them.
