import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform, NativeModules } from 'react-native';
import '../i18n'; // Import the i18n configuration
import { languageConfig, changeLanguage as i18nChangeLanguage } from '../i18n';

type LanguageContextType = {
  currentLanguage: string;
  isRTL: boolean;
  changeLanguage: (lang: string) => Promise<void>;
  languageOptions: { code: string; name: string; nativeName: string }[];
  refreshKey: number; // Add a key to force refresh
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<string>(i18n.language || 'en');
  const [isRTL, setIsRTL] = useState<boolean>(i18n.dir() === 'rtl');
  const [refreshKey, setRefreshKey] = useState<number>(0); // Add refresh key state

  // Define available language options
  const languageOptions = Object.keys(languageConfig).map(code => ({
    code,
    name: languageConfig[code as keyof typeof languageConfig].name,
    nativeName: languageConfig[code as keyof typeof languageConfig].nativeName
  }));

  // Initialize language from storage on mount
  useEffect(() => {
    const initLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem('user-language');
        if (storedLanguage && storedLanguage !== i18n.language) {
          // If there's a stored language that's different from the current one, use it
          await i18nChangeLanguage(storedLanguage);
        }
      } catch (error) {
        console.error('Error initializing language:', error);
      }
    };
    
    initLanguage();
  }, []);

  // Listen to language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      console.log('Language changed event triggered:', lng);
      setCurrentLanguage(lng);
      const langIsRTL = languageConfig[lng as keyof typeof languageConfig]?.isRTL || false;
      setIsRTL(langIsRTL);
      // Increment refresh key to force components to re-render
      setRefreshKey(prev => prev + 1);
    };

    // Subscribe to language changes
    i18n.on('languageChanged', handleLanguageChanged);

    // Cleanup subscription
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  // Change language function
  const changeLanguage = async (lang: string): Promise<void> => {
    try {
      console.log('Changing language to:', lang);
      
      // Don't do anything if it's the same language
      if (lang === currentLanguage) {
        console.log('Language is already set to:', lang);
        return;
      }
      
      // Change language in i18n
      await i18nChangeLanguage(lang);
      
      // Force a refresh on all platforms
      setTimeout(() => {
        console.log('Forcing refresh after language change');
        setRefreshKey(prev => prev + 1);
      }, 50);
      
    } catch (error) {
      console.error('Error changing language in context:', error);
    }
  };

  const value = {
    currentLanguage,
    isRTL,
    changeLanguage,
    languageOptions,
    refreshKey // Include refresh key in context
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}; 