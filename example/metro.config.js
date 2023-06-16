const path = require('path');
const escape = require('escape-string-regexp');
const {getDefaultConfig} = require('metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const pak = require('../package.json');

const root = path.resolve(__dirname, '..');

const modules = Object.keys({
  ...pak.peerDependencies,
});

module.exports = (async () => {
  const {
    resolver: {sourceExts, assetExts},
  } = await getDefaultConfig();
  return {
    projectRoot: __dirname,
    watchFolders: [root],
    transformer: {
      babelTransformerPath: require.resolve('react-native-svg-transformer'),
    },
    resolver: {
      assetExts: assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...sourceExts, 'svg'],
      blacklistRE: exclusionList(
        modules.map(
          m =>
            new RegExp(`^${escape(path.join(root, 'node_modules', m))}\\/.*$`),
        ),
      ),
      extraNodeModules: modules.reduce((acc, name) => {
        acc[name] = path.join(__dirname, 'node_modules', name);
        return acc;
      }, {}),
    },
  };
})();
