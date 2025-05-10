import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Check if we're in a browser environment where localStorage is available
const isBrowser = Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// Memory storage fallback for SSR
const memoryStorage: Record<string, string> = {};

export const storage = {
  getItem: async (key: string) => {
    try {
      if (isBrowser) {
        return window.localStorage.getItem(key);
      } else if (Platform.OS === 'web') {
        // SSR environment - use memory storage
        return memoryStorage[key] || null;
      }
      return AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    try {
      if (isBrowser) {
        window.localStorage.setItem(key, value);
        return;
      } else if (Platform.OS === 'web') {
        // SSR environment - use memory storage
        memoryStorage[key] = value;
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  },
  removeItem: async (key: string) => {
    try {
      if (isBrowser) {
        window.localStorage.removeItem(key);
        return;
      } else if (Platform.OS === 'web') {
        // SSR environment - delete from memory storage
        delete memoryStorage[key];
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage removeItem error:', error);
    }
  },
}; 