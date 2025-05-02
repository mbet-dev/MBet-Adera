import { Platform } from 'react-native';

// Use platform-specific exports
let PartnerLocationSelect;

if (Platform.OS === 'web') {
  // For web, use the web-specific implementation
  PartnerLocationSelect = require('./PartnerLocationSelect.web').PartnerLocationSelect;
} else {
  // For native platforms, use the native implementation
  // This import will only be evaluated on native platforms
  PartnerLocationSelect = require('./PartnerLocationSelect').PartnerLocationSelect;
}

export { PartnerLocationSelect };