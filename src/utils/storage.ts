import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class WebStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(key);
    }
  }
}

export const storage = Platform.select({
  web: new WebStorage(),
  default: AsyncStorage,
});
