module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './',
            '@components': './src/components',
            '@lib': './src/lib',
            '@utils': './src/utils',
            '@hooks': './src/hooks',
            '@context': './src/context',
            '@assets': './src/assets',
            '@constants': './src/constants',
            '@types': './src/types',
            '@services': './src/services',
            '@theme': './src/theme'
          },
        },
      ],
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: null,
          safe: true,
          allowUndefined: false,
        },
      ],
    ],
  };
};
