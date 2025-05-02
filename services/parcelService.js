/**
 * Mock Parcel Service
 * This is a placeholder implementation for testing purposes
 */

export const parcelService = {
  createDelivery: async (formData, userId) => {
    console.log('Mock createDelivery called with:', { formData, userId });
    
    // Return a mock result after a short delay
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 'mock-id-' + Math.random().toString(36).substring(2, 10),
          tracking_code: 'MBT' + Math.floor(Math.random() * 10000000),
          status: 'pending',
          created_at: new Date().toISOString(),
        });
      }, 1000);
    });
  },
  
  getParcelStatistics: async (userId) => {
    console.log('Mock getParcelStatistics called for user:', userId);
    return {
      active: 3,
      delivered: 5,
      cancelled: 1,
      total: 9
    };
  }
}; 