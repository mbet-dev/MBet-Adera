import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import LanguageSelector from '../../components/LanguageSelector';

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationEnabled, setLocationEnabled] = React.useState(true);

  const toggleDarkMode = () => setIsDarkMode(previousState => !previousState);
  const toggleNotifications = () => setNotificationsEnabled(previousState => !previousState);
  const toggleLocation = () => setLocationEnabled(previousState => !previousState);

  const settingsSections = [
    {
      title: t('settings.account'),
      items: [
        {
          icon: 'person',
          label: t('profile.editProfile'),
          onPress: () => navigation.navigate('EditProfile'),
          showArrow: true,
        },
        {
          icon: 'vpn-key',
          label: t('profile.changePassword'),
          onPress: () => navigation.navigate('ChangePassword'),
          showArrow: true,
        },
      ],
    },
    {
      title: t('settings.appearance'),
      items: [
        {
          icon: 'brightness-6',
          label: t('settings.darkMode'),
          onPress: toggleDarkMode,
          showArrow: false,
          rightElement: <Switch value={isDarkMode} onValueChange={toggleDarkMode} />,
        },
        {
          icon: 'language',
          label: t('settings.language'),
          customComponent: (
            <View style={styles.languageContainer}>
              <LanguageSelector 
                showIcon={false}
                buttonStyle={styles.languageSelector}
                label={t('settings.language')}
              />
            </View>
          ),
        },
      ],
    },
    {
      title: t('settings.notifications'),
      items: [
        {
          icon: 'notifications',
          label: t('settings.notifications'),
          onPress: toggleNotifications,
          showArrow: false,
          rightElement: <Switch value={notificationsEnabled} onValueChange={toggleNotifications} />,
        },
      ],
    },
    {
      title: t('settings.security'),
      items: [
        {
          icon: 'location-on',
          label: t('settings.locationServices'),
          onPress: toggleLocation,
          showArrow: false,
          rightElement: <Switch value={locationEnabled} onValueChange={toggleLocation} />,
        },
        {
          icon: 'fingerprint',
          label: t('settings.biometric'),
          onPress: () => {},
          showArrow: true,
        },
      ],
    },
    {
      title: t('profile.help'),
      items: [
        {
          icon: 'help',
          label: t('profile.help'),
          onPress: () => navigation.navigate('Help'),
          showArrow: true,
        },
        {
          icon: 'info',
          label: t('profile.about'),
          onPress: () => navigation.navigate('About'),
          showArrow: true,
        },
        {
          icon: 'description',
          label: t('profile.terms'),
          onPress: () => navigation.navigate('Terms'),
          showArrow: true,
        },
        {
          icon: 'privacy-tip',
          label: t('profile.privacy'),
          onPress: () => navigation.navigate('Privacy'),
          showArrow: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: any) => {
    if (item.customComponent) {
      return item.customComponent;
    }

    return (
      <TouchableOpacity
        key={item.label}
        style={styles.settingItem}
        onPress={item.onPress}
      >
        <View style={styles.settingItemLeft}>
          <MaterialIcons name={item.icon} size={24} color="#34495e" style={styles.settingIcon} />
          <Text style={styles.settingLabel}>{item.label}</Text>
        </View>

        <View style={styles.settingItemRight}>
          {item.rightElement}
          {item.showArrow && (
            <MaterialIcons name="chevron-right" size={24} color="#95a5a6" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#3498db" barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {settingsSections.map((section, index) => (
          <View key={index} style={styles.settingSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            <View style={styles.sectionContent}>
              {section.items.map((item) => renderSettingItem(item))}
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => {/* Handle logout */}}
        >
          <MaterialIcons name="exit-to-app" size={24} color="#e74c3c" />
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#3498db',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2980b9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#34495e',
  },
  settingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  languageContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: '100%',
  },
  languageSelector: {
    backgroundColor: '#fff',
    borderWidth: 0,
    paddingLeft: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 20,
    padding: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default SettingsScreen; 