import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';
import { markOnboardingComplete } from '../../utils/onboardingUtils';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  navigation: any;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const { languageOptions, changeLanguage, currentLanguage } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentLanguage);

  // Function to handle language selection
  const handleSelectLanguage = (langCode: string) => {
    setSelectedLanguage(langCode);
    changeLanguage(langCode);
  };

  // Function to complete onboarding
  const completeOnboarding = async () => {
    try {
      // Save that onboarding has been completed
      await markOnboardingComplete();
      // Navigate to login screen
      navigation.replace('Login');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  // Render language option item
  const renderLanguageOption = (lang: { code: string; name: string; nativeName: string }) => {
    const isSelected = selectedLanguage === lang.code;
    
    return (
      <TouchableOpacity
        key={lang.code}
        style={[styles.languageOption, isSelected && styles.selectedLanguageOption]}
        onPress={() => handleSelectLanguage(lang.code)}
      >
        <View style={styles.languageContent}>
          <Text style={[styles.nativeName, isSelected && styles.selectedText]}>
            {lang.nativeName}
          </Text>
          <Text style={[styles.languageName, isSelected && styles.selectedText]}>
            {lang.name}
          </Text>
        </View>
        
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color="#3498db" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#3498db" barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>MBet-Adera</Text>
        </View>
        <Text style={styles.welcomeTitle}>{t('onboarding.welcome')}</Text>
        <Text style={styles.welcomeSubtitle}>{t('onboarding.subtitle')}</Text>
      </View>
      
      <View style={styles.languageSelectionContainer}>
        <Text style={styles.languageTitle}>{t('onboarding.selectLanguage')}</Text>
        <Text style={styles.languageDescription}>{t('onboarding.languageDescription')}</Text>
        
        <ScrollView style={styles.languageList}>
          {languageOptions.map(renderLanguageOption)}
        </ScrollView>
      </View>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={completeOnboarding}
        >
          <Text style={styles.continueButtonText}>{t('onboarding.continue')}</Text>
          <MaterialIcons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    backgroundColor: '#3498db',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 30,
  },
  languageSelectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  languageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  languageDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  languageList: {
    flex: 1,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e6e9ed',
  },
  selectedLanguageOption: {
    backgroundColor: '#ebf5fb',
    borderColor: '#3498db',
  },
  languageContent: {
    flex: 1,
  },
  nativeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 4,
  },
  languageName: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  selectedText: {
    color: '#3498db',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  continueButton: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default OnboardingScreen; 