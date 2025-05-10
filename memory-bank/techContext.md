# MBet-Adera Technical Context

## Development Stack

### Frontend
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **UI Library**: React Native Paper
- **Navigation**: React Navigation
- **State Management**: React Context + Hooks
- **Maps**: React Native Maps
- **Forms**: React Hook Form
- **Internationalization**: i18next
- **QR Code**: react-native-qrcode-svg
- **Camera**: expo-camera

### Backend
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime

### Development Tools
- **Package Manager**: npm
- **Bundler**: Metro
- **Transpiler**: Babel
- **Linting**: ESLint
- **Testing**: Jest
- **Type Checking**: TypeScript
- **Translation Management**: i18next
- **QR Testing**: QR code testing tools

## Development Setup

### Prerequisites
1. Node.js (v18 or higher)
2. npm (v8 or higher)
3. Expo CLI
4. Android Studio (for Android development)
5. Xcode (for iOS development)
6. Supabase CLI
7. Camera access permissions
8. QR code testing devices

### Environment Configuration
Required environment variables:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
GOOGLE_MAPS_API_KEY=your_maps_api_key
YENEPAY_MERCHANT_ID=your_merchant_id
TELEBIRR_API_KEY=your_telebirr_key
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,am,om,ti,so
```

### Development Workflow
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables
4. Set up translation files
5. Configure QR code scanning
6. Start development server: `npm start`
7. Run on specific platform:
   - Android: `npm run android`
   - iOS: `npm run ios`
   - Web: `npm run web`

## Technical Constraints

### Platform Support
- iOS 13.0+
- Android 5.0+
- Modern web browsers

### Performance Requirements
- App launch time < 3 seconds
- Screen transition < 1 second
- Map loading < 2 seconds
- Payment processing < 5 seconds
- QR code scanning < 1 second
- Language switching < 0.5 seconds

### Security Requirements
- HTTPS for all API calls
- Secure storage for sensitive data
- Token-based authentication
- Regular security audits
- Secure QR code data handling
- Language data integrity

## Dependencies

### Core Dependencies
```json
{
  "expo": "~52.0.46",
  "react": "18.3.1",
  "react-native": "0.76.9",
  "@supabase/supabase-js": "^2.49.4",
  "react-native-maps": "^1.18.0",
  "yenepay.sdk.react-native": "github:YenePay/yenepay.sdk.react-native",
  "react-native-qrcode-svg": "^6.3.15",
  "i18next": "^24.2.3",
  "react-i18next": "^15.4.1",
  "expo-camera": "~14.0.3"
}
```

### Development Dependencies
```json
{
  "@types/react": "~18.3.12",
  "@types/react-native": "^0.73.0",
  "typescript": "^5.8.3",
  "jest": "^29.2.1",
  "eslint": "^8.0.0",
  "@types/i18next": "^23.4.3"
}
```

## Build and Deployment

### Build Process
1. Development build: `expo build:android` or `expo build:ios`
2. Production build: `expo build:android --release` or `expo build:ios --release`
3. Web build: `expo build:web`
4. Translation build: `npm run build:translations`

### Deployment
1. Android: Google Play Store
2. iOS: App Store
3. Web: Static hosting (e.g., Vercel, Netlify)
4. Translations: Translation management system

### CI/CD Pipeline
1. Automated testing
2. Code quality checks
3. Build verification
4. Deployment automation
5. Translation verification
6. QR code testing 