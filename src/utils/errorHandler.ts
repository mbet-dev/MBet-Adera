import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Error types for better categorization and handling
 */
export enum ErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Interface for standardized error objects
 */
export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  context?: string;
  originalError?: any;
  shouldAlert?: boolean;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorDetails[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public getErrorType(error: any): ErrorType {
    if (error?.status === 401 || error?.message?.includes('auth')) {
      return ErrorType.AUTHENTICATION;
    }
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      return ErrorType.NETWORK;
    }
    if (error?.code?.includes('validation')) {
      return ErrorType.VALIDATION;
    }
    if (error?.code?.includes('permission')) {
      return ErrorType.PERMISSION;
    }
    if (error?.code?.includes('database')) {
      return ErrorType.DATABASE;
    }
    return ErrorType.UNKNOWN;
  }

  private async provideHapticFeedback(errorType: ErrorType) {
    if (Platform.OS === 'web') return;

    try {
      switch (errorType) {
        case ErrorType.AUTHENTICATION:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case ErrorType.NETWORK:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (e) {
      console.warn('Haptic feedback failed:', e);
    }
  }

  private showAlert(errorDetails: ErrorDetails) {
    const title = this.getErrorTitle(errorDetails.type);
    const message = this.getErrorMessage(errorDetails);

    Alert.alert(title, message, [
      {
        text: 'OK',
        style: 'default'
      }
    ]);
  }

  private getErrorTitle(type: ErrorType): string {
    switch (type) {
      case ErrorType.AUTHENTICATION:
        return 'Authentication Error';
      case ErrorType.NETWORK:
        return 'Network Error';
      case ErrorType.VALIDATION:
        return 'Validation Error';
      case ErrorType.DATABASE:
        return 'Database Error';
      case ErrorType.PERMISSION:
        return 'Permission Error';
      default:
        return 'Error';
    }
  }

  private getErrorMessage(errorDetails: ErrorDetails): string {
    if (errorDetails.message) {
      return errorDetails.message;
    }

    switch (errorDetails.type) {
      case ErrorType.AUTHENTICATION:
        return 'Please log in again to continue.';
      case ErrorType.NETWORK:
        return 'Please check your internet connection and try again.';
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.DATABASE:
        return 'An error occurred while accessing the database.';
      case ErrorType.PERMISSION:
        return 'You do not have permission to perform this action.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  public handleError(error: any, context?: string): ErrorDetails {
    const errorDetails: ErrorDetails = {
      type: this.getErrorType(error),
      message: error?.message || 'An unexpected error occurred',
      code: error?.code,
      context,
      originalError: error
    };

    // Log the error
    this.errorLog.push(errorDetails);
    console.error('Error occurred:', errorDetails);

    // Provide feedback
    this.provideHapticFeedback(errorDetails.type);
    this.showAlert(errorDetails);

    return errorDetails;
  }

  public getErrorLog(): ErrorDetails[] {
    return [...this.errorLog];
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }
}

export const errorHandler = ErrorHandler.getInstance();

/**
 * Create a standardized error object
 */
export const createAppError = (error: any, defaultMessage = 'An error occurred'): ErrorDetails => {
  const type = errorHandler.getErrorType(error);
  let message = defaultMessage;
  let code = '';
  let shouldAlert = false;
  
  // Extract meaningful information from the error
  if (error) {
    if (error.message) {
      message = error.message;
    }
    
    if (error.code) {
      code = error.code;
    }
    
    // Determine if this error should trigger an alert
    switch (type) {
      case ErrorType.AUTHENTICATION:
        message = 'Authentication error. Please log in again.';
        shouldAlert = true;
        break;
      case ErrorType.NETWORK:
        message = 'Network connection issue. Please check your internet connection.';
        shouldAlert = true;
        break;
      case ErrorType.DATABASE:
        message = 'Database error. Please try again later.';
        shouldAlert = false; // Don't alert for DB errors, just log them
        break;
      case ErrorType.PERMISSION:
        message = 'You do not have permission to perform this action.';
        shouldAlert = true;
        break;
      case ErrorType.VALIDATION:
        // Keep the original validation message if possible
        shouldAlert = true;
        break;
      default:
        shouldAlert = true;
    }
  }
  
  return {
    type,
    message,
    originalError: error,
    code,
    shouldAlert,
  };
};

/**
 * Log an error to the console with additional context
 */
export const logError = (error: any, context = 'App'): ErrorDetails => {
  const appError = errorHandler.handleError(error, context);
  
  console.error(
    `[${context}] ${appError.type.toUpperCase()} ERROR:`,
    appError.message,
    appError.code ? `Code: ${appError.code}` : '',
    appError.originalError || ''
  );
  
  // Log to analytics or error tracking service in production
  // if (process.env.NODE_ENV === 'production') {
  //   // Send to error tracking service
  // }
  
  return appError;
};

/**
 * Handle authentication errors specifically
 */
export const handleAuthError = async (error: any, context = 'Auth'): Promise<ErrorDetails> => {
  const appError = logError(error, context);
  
  if (appError.type === ErrorType.AUTHENTICATION) {
    // Clear authentication data
    try {
      const keysToRemove = [
        'supabase.auth.token',
        'sb-jaqwviuxhxsxypmffece-auth-token',
        'hasActiveSession',
      ];
      
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
      
      // Don't remove user data, as it can be useful for offline mode
    } catch (storageError) {
      console.error('Error clearing auth data:', storageError);
    }
    
    // Show auth error alert
    Alert.alert(
      'Authentication Error',
      'Your session has expired. Please log in again.',
      [{ text: 'OK' }]
    );
  }
  
  return appError;
};

/**
 * Handle network errors with offline support
 */
export const handleNetworkError = (error: any, context = 'Network'): ErrorDetails => {
  const appError = logError(error, context);
  
  if (appError.type === ErrorType.NETWORK) {
    // Show offline mode alert
    Alert.alert(
      'Network Error',
      'You appear to be offline. Some features may be limited.',
      [{ text: 'OK' }]
    );
  }
  
  return appError;
};

/**
 * Safely execute a function with error handling
 */
export const safeExecute = async <T>(
  fn: () => Promise<T>,
  fallbackValue: T,
  context = 'SafeExecute'
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    errorHandler.handleError(error, context);
    return fallbackValue;
  }
};

export default {
  errorHandler,
  createAppError,
  logError,
  handleAuthError,
  handleNetworkError,
  safeExecute,
  ErrorType,
}; 