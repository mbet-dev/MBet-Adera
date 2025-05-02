import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

// Define custom theme colors
const colors = {
  primary: '#4CAF50',
  primaryContainer: '#E8F5E9',
  secondary: '#1976D2',
  secondaryContainer: '#E1F5FE',
  error: '#F44336',
  errorContainer: '#FFEBEE',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#F5F5F5',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onError: '#FFFFFF',
  onBackground: '#333333',
  onSurface: '#333333',
  elevation: {
    level0: 'transparent',
    level1: '#FFFFFF',
    level2: '#F5F5F5',
    level3: '#EEEEEE',
    level4: '#E0E0E0',
    level5: '#BDBDBD',
  },
};

// Create the theme with our custom colors
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...colors,
  },
}; 