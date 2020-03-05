. deploy.config

echo $serverHost
echo $serverPort
echo $serverOsmGoPath
echo $serverUser




ssh -p $serverPort $serverUser@$serverHost "
mkdir -p $serverOsmGoPath

"
node ./incrementVersion.js
# node ./osmGoAdmin/backend/updatei18nMetadata.js

rm -r www
ng build --prod && cd ./www && rsync -e "ssh -p $serverPort" -avz ./ $serverUser@$serverHost:$serverOsmGoPath

