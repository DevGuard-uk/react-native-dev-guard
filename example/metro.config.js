const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const escape = require('escape-string-regexp');
const pak = require('../package.json');
const peerModules = Object.keys({ ...pak.peerDependencies });

const defaultConfig = getDefaultConfig(__dirname);

const peerBlockList = peerModules.map(
  (name) => new RegExp(`^${escape(path.join(root, 'node_modules', name))}[\\\\/].*`)
);

// SDK dependencies (not peers) that must resolve from the example app — avoids duplicate
// native view registration (e.g. RNCSafeAreaView when telemetry diagnostics shows bug icon).
const sdkDedupeModules = [
  '@react-native-async-storage/async-storage',
  'react-native-safe-area-context',
];
const sdkDedupeBlockList = sdkDedupeModules.map(
  (name) => new RegExp(`^${escape(path.join(root, 'node_modules', name))}[\\\\/].*`)
);

/**
 * Metro configuration for monorepo-style local plugin development.
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    blockList: peerBlockList.concat(sdkDedupeBlockList).concat(defaultConfig.resolver.blockList),
    extraNodeModules: peerModules.reduce((acc, name) => {
      acc[name] = path.join(__dirname, 'node_modules', name);
      return acc;
    }, {
      'react-native-vault-logger': fs.existsSync(path.join(root, 'node_modules', 'react-native-vault-logger'))
        ? path.join(root, 'node_modules', 'react-native-vault-logger')
        : path.join(__dirname, 'node_modules', 'react-native-vault-logger'),
      '@react-native-async-storage/async-storage': path.join(
        __dirname,
        'node_modules',
        '@react-native-async-storage/async-storage'
      ),
      'react-native-safe-area-context': path.join(
        __dirname,
        'node_modules',
        'react-native-safe-area-context'
      ),
    }),
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(defaultConfig, config);
