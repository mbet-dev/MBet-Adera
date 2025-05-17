import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/context/LanguageContext';
import Colors from '../../constants/Colors';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

const LanguageSettingsItem: React.FC = () => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languageOptions, refreshKey } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const router = useRouter();
  
  // Get the current language display name
  const currentLanguageDisplay = languageOptions.find(
    (lang) => lang.code === currentLanguage
  );
  
  const handleLanguageSelect = async (langCode: string) => {
    if (isChanging) return; // Prevent multiple simultaneous changes
    
    try {
      // Provide haptic feedback on mobile devices
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      setIsChanging(true);
      
      // Change the language
      await changeLanguage(langCode);
      
      // Close the modal after a short delay to show the change
      setTimeout(() => {
        setModalVisible(false);
        setIsChanging(false);
        
        // Force a refresh of the current screen by navigating
        if (Platform.OS !== 'web') {
          // For native, we can try to force a refresh by navigating to profile tab
          setTimeout(() => {
            // Navigate to profile tab
            router.replace('/(tabs)/profile');
          }, 100);
        }
      }, 500);
    } catch (error) {
      console.error('Error changing language:', error);
      setIsChanging(false);
    }
  };
  
  const renderLanguageOption = ({ item }: { item: { code: string; name: string; nativeName: string } }) => {
    const isSelected = item.code === currentLanguage;
    
    return (
      <TouchableOpacity
        style={[styles.languageOption, isSelected && styles.selectedLanguageOption]}
        onPress={() => handleLanguageSelect(item.code)}
        activeOpacity={0.7}
        disabled={isChanging}
      >
        <View style={styles.languageContent}>
          <Text style={[styles.nativeName, isSelected && styles.selectedText]}>
            {item.nativeName}
          </Text>
          <Text style={[styles.languageName, isSelected && styles.selectedText]}>
            {item.name}
          </Text>
        </View>
        
        {isSelected && (
          <MaterialIcons name="check-circle" size={24} color={Colors.light.primary} />
        )}
      </TouchableOpacity>
    );
  };
  
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => setModalVisible(true)}
      activeOpacity={0.7}
      disabled={isChanging}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="language" size={20} color={Colors.light.primary} />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.label}>{t('settings.language')}</Text>
        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>
            {currentLanguageDisplay?.name || 'English'}
          </Text>
          <MaterialIcons name="chevron-right" size={20} color={Colors.light.textSecondary} />
        </View>
      </View>
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => !isChanging && setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('languages.selectLanguage')}</Text>
              {!isChanging && (
                <TouchableOpacity 
                  onPress={() => setModalVisible(false)}
                  hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
                >
                  <MaterialIcons name="close" size={24} color="#333" />
                </TouchableOpacity>
              )}
            </View>
            
            {isChanging ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
                <Text style={styles.loadingText}>{t('common.changing')}</Text>
              </View>
            ) : (
              <FlatList
                data={languageOptions}
                renderItem={renderLanguageOption}
                keyExtractor={(item) => item.code}
                style={styles.languageList}
                contentContainerStyle={styles.languageListContent}
              />
            )}
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.light.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    color: Colors.light.text,
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginRight: 4,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  languageList: {
    width: '100%',
    maxHeight: 400,
  },
  languageListContent: {
    paddingVertical: 8,
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
    borderColor: Colors.light.primary,
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
    color: Colors.light.primary,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
});

export default LanguageSettingsItem; 