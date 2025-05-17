import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

/**
 * A sample component demonstrating the use of multilingual support in MBet-Adera
 */
const MultilingualDemo: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, isRTL } = useLanguage();
  
  return (
    <ScrollView style={[styles.container, isRTL && styles.rtlContainer]}>
      <StatusBar backgroundColor="#3498db" barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerText}>MBet-Adera</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.title}>{t('welcome.title')}</Text>
        <Text style={styles.subtitle}>{t('welcome.subtitle')}</Text>
        <Text style={styles.description}>{t('welcome.message')}</Text>
        
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>{t('welcome.getStarted')}</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <LanguageSelector />
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('parcel.title')}</Text>
        <View style={styles.exampleCard}>
          <Text style={styles.cardTitle}>{t('parcel.track')}</Text>
          <Text style={styles.cardText}>{t('parcel.trackingNumber')}: 12345678</Text>
          <Text style={styles.cardText}>{t('parcel.status')}: {t('delivery.pending')}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('payment.title')}</Text>
        <View style={styles.exampleCard}>
          <Text style={styles.cardTitle}>{t('payment.methods')}</Text>
          <Text style={styles.cardText}>{t('payment.wallet')}</Text>
          <Text style={styles.cardText}>{t('payment.balance')}: 1,500 ETB</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('qrCode.scan')}</Text>
        <View style={styles.exampleCard}>
          <Text style={styles.cardText}>{t('qrCode.scanInstructions')}</Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('settings.version')}: 1.0.0 | {currentLanguage.toUpperCase()}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  rtlContainer: {
    direction: 'rtl',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    alignItems: 'center',
  },
  headerText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#34495e',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3498db',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
    alignSelf: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#34495e',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
    marginHorizontal: 12,
  },
  exampleCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2980b9',
  },
  cardText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#95a5a6',
  }
});

export default MultilingualDemo; 