const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('txt');
config.transformer.babelTransformerPath = require.resolve('./reader-text-transformer');

module.exports = config;
