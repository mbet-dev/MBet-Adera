/**
 * QR Code Utility Functions
 * Provides helper functions for QR code scanning and data processing
 */

/**
 * Extracts tracking code from QR data
 * Handles different QR code formats that might be used by the app or partners
 * 
 * @param data - The raw data from the QR code scan
 * @returns The extracted tracking code
 */
export const extractTrackingCode = (data: string): string => {
  // If the data is a URL, extract the tracking code from it
  if (data.startsWith('http://') || data.startsWith('https://')) {
    try {
      const url = new URL(data);
      // Check if it's our tracking URL
      if (url.pathname.includes('/tracking')) {
        return url.searchParams.get('code') || '';
      }
      // If not, try to extract from the last part of the path
      const pathParts = url.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch (error) {
      console.error('Error parsing URL from QR code:', error);
      return data;
    }
  }

  // Check if it's a JSON string
  if (data.startsWith('{') && data.endsWith('}')) {
    try {
      const jsonData = JSON.parse(data);
      return jsonData.trackingCode || jsonData.code || jsonData.id || data;
    } catch (error) {
      console.error('Error parsing JSON from QR code:', error);
      return data;
    }
  }

  // If it's a simple tracking code with our prefix
  if (data.startsWith('MBET-') || data.startsWith('ADERA-')) {
    return data;
  }

  // Default: return the data as is if no patterns match
  return data;
};

/**
 * Gets a user-friendly error message for QR scanner errors
 * 
 * @param error - The error object
 * @returns A user-friendly error message
 */
export const getQRScannerErrorMessage = (error: any): string => {
  // Default error message
  let message = 'Failed to scan QR code. Please try again.';
  
  // Extract error message or code
  const errorMessage = error?.message || '';
  const errorCode = error?.code || '';
  
  // Handle common error scenarios
  if (errorMessage.includes('permission') || errorCode.includes('permission')) {
    message = 'Camera permission denied. Please enable camera access in your device settings.';
  } else if (errorMessage.includes('unavailable') || errorCode.includes('unavailable')) {
    message = 'Camera is not available on this device.';
  } else if (errorMessage.includes('timeout') || errorCode.includes('timeout')) {
    message = 'Scanning timed out. Please try again.';
  } else if (errorMessage.includes('network') || errorCode.includes('network')) {
    message = 'Network error. Please check your connection and try again.';
  }
  
  return message;
}; 