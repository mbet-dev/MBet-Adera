/**
 * Formats a number as a currency string in Ethiopian Birr (ETB)
 * @param amount The amount to format
 * @param locale The locale to use for formatting (defaults to 'en-ET')
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number | undefined | null, 
  locale = 'en-ET'
): string => {
  if (amount === undefined || amount === null) return 'N/A';
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'ETB',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback formatting if Intl is not supported
    return `ETB ${amount.toFixed(2)}`;
  }
};

/**
 * Formats a date as a string
 * @param date The date to format
 * @param options The formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string | number | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number' 
      ? new Date(date) 
      : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return 'Invalid date';
    
    return new Intl.DateTimeFormat('en-ET', options).format(dateObj);
  } catch (error) {
    // Fallback formatting if Intl is not supported or date is invalid
    return typeof date === 'string' ? date : new Date(date).toDateString();
  }
};

/**
 * Formats a phone number in Ethiopian format
 * @param phoneNumber The phone number to format
 * @returns Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the number starts with Ethiopian country code
  if (cleaned.startsWith('251')) {
    // Format as +251 XX XXX XXXX
    return `+251 ${cleaned.substring(3, 5)} ${cleaned.substring(5, 8)} ${cleaned.substring(8)}`;
  } 
  // Check if the number starts with 0
  else if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Format as +251 XX XXX XXXX
    return `+251 ${cleaned.substring(1, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }
  
  // Return original if doesn't match expected formats
  return phoneNumber;
};

/**
 * Formats a distance value in kilometers to a human-readable format
 * @param kilometers Distance in kilometers
 * @returns Formatted distance string
 */
export const formatDistance = (kilometers: number): string => {
  if (kilometers === 0) return '0 km';
  
  if (kilometers < 1) {
    // Convert to meters for distances less than 1 km
    const meters = Math.round(kilometers * 1000);
    return `${meters} m`;
  }
  
  // For distances greater than or equal to 1 km
  if (kilometers >= 10) {
    // Round to nearest integer for distances >= 10 km
    return `${Math.round(kilometers)} km`;
  } else {
    // Use one decimal place for distances between 1 and 10 km
    return `${kilometers.toFixed(1)} km`;
  }
};

/**
 * Truncates a string if it exceeds the maximum length and adds ellipsis
 * @param text Text to truncate
 * @param maxLength Maximum allowed length
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Formats a file size from bytes to a human-readable format
 * @param bytes Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}; 