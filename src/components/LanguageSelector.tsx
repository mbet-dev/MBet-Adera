import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../context/LanguageContext';
import { MaterialIcons } from '@expo/vector-icons';

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

interface LanguageSelectorProps {
  buttonStyle?: object;
  textStyle?: object;
  modalStyle?: object;
  showIcon?: boolean;
  label?: string;
  compact?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  buttonStyle,
  textStyle,
  modalStyle,
  showIcon = true,
  label,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, languageOptions } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLanguageDisplay = languageOptions.find(
    (lang) => lang.code === currentLanguage
  );

  const handleSelectLanguage = async (lang: string) => {
    await changeLanguage(lang);
    setModalVisible(false);
  };

  const renderLanguageItem = ({ item }: { item: LanguageOption }) => {
    const isSelected = item.code === currentLanguage;

    return (
      <TouchableOpacity
        style={[styles.languageItem, isSelected && styles.selectedLanguageItem]}
        onPress={() => handleSelectLanguage(item.code)}
      >
        <Text style={[styles.languageName, isSelected && styles.selectedLanguageText]}>
          {item.name}
        </Text>
        <Text style={[styles.nativeName, isSelected && styles.selectedLanguageText]}>
          {item.nativeName}
        </Text>
        {isSelected && (
          <MaterialIcons name="check" size={24} color="#3498db" style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.selectorButton, 
          compact ? styles.compactButton : null,
          buttonStyle
        ]}
        onPress={() => setModalVisible(true)}
      >
        {label ? (
          <Text style={[styles.labelText, textStyle]}>{label}</Text>
        ) : null}
        <Text style={[styles.languageText, textStyle]}>
          {currentLanguageDisplay?.name || 'Language'}
        </Text>
        {showIcon && <MaterialIcons name="language" size={24} color="#333" />}
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.centeredView}>
          <View style={[styles.modalView, modalStyle]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('languages.selectLanguage')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={languageOptions}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
              contentContainerStyle={styles.languageListContent}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  compactButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  labelText: {
    fontSize: 14,
    color: '#555',
    marginRight: 8,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
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
  },
  languageListContent: {
    paddingVertical: 8,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedLanguageItem: {
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  nativeName: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  selectedLanguageText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  checkIcon: {
    marginLeft: 4,
  },
});

export default LanguageSelector; 