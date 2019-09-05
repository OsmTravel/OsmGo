. deploy.config

echo $serverHost
echo $serverPort
echo $serverOsmGoPath
echo $serverUser




ssh -p $serverPort $serverUser@$serverHost "
mkdir -p $serverOsmGoPath

"

ionic build --prod --service-worker
npx cap copy web


cd ./www

rsync -e "ssh -p $serverPort" -avz ./ $serverUser@$serverHost:$serverOsmGoPath

