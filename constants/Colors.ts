/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: '#0a7ea4',
    secondary: '#687076',
    success: '#16a34a',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    textSecondary: '#687076',
    divider: '#E0E0E0',
    textLight: '#8A8A8A',
    primaryLight: '#E6F3F7',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#3b82f6',
    secondary: '#9BA1A6',
    success: '#22c55e',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    textSecondary: '#9BA1A6',
    divider: '#2C2F33',
    textLight: '#667085',
    primaryLight: '#1E3A8A',
  },
};

export default Colors;
