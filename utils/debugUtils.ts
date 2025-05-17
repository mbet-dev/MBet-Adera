/**
 * Debug Utilities
 * Provides helper functions for debugging
 */

import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

/**
 * Logs information about the environment
 */
export const logEnvironmentInfo = (): void => {
  console.log('=== Environment Info ===');
  console.log('Platform:', Platform.OS);
  console.log('Version:', Platform.Version);
  console.log('isTV:', Platform.isTV);
  
  if (Platform.OS === 'ios') {
    console.log('isPad:', Platform.isPad);
  } else if (Platform.OS === 'android') {
    console.log('API Level:', Platform.constants.Release);
  }
  
  console.log('Native App Version:', Application.nativeApplicationVersion);
  console.log('Native Build Version:', Application.nativeBuildVersion);
  console.log('Expo SDK Version:', Constants.expoConfig?.sdkVersion);
  console.log('App Name:', Constants.expoConfig?.name);
  console.log('======================');
};

/**
 * Checks if a native module is available
 * 
 * @param moduleName - The name of the module to check
 * @returns boolean indicating if the module is available
 */
export const checkNativeModule = (moduleName: string): boolean => {
  try {
    // Avoid using dynamic strings with require as Metro doesn't support it
    let isAvailable = false;
    
    // Instead, check for specific modules we know we might use
    if (moduleName === 'expo-barcode-scanner') {
      isAvailable = !!require('expo-barcode-scanner');
    } else if (moduleName === 'expo-haptics') {
      isAvailable = !!require('expo-haptics');
    }
    
    console.log(`Module check: ${moduleName} - ${isAvailable ? 'Available' : 'Not available'}`);
    return isAvailable;
  } catch (error) {
    console.log(`Module check: ${moduleName} - Not available`, error);
    return false;
  }
};

/**
 * Performs diagnostics on QR scanning modules
 * @returns Diagnostic information about QR scanning modules
 */
export const diagnoseScannerModules = async (): Promise<{ 
  status: 'ok' | 'warning' | 'error',
  message: string,
  details: Record<string, any>
}> => {
  console.log('Running QR scanner module diagnostics...');
  
  const details: Record<string, any> = {
    platform: Platform.OS,
    scannerChecks: {}
  };
  
  // Check for expo-barcode-scanner
  try {
    // Import the module directly instead of dynamically
    const barcodeScanner = require('expo-barcode-scanner');
    details.scannerChecks.modulesAvailable = true;
    
    // Check for BarCodeScanner
    if (barcodeScanner.BarCodeScanner) {
      details.scannerChecks.barCodeScannerClass = true;
      
      // Check if permissions API exists
      if (typeof barcodeScanner.BarCodeScanner.requestPermissionsAsync === 'function') {
        details.scannerChecks.permissionsApiAvailable = true;
        
        try {
          // Check permissions status
          const { status } = await barcodeScanner.BarCodeScanner.requestPermissionsAsync();
          details.scannerChecks.permissionStatus = status;
          details.scannerChecks.permissionGranted = status === 'granted';
        } catch (permError: any) {
          console.error('Error checking camera permissions:', permError);
          details.scannerChecks.permissionError = permError.message || 'Unknown error';
        }
      } else {
        details.scannerChecks.permissionsApiAvailable = false;
      }
    } else {
      details.scannerChecks.barCodeScannerClass = false;
    }
  } catch (error: any) {
    console.error('Error checking barcode scanner module:', error);
    details.scannerChecks.modulesAvailable = false;
    details.scannerChecks.error = error.message || 'Unknown error';
  }
  
  // Check for expo-haptics
  try {
    const haptics = require('expo-haptics');
    details.haptics = {
      available: true,
      notificationTypes: Object.keys(haptics.NotificationFeedbackType || {})
    };
  } catch (error: any) {
    console.error('Error checking haptics module:', error);
    details.haptics = {
      available: false,
      error: error.message || 'Unknown error'
    };
  }
  
  // Determine overall status
  let status: 'ok' | 'warning' | 'error' = 'ok';
  let message = 'QR scanner modules are available and functioning correctly';
  
  if (!details.scannerChecks.modulesAvailable) {
    status = 'error';
    message = 'QR scanner module is not available';
  } else if (!details.scannerChecks.barCodeScannerClass) {
    status = 'error';
    message = 'BarCodeScanner class is not available';
  } else if (!details.scannerChecks.permissionsApiAvailable) {
    status = 'warning';
    message = 'Permissions API is not available';
  } else if (details.scannerChecks.permissionStatus !== 'granted') {
    status = 'warning';
    message = `Camera permission is ${details.scannerChecks.permissionStatus}`;
  }
  
  console.log('QR scanner diagnostics completed:', { status, message });
  
  return {
    status,
    message,
    details
  };
}; 