. deploy.config


buildPath=$PWD"/build"
echo $buildPath
echo $PWD
mkdir -p $buildPath
rm $buildPath/*
node ./incrementVersion.js && node ./osmGoAdmin/backend/updatei18nMetadata.js && ionic cordova build android --prod --release
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore $keystorePath $PWD/platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk -storepass $storePass alias_name 

$buildToolsPath/zipalign -v 4 ~/Projets/OsmGo/platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk ~/Projets/OsmGo/build/osmgo.apk