import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Check if this is the first time the app is launched
 * @returns Promise<boolean> True if this is first launch, false otherwise
 */
export const isFirstLaunch = async (): Promise<boolean> => {
  try {
    const hasLaunched = await AsyncStorage.getItem('onboarding-completed');
    return hasLaunched === null; // If null, this is first launch
  } catch (error) {
    console.error('Error checking first launch status:', error);
    return false; // Default to false in case of error
  }
};

/**
 * Mark onboarding as completed
 */
export const markOnboardingComplete = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem('onboarding-completed', 'true');
  } catch (error) {
    console.error('Error marking onboarding as completed:', error);
  }
};

/**
 * Reset onboarding status (for testing)
 */
export const resetOnboardingStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('onboarding-completed');
  } catch (error) {
    console.error('Error resetting onboarding status:', error);
  }
}; 