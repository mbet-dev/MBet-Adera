import { NewDeliveryFormData } from '../types/parcel';

/**
 * Utility functions for form validation
 */
export const validationUtils = {
  /**
   * Validate a phone number (Ethiopian format)
   */
  isValidPhoneNumber(phone: string): boolean {
    // Ethiopian phone number format: +251 9X XXX XXXX or 09X XXX XXXX
    const ethiopianPhoneRegex = /^(\+251|0)[9][0-9]{8}$/;
    return ethiopianPhoneRegex.test(phone.replace(/\s/g, ''));
  },

  /**
   * Validate an address (simple validation)
   */
  isValidAddress(address: string): boolean {
    return address.trim().length >= 5;
  },

  /**
   * Validate the entire new delivery form
   */
  validateNewDeliveryForm(formData: Partial<NewDeliveryFormData>): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};

    // Validate package details
    if (!formData.packageSize) {
      errors.packageSize = 'Please select a package size';
    }

    // Validate location details
    if (!formData.pickupLocation || !this.isValidAddress(formData.pickupLocation)) {
      errors.pickupLocation = 'Please enter a valid pickup location';
    }

    if (!formData.dropoffLocation || !this.isValidAddress(formData.dropoffLocation)) {
      errors.dropoffLocation = 'Please enter a valid dropoff location';
    }

    if (!formData.pickupContact || !this.isValidPhoneNumber(formData.pickupContact)) {
      errors.pickupContact = 'Please enter a valid pickup contact phone number';
    }

    if (!formData.dropoffContact || !this.isValidPhoneNumber(formData.dropoffContact)) {
      errors.dropoffContact = 'Please enter a valid dropoff contact phone number';
    }

    // Validate payment details
    if (!formData.paymentMethod) {
      errors.paymentMethod = 'Please select a payment method';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },
};
