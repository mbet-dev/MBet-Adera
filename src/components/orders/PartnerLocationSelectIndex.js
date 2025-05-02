import { Platform } from 'react-native';

// Import the appropriate implementation based on platform
let PartnerLocationSelect;

if (Platform.OS === 'web') {
  // For web, use the web-specific implementation that doesn't import react-native-maps
  PartnerLocationSelect = require('./PartnerLocationSelectWeb').PartnerLocationSelect;
} else {
  // For native platforms, use the native implementation with react-native-maps
  PartnerLocationSelect = require('./PartnerLocationSelectNative').PartnerLocationSelect;
}

export { PartnerLocationSelect };