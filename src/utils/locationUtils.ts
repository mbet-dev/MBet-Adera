import * as Location from 'expo-location';

/**
 * Utility functions for handling location services
 */
export const locationUtils = {
  /**
   * Request location permissions from the user
   */
  async requestLocationPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  },

  /**
   * Get the current location of the device
   */
  async getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const hasPermission = await this.requestLocationPermissions();
      if (!hasPermission) return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  },

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const results = await Location.geocodeAsync(address);
      if (results.length > 0) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  },

  /**
   * Reverse geocode coordinates to get an address
   */
  async reverseGeocodeCoordinates(
    latitude: number,
    longitude: number
  ): Promise<string | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results.length > 0) {
        const { street, city, region, country } = results[0];
        return [street, city, region, country].filter(Boolean).join(', ');
      }
      return null;
    } catch (error) {
      console.error('Error reverse geocoding coordinates:', error);
      return null;
    }
  },

  /**
   * Calculate the distance between two coordinates in kilometers
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return parseFloat(distance.toFixed(2));
  },

  /**
   * Convert degrees to radians
   */
  deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  },
};
