const upstream = require('@expo/metro-config/babel-transformer');

module.exports.transform = ({ src, filename, options }) => {
  const source = filename.endsWith('.txt')
    ? `module.exports = ${JSON.stringify(src)};`
    : src;
  return upstream.transform({ src: source, filename, options });
};
