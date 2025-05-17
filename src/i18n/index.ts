import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';

// Import translations
import en from './translations/en.json';
import am from './translations/am.json';
import om from './translations/om.json';
import ti from './translations/ti.json';
import so from './translations/so.json';

// Define language resources
const resources = {
  en: {
    translation: en
  },
  am: {
    translation: am
  },
  om: {
    translation: om
  },
  ti: {
    translation: ti
  },
  so: {
    translation: so
  }
};

// Define language metadata including RTL status
export const languageConfig = {
  en: { name: 'English', isRTL: false, nativeName: 'English' },
  am: { name: 'Amharic', isRTL: false, nativeName: 'አማርኛ' },
  om: { name: 'Oromifa', isRTL: false, nativeName: 'Afaan Oromoo' },
  ti: { name: 'Tigrigna', isRTL: false, nativeName: 'ትግርኛ' },
  so: { name: 'Somali', isRTL: false, nativeName: 'Soomaali' }
};

// Storage key for language preference
const LANGUAGE_STORAGE_KEY = 'user-language';

// Initialize i18next with more aggressive update settings
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      nsMode: 'default'
    },
    // Ensure changes are applied immediately
    updateMissing: true,
    saveMissing: true,
    // Don't wait for translations to load
    initImmediate: true
  });

// Handle language detection and changing
export const detectAndSetLanguage = async (): Promise<void> => {
  try {
    console.log('Detecting language...');
    // Get stored language from AsyncStorage
    const storedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    
    if (storedLanguage && Object.keys(resources).includes(storedLanguage)) {
      console.log('Found stored language:', storedLanguage);
      // Use stored language if available
      await changeLanguage(storedLanguage);
    } else {
      // If no stored language, use device language
      const deviceLanguage = getLocales()[0].languageCode;
      console.log('Using device language:', deviceLanguage);
      // Check if device language is supported, otherwise default to English
      const supportedLanguage = deviceLanguage && Object.keys(resources).includes(deviceLanguage) 
        ? deviceLanguage 
        : 'en';
      await changeLanguage(supportedLanguage);
    }
  } catch (error) {
    console.error('Error detecting language:', error);
    // Default to English on error
    await changeLanguage('en');
  }
};

// Function to change language
export const changeLanguage = async (lng: string): Promise<void> => {
  try {
    console.log('Changing language to:', lng);
    
    // Get RTL status of the language
    const isRTL = languageConfig[lng as keyof typeof languageConfig]?.isRTL || false;
    
    // Check if we need to change RTL direction
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      
      // On native platforms, we may need to reload the app to apply RTL changes
      // This would require app reload which is handled at the app level
      if (Platform.OS !== 'web') {
        console.log('RTL direction changed - app may need to be restarted to apply changes fully');
      }
    }
    
    // Change language in i18n
    await i18n.changeLanguage(lng);
    
    // Force a reload of all translations
    if (i18n.reloadResources) {
      Object.keys(resources[lng as keyof typeof resources]).forEach(namespace => {
        i18n.reloadResources([lng], [namespace]);
      });
    }
    
    // Save language preference
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    
    console.log('Language changed successfully to:', lng);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Run initial language detection
detectAndSetLanguage();

export default i18n; 