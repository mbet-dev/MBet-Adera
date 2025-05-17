# Multilingual Support in MBet-Adera

This document provides information on how to use, extend, and maintain the multilingual support in the MBet-Adera application.

## Supported Languages

MBet-Adera currently supports the following languages:

- English (en) - Default
- Amharic (am) - አማርኛ
- Oromifa (om) - Afaan Oromoo
- Tigrigna (ti) - ትግርኛ
- Somali (so) - Soomaali

## How to Use Translations in Components

### Basic Usage

To translate text in your components, use the `useTranslation` hook from react-i18next:

```jsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <View>
      <Text>{t('common.loading')}</Text>
      <Text>{t('auth.login')}</Text>
    </View>
  );
};
```

### Using Namespace and Key

Translations are organized in namespaces (like `common`, `auth`, `profile`, etc.) followed by the key:

```jsx
t('namespace.key')
```

### Variable Interpolation

You can include variables in your translations:

```jsx
// In translation file
{
  "greeting": "Hello, {{name}}!"
}

// In component
t('greeting', { name: 'John' }) // Outputs: Hello, John!
```

### Pluralization

For pluralized content:

```jsx
// In translation file
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}

// In component
t('items', { count: 1 }) // Outputs: 1 item
t('items', { count: 5 }) // Outputs: 5 items
```

## Switching Languages

### User Language Selection

Users can change the application language in two main places:

1. **Onboarding Screen**: When users first launch the app, they can select their preferred language.

2. **Profile Screen**: After logging in, users can change their language preference in the Profile tab under the Preferences section.

### Using the Language Selector Component

The app includes a `LanguageSelector` component that can be added to any screen:

```jsx
import LanguageSelector from '../src/components/LanguageSelector';

const MyScreen = () => {
  return (
    <View>
      <Text>Select Language</Text>
      <LanguageSelector label="Language:" />
    </View>
  );
};
```

For a more integrated experience in the Profile screen, use the `LanguageSettingsItem` component:

```jsx
import LanguageSettingsItem from '../components/profile/LanguageSettingsItem';

// In your Profile screen component:
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Preferences</Text>
  <LanguageSettingsItem />
  {/* Other preference items */}
</View>
```

### Programmatically Changing Languages

If you need to change the language programmatically, use the `useLanguage` hook:

```jsx
import { useLanguage } from '../src/context/LanguageContext';

const MyComponent = () => {
  const { changeLanguage } = useLanguage();
  
  const handleLanguageChange = async () => {
    await changeLanguage('am'); // Change to Amharic
  };
  
  return (
    <Button title="Switch to Amharic" onPress={handleLanguageChange} />
  );
};
```

## Adding New Languages

To add a new language to the application:

1. Create a new translation file in `src/i18n/translations/` directory
2. Update the language configuration in `src/i18n/index.ts`
3. Add the language to the supported languages list in this documentation

## RTL Support

The application includes support for right-to-left (RTL) languages. When a user selects an RTL language, the layout automatically adjusts to accommodate RTL text direction.

## Translation Management

Translations are stored in JSON files in the `src/i18n/translations/` directory. Each language has its own file with the same structure of keys.

To update translations:

1. Edit the appropriate language file in `src/i18n/translations/`
2. Follow the existing structure and naming conventions
3. Test the changes to ensure they display correctly

## Best Practices

- Always use translation keys instead of hardcoded strings
- Organize keys logically by feature or screen
- Use descriptive key names that indicate their purpose
- Test translations in all supported languages to ensure proper display
- Consider text expansion/contraction when designing layouts (some languages may require more space)

## Troubleshooting

### Missing Translations

If a translation key is missing in a language file, the app will fall back to English. 
You'll see a console warning in development. Always check these warnings and add missing translations.

### RTL Layout Issues

If you encounter layout issues in RTL languages:

1. Use `flexDirection: 'row'` and avoid fixed `left`/`right` positioning
2. Use `start`/`end` instead of `left`/`right` in margins and paddings
3. Use the `isRTL` property from the language context to conditionally adjust styling

## Additional Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [RTL Styling in React Native](https://reactnative.dev/blog/2016/08/19/right-to-left-support-for-react-native-apps) 