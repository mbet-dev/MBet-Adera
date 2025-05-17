import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

type WelcomeProps = {
  username?: string;
  onLoginPress?: () => void;
  onSignupPress?: () => void;
};

const TranslatedWelcome: React.FC<WelcomeProps> = ({
  username,
  onLoginPress,
  onSignupPress,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <View style={[styles.container, isRTL && styles.rtlContainer]}>
      <Text style={styles.title}>{t('welcome.title')}</Text>
      <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
      <Text style={styles.message}>{t('welcome.message')}</Text>
      
      {username ? (
        <Text style={styles.welcomeText}>
          {t('common.welcome', { name: username })}
        </Text>
      ) : (
        <Text style={styles.welcomeText}>
          {t('common.welcomeGuest')}
        </Text>
      )}
      
      <Text style={styles.description}>
        {t('common.appDescription')}
      </Text>
      
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector
          label={t('languages.selectLanguage')}
          buttonStyle={styles.languageButton}
        />
      </View>
      
      {!username && (
        <View style={[styles.buttonsContainer, isRTL && styles.rtlButtons]}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={onLoginPress}
          >
            <Text style={styles.buttonText}>{t('auth.login')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.signupButton]} 
            onPress={onSignupPress}
          >
            <Text style={styles.buttonText}>{t('auth.signup')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  rtlContainer: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
  },
  welcomeText: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 12,
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#7f8c8d',
    lineHeight: 24,
  },
  languageSelectorContainer: {
    width: '100%',
    marginBottom: 30,
  },
  languageButton: {
    width: '100%',
  },
  buttonsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  rtlButtons: {
    flexDirection: 'row-reverse',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  signupButton: {
    backgroundColor: '#2ecc71',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default TranslatedWelcome; 