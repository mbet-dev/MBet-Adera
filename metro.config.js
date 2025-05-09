// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Get the default config
const defaultConfig = getDefaultConfig(__dirname);

// Add custom resolver for web
defaultConfig.resolver.resolverMainFields = ['browser', 'main'];

// Add specific platform overrides for web
defaultConfig.resolver.extraNodeModules = {
  ...defaultConfig.resolver.extraNodeModules,
  'react-native-maps': path.resolve(__dirname, './src/components/empty-module.js'),
  'react-native/Libraries/Utilities/codegenNativeCommands': path.resolve(__dirname, './src/components/empty-module.js'),
  '@': path.resolve(__dirname, './'),
};

// Add platform-specific mappings
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // Replace any imports of these modules when on web platform
  if (platform === 'web') {
    const nativeOnlyModules = [
      'react-native-maps',
      '@react-native-community/geolocation',
      'react-native/Libraries/Utilities/codegenNativeCommands',
      'MapMarkerNativeComponent',
    ];

    for (const nativeModule of nativeOnlyModules) {
      if (moduleName.includes(nativeModule)) {
        return {
          filePath: path.resolve(__dirname, './src/components/empty-module.js'),
          type: 'sourceFile',
        };
      }
    }
  }

  // Let Metro handle other modules normally
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = defaultConfig;
