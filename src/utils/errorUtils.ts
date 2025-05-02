import { Alert, Platform } from 'react-native';

/**
 * Utility for handling errors gracefully throughout the app
 */
export const errorUtils = {
  /**
   * Handle API errors with appropriate user feedback
   */
  handleApiError(error: any, fallbackMessage: string = 'An unexpected error occurred'): string {
    console.error('API Error:', error);
    
    // Extract the error message from various error formats
    let errorMessage = fallbackMessage;
    
    if (error?.message) {
      errorMessage = error.message;
    } else if (error?.error_description) {
      errorMessage = error.error_description;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error?.statusText) {
      errorMessage = error.statusText;
    }
    
    // Show alert on mobile platforms
    if (Platform.OS !== 'web') {
      Alert.alert('Error', errorMessage);
    }
    
    return errorMessage;
  },
  
  /**
   * Handle form validation errors
   */
  handleValidationErrors(errors: Record<string, string>): string {
    const errorMessages = Object.values(errors);
    const errorMessage = errorMessages.join('\n');
    
    // Show alert on mobile platforms
    if (Platform.OS !== 'web' && errorMessages.length > 0) {
      Alert.alert('Validation Error', errorMessage);
    }
    
    return errorMessage;
  },
  
  /**
   * Log errors to a monitoring service (placeholder for now)
   */
  logError(error: any, context: string = 'app'): void {
    // In a real app, this would send the error to a monitoring service like Sentry
    console.error(`[${context}] Error:`, error);
  }
};
