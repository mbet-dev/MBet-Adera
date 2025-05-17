/**
 * Troubleshooting Utilities
 * Provides helper functions for identifying and resolving issues
 */

import { Platform } from 'react-native';
import { checkNativeModule } from './debugUtils';

// Import modules statically to avoid TypeScript dynamic import errors
// In real usage, these would be imported conditionally to prevent crashes
let BarCodeScanner: any;
try {
  // This will only execute in environments where the module is available
  if (Platform.OS !== 'web') {
    const barcodeModule = require('expo-barcode-scanner');
    BarCodeScanner = barcodeModule.BarCodeScanner;
  }
} catch (e) {
  console.log('Barcode scanner not available');
}

/**
 * Runs a series of troubleshooting checks for common issues
 * @returns An object with the results of each check
 */
export const runTroubleshooting = async (): Promise<Record<string, boolean>> => {
  console.log('Running troubleshooting checks...');
  
  const results: Record<string, boolean> = {};
  
  // Check camera module availability
  try {
    if (Platform.OS !== 'web' && BarCodeScanner) {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      results.cameraPermission = status === 'granted';
    } else {
      results.cameraPermission = false; // Web doesn't support camera directly
    }
  } catch (error) {
    console.error('Camera permission check failed:', error);
    results.cameraPermission = false;
  }
  
  // Check for the BarCodeScanner module
  results.barcodeModuleAvailable = !!BarCodeScanner;
  
  // Check for the Haptics module
  try {
    const hapticsAvailable = !!require('expo-haptics');
    results.hapticsModuleAvailable = hapticsAvailable;
  } catch (error) {
    console.error('Haptics module check failed:', error);
    results.hapticsModuleAvailable = false;
  }
  
  // Check for internet connectivity
  try {
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      // Remove timeout as it's not in the standard RequestInit type
      signal: AbortSignal.timeout(5000) // Modern approach to request timeout
    });
    results.internetConnectivity = response.ok;
  } catch (error) {
    console.error('Internet connectivity check failed:', error);
    results.internetConnectivity = false;
  }
  
  console.log('Troubleshooting results:', results);
  return results;
}; 