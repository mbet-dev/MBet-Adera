const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export type ColorScheme = 'light' | 'dark';

export const Colors = {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    primary: '#007bff', // Fallback from [id].tsx
    success: '#28a745', // Fallback from [id].tsx
    error: '#dc3545',   // Fallback from [id].tsx
    warning: '#ffc107', // Fallback from [id].tsx
    textSecondary: '#6c757d', // Fallback from [id].tsx
    borderLight: '#e0e0e0', // For historyTimelineLine & general borders
    mediumGray: '#888',    // General placeholder
    backgroundAlt: '#f0f0f0', // Alternative background
    textHeader: '#333',      // Header text
    border: '#ccc',          // General border
    textMuted: '#aaa',       // Muted text
    // Add other common colors your app might need
    // Example:
    // accent: '#f0a',
    // neutral: '#888',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    primary: '#007bff', // Ensure dark theme counterparts
    success: '#28a745',
    error: '#dc3545',
    warning: '#ffc107',
    textSecondary: '#adb5bd',
    borderLight: '#333',
    mediumGray: '#aaa',
    backgroundAlt: '#121212',
    textHeader: '#eee',
    border: '#444',
    textMuted: '#777',
    // Example:
    // accent: '#f0a',
    // neutral: '#aaa',
  },
};

export default Colors;

// Helper function to get colors based on current scheme (optional, if you implement theme switching)
// import { useColorScheme } from 'react-native';
// export function useThemeColor(
//   props: { light?: string; dark?: string },
//   colorName: keyof typeof Colors.light & keyof typeof Colors.dark
// ) {
//   const theme = useColorScheme() ?? 'light';
//   const colorFromProps = props[theme];

//   if (colorFromProps) {
//     return colorFromProps;
//   } else {
//     return Colors[theme][colorName];
//   }
// } 