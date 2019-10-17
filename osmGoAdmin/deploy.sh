. deploy.config

echo $serverHost
echo $serverPort
echo $serverPathFrontend
echo $serverPathBackend
echo $serverOsmGoAdminAssets




ssh -p $serverPort $serverUser@$serverHost "
mkdir -p $serverPathFrontend
mkdir -p $serverPathBackend
mkdir -p $serverOsmGoAdminAssets/mapStyle/IconsSVG
"

cd ./frontend
npm run build --prod
cd ./dist

rsync -e "ssh -p $serverPort" -avz ./ $serverUser@$serverHost:$serverPathFrontend

cd ../../../src/assets/i18n
# rsync -e "ssh -p $serverPort" -avz   ./ $serverUser@$serverHost:$serverOsmGoAdminAssets/i18n

cd ../mapStyle/IconsSVG
rsync -e "ssh -p $serverPort" -avz   ./ $serverUser@$serverHost:$serverOsmGoAdminAssets/mapStyle/IconsSVG

## BACKEND
cd ../../../../osmGoAdmin/backend
ls
rsync -e "ssh -p $serverPort" --exclude=node_modules --exclude=tmp --exclude=config.json --exclude=*.git -avz   ./ $serverUser@$serverHost:$serverPathBackend

ssh -p $serverPort $serverUser@$serverHost "
cd $serverPathBackend
npm install
pm2 delete osmgo-admin
pm2 start server.js --name osmgo-admin
"