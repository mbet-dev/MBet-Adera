import AsyncStorage from '@react-native-async-storage/async-storage';
import errorHandler from './errorHandler';

/**
 * Safely store data in AsyncStorage with error handling
 */
export const safeStore = async <T>(key: string, value: T, context = 'Storage'): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    errorHandler.logError(error, `${context}:Store:${key}`);
    return false;
  }
};

/**
 * Safely retrieve data from AsyncStorage with error handling
 */
export const safeRetrieve = async <T>(key: string, defaultValue: T | null = null, context = 'Storage'): Promise<T | null> => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return defaultValue;
    return JSON.parse(value) as T;
  } catch (error) {
    errorHandler.logError(error, `${context}:Retrieve:${key}`);
    return defaultValue;
  }
};

/**
 * Safely remove data from AsyncStorage with error handling
 */
export const safeRemove = async (key: string, context = 'Storage'): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    errorHandler.logError(error, `${context}:Remove:${key}`);
    return false;
  }
};

/**
 * Safely remove multiple items from AsyncStorage with error handling
 */
export const safeRemoveMultiple = async (keys: string[], context = 'Storage'): Promise<boolean> => {
  try {
    await AsyncStorage.multiRemove(keys);
    return true;
  } catch (error) {
    errorHandler.logError(error, `${context}:RemoveMultiple`);
    return false;
  }
};

/**
 * Safely store multiple items in AsyncStorage with error handling
 */
export const safeStoreMultiple = async <T>(items: [string, T][], context = 'Storage'): Promise<boolean> => {
  try {
    const pairs = items.map(([key, value]) => [key, JSON.stringify(value)]);
    await AsyncStorage.multiSet(pairs as [string, string][]);
    return true;
  } catch (error) {
    errorHandler.logError(error, `${context}:StoreMultiple`);
    return false;
  }
};

/**
 * Safely retrieve multiple items from AsyncStorage with error handling
 */
export const safeRetrieveMultiple = async <T>(keys: string[], context = 'Storage'): Promise<Record<string, T | null>> => {
  try {
    const pairs = await AsyncStorage.multiGet(keys);
    const result: Record<string, T | null> = {};
    
    pairs.forEach(([key, value]) => {
      if (value === null) {
        result[key] = null;
      } else {
        try {
          result[key] = JSON.parse(value) as T;
        } catch (parseError) {
          errorHandler.logError(parseError, `${context}:ParseMultiple:${key}`);
          result[key] = null;
        }
      }
    });
    
    return result;
  } catch (error) {
    errorHandler.logError(error, `${context}:RetrieveMultiple`);
    return {};
  }
};

/**
 * Clear all app-related data from AsyncStorage with error handling
 */
export const clearAppStorage = async (prefix = 'mbet.', context = 'Storage'): Promise<boolean> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const appKeys = allKeys.filter(key => key.startsWith(prefix));
    
    if (appKeys.length > 0) {
      await AsyncStorage.multiRemove(appKeys);
    }
    
    return true;
  } catch (error) {
    errorHandler.logError(error, `${context}:ClearAppStorage`);
    return false;
  }
};

export default {
  safeStore,
  safeRetrieve,
  safeRemove,
  safeRemoveMultiple,
  safeStoreMultiple,
  safeRetrieveMultiple,
  clearAppStorage,
}; 