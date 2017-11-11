
module.exports = {
    copyAssets: {
        src: ['{{SRC}}/assets/**/*', 
        './node_modules/mapbox-gl/dist/mapbox-gl.js',
        './node_modules/mapbox-gl/dist/mapbox-gl.js.map',
        './node_modules/mapbox-gl/dist/mapbox-gl.css'],
        dest: '{{WWW}}/assets'
    }
}