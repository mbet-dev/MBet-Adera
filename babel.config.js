module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Add module resolver plugin to replace react-native-maps with an empty module on web
      process.env.EXPO_TARGET === 'web' && [
        'module-resolver',
        {
          alias: {
            'react-native-maps': './src/components/empty-module.js',
          },
        },
      ],
    ].filter(Boolean),
  };
};
