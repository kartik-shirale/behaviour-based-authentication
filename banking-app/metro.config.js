const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
if (process.env.NODE_ENV === 'production') {
    config.transformer.minifierConfig = {
        compress: { drop_console: true },
    };
}

module.exports = withNativeWind(config, { input: './app/global.css' });