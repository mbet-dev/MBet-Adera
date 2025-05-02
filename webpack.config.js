const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function(env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Path to our react-native-maps web mock
  const mapsWebMockPath = path.resolve(__dirname, './src/components/react-native-maps-web.js');
  // Path to our generic empty module
  const emptyModulePath = path.resolve(__dirname, './src/components/empty-module.js');
  
  // Add a more comprehensive set of module replacements
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-maps': mapsWebMockPath,
    'react-native-maps/lib/MapMarkerNativeComponent': emptyModulePath,
    'react-native/Libraries/Utilities/codegenNativeCommands': emptyModulePath,
    '@react-native-community/geolocation': emptyModulePath,
  };

  // Ensure Metro's resolution order prefers the web versions
  config.resolve.mainFields = ['browser', 'module', 'main'];

  // Add more specific rules to prevent loading native modules on web
  config.module.rules.unshift({
    test: /node_modules\/react-native-maps\/.*\.js$/,
    use: 'null-loader',
  });

  config.module.rules.unshift({
    test: /MapMarkerNativeComponent\.js$/,
    use: 'null-loader',
  });
  
  config.module.rules.unshift({
    test: /codegenNativeCommands/,
    use: 'null-loader',
  });
  
  const webpack = require('webpack');
  
  // Use DefinePlugin to identify web platform
  config.plugins.push(
    new webpack.DefinePlugin({
      'Platform.OS': JSON.stringify('web'),
      '__DEV__': process.env.NODE_ENV !== 'production'
    })
  );

  return config;
};