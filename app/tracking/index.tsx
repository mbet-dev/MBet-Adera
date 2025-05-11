import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
  SafeAreaView,
  Share,
  ScrollView,
  Clipboard,
  Image,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';
// Use OpenStreetMap instead of MapView for consistency
import { OpenStreetMap } from '../../src/components/OpenStreetMap';
import * as Location from 'expo-location';
import { formatDistance } from '../../src/utils/formatting';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import QRCode from 'react-native-qrcode-svg';
import * as MediaLibrary from 'expo-media-library';
import ViewShot from 'react-native-view-shot';

// Map style dimensions
const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

// Map container height
const MAP_HEIGHT = Math.min(300, height * 0.4);

// Type declarations for the component references
type QRCodeRef = React.Component<any> | null;
type ViewShotRef = React.Component<any> | null;

interface ParcelData {
  id: string;
  tracking_code: string;
  status: string;
  sender_id?: string;
  receiver_id?: string;
  pickup_address_id?: string;
  dropoff_address_id?: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface AddressData {
  id: string;
  address_line: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface CourierData {
  id: string;
  full_name: string;
  phone_number: string;
}

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
}

const MapTrackingScreen = () => {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const mapRef = useRef<any>(null);
  const qrRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<ParcelData | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LocationData | null>(null);
  const [courierLocation, setCourierLocation] = useState<LocationData | null>(null);
  const [courier, setCourier] = useState<CourierData | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [realTimeTracking, setRealTimeTracking] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState<string | null>(null);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [qrValue, setQrValue] = useState<string>('');

  useEffect(() => {
    navigation.setOptions({
      title: 'Track Parcel',
      headerShown: true,
    });

    getUserLocation();
    fetchParcelData();

    return () => {
      // Cleanup subscription when component unmounts
      if (realTimeTracking) {
        supabase.removeAllChannels();
      }
    };
  }, [id]);

  useEffect(() => {
    if (parcel?.tracking_code) {
      const deepLink = `mbetadera://track/${parcel.tracking_code}`;
      const webUrl = `https://mbetadera.app/track/${parcel.tracking_code}`;
      setQrValue(`${deepLink}?web=${webUrl}`);
    }
  }, [parcel?.tracking_code]);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionGranted(false);
        return;
      }

      setLocationPermissionGranted(true);
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const fetchParcelData = async () => {
    try {
      setLoading(true);
      
      // Validate the ID parameter
      if (!id || typeof id !== 'string') {
        throw new Error('Invalid parcel ID');
      }

      // Fetch parcel details
      const { data: parcelData, error: parcelError } = await supabase
        .from('parcels')
        .select('id, tracking_code, status, sender_id, receiver_id, pickup_address_id, dropoff_address_id')
        .eq('id', id)
        .single();

      if (parcelError) throw parcelError;
      if (!parcelData) {
        Alert.alert('No Parcel Selected', 'No specific Parcel has been selected to be Viewed here. Select one.');
        router.back();
        return;
      }

      setParcel(parcelData as ParcelData);

      // Fetch pickup address
      if (parcelData.pickup_address_id) {
        const { data: pickupAddressData, error: pickupError } = await supabase
          .from('addresses')
          .select('id, address_line, city, latitude, longitude')
          .eq('id', parcelData.pickup_address_id)
          .single();

        if (pickupError) throw pickupError;
        if (pickupAddressData) {
          setPickupLocation({
            latitude: pickupAddressData.latitude,
            longitude: pickupAddressData.longitude,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Fetch dropoff address
      if (parcelData.dropoff_address_id) {
        const { data: dropoffAddressData, error: dropoffError } = await supabase
          .from('addresses')
          .select('id, address_line, city, latitude, longitude')
          .eq('id', parcelData.dropoff_address_id)
          .single();

        if (dropoffError) throw dropoffError;
        if (dropoffAddressData) {
          setDropoffLocation({
            latitude: dropoffAddressData.latitude,
            longitude: dropoffAddressData.longitude,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Fetch courier details if available
      if (parcelData.sender_id) {
        const { data: courierData, error: courierError } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number')
          .eq('id', parcelData.sender_id)
          .single();

        if (courierError) throw courierError;
        if (courierData) {
          setCourier(courierData as CourierData);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching parcel data:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to fetch parcel details'
      );
      router.back();
    }
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const calculateEstimatedArrival = (
    currentLocation: { latitude: number; longitude: number } | null,
    destination: { latitude: number; longitude: number } | null
  ) => {
    if (!currentLocation || !destination) return;
    
    // Calculate straight-line distance in kilometers
    const distanceInKm = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      destination.latitude,
      destination.longitude
    );
    
    // Assume average speed of 30 km/h for urban delivery
    const estimatedTimeInHours = distanceInKm / 30;
    const estimatedTimeInMinutes = Math.round(estimatedTimeInHours * 60);
    
    // Calculate arrival time
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + estimatedTimeInMinutes * 60000);
    
    // Format for display
    let arrivalString;
    if (estimatedTimeInMinutes < 60) {
      arrivalString = estimatedTimeInMinutes + " minutes";
    } else {
      const hours = Math.floor(estimatedTimeInMinutes / 60);
      const minutes = estimatedTimeInMinutes % 60;
      
      if (minutes > 0) {
        arrivalString = hours + " hour" + (hours > 1 ? 's' : '') + " " + minutes + " min";
      } else {
        arrivalString = hours + " hour" + (hours > 1 ? 's' : '');
      }
    }
    
    setEstimatedArrival(arrivalString);
  };

  // Function to capture QR code as an image
  const captureQRCode = async (): Promise<string | null> => {
    try {
      // Check if qrRef is valid
      if (!qrRef.current) return null;
      
      // Request permissions if on native device
      if (Platform.OS !== 'web') {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is needed to save QR code');
          return null;
        }
      }
      
      // Safely capture using ViewShot
      // The "as any" cast is used because TypeScript doesn't understand the dynamic nature
      // of the ViewShot component's capture method
      const viewShot = qrRef.current as any;
      if (viewShot && typeof viewShot.capture === 'function') {
        const uri = await viewShot.capture();
        return uri;
      }
      return null;
    } catch (error) {
      console.error('Error capturing QR code:', error);
      return null;
    }
  };

  // Function to handle sharing with QR code
  const handleShare = async () => {
    if (!parcel?.tracking_code) return;
    
    try {
      setSharingInProgress(true);
      
      const trackingCode = parcel.tracking_code;
      const appDeepLink = `mbetadera://track/${trackingCode}`;
      const webFallback = `https://mbetadera.app/track/${trackingCode}`;
      const message = `Track my parcel with MBet-Adera!\nTracking ID: ${trackingCode}\nStatus: ${parcel?.status?.toUpperCase() || 'UNKNOWN'}\n\nScan the QR code or use this link: ${webFallback}`;
      
      if (Platform.OS === 'web') {
        try {
          // Web sharing implementation
          if (navigator.share) {
            // Use Web Share API if available
            await navigator.share({
              title: 'Track My Parcel',
              text: message,
              url: webFallback
            });
          } else {
            // Fallback to clipboard
            await navigator.clipboard.writeText(message);
            alert('Tracking information copied to clipboard!\nYou can now paste and share it.');
            
            // Create temporary link for sharing
            const tempLink = document.createElement('a');
            tempLink.href = webFallback;
            tempLink.target = '_blank';
            tempLink.click();
          }
        } catch (error) {
          console.error('Web sharing error:', error);
          alert('Tracking information copied to clipboard!');
        }
      } else {
        // Native sharing implementation
        const qrImageUri = await captureQRCode();
        
        if (qrImageUri) {
          // Check if Sharing API is available
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(qrImageUri, {
              mimeType: 'image/png',
              dialogTitle: 'Share Parcel Tracking',
              UTI: 'public.png'
            });
          } else {
            // Use fallback Share API
            await Share.share({
              message: message,
              url: qrImageUri,
              title: 'Track My Parcel'
            });
          }
        } else {
          // Fallback to text-only sharing
          await Share.share({
            message: message,
            url: webFallback,
            title: 'Track My Parcel'
          });
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Sharing Failed', 'Could not share tracking information. Please try again.');
    } finally {
      setSharingInProgress(false);
    }
  };

  // Component to display QR code in the tracking screen
  const QRCodeDisplay = useCallback(() => {
    if (!parcel?.tracking_code || !qrValue) return null;
    
    const logoSize = Platform.OS === 'web' ? 60 : 40;
    
    return (
      <View style={styles.qrCodeContainer}>
        <Text style={styles.qrCodeTitle}>Scan to Track</Text>
        
        <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }} style={styles.qrCodeWrapper}>
          <View style={styles.qrBackground}>
            {Platform.OS === 'web' ? (
              <View style={styles.webQrContainer}>
                <QRCode
                  value={qrValue}
                  size={200}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                  logo={require('../../assets/images/logo2.png')}
                  logoSize={logoSize}
                  logoBackgroundColor="white"
                  logoBorderRadius={10}
                />
              </View>
            ) : (
              <QRCode
                value={qrValue}
                size={200}
                backgroundColor="#FFFFFF"
                color="#000000"
                logo={require('../../assets/images/logo2.png')}
                logoSize={logoSize}
                logoBackgroundColor="white"
                logoBorderRadius={10}
              />
            )}
          </View>
        </ViewShot>
        
        <Text style={styles.qrCodeSubtitle}>Share this QR code to let others track this parcel</Text>
        <Text style={styles.qrCodeDeepLink}>Opens: <Text style={styles.codeText}>{`mbetadera://track/${parcel.tracking_code}`}</Text></Text>
      </View>
    );
  }, [parcel?.tracking_code, qrValue]);

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading tracking information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Convert locations to markers
  const mapMarkers: MarkerData[] = [];
  
  if (pickupLocation) {
    mapMarkers.push({
      id: 'pickup',
      latitude: pickupLocation.latitude,
      longitude: pickupLocation.longitude,
      title: 'Pickup Location',
      color: '#4CAF50', // Green
    });
  }
  
  if (dropoffLocation) {
    mapMarkers.push({
      id: 'dropoff',
      latitude: dropoffLocation.latitude,
      longitude: dropoffLocation.longitude,
      title: 'Dropoff Location',
      color: '#FF5722', // Orange
    });
  }
  
  if (courierLocation) {
    mapMarkers.push({
      id: 'courier',
      latitude: courierLocation.latitude,
      longitude: courierLocation.longitude,
      title: 'Courier',
      color: '#1976D2', // Blue
    });
  }

  // Initial location for the map (center point)
  const initialLocation = pickupLocation ? {
    latitude: pickupLocation.latitude,
    longitude: pickupLocation.longitude,
  } : {
    latitude: 9.005401, // Default to Addis Ababa
    longitude: 38.763611,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
        {/* Map Container with fixed height */}
        <View style={[styles.mapContainer, { height: MAP_HEIGHT }]}>
          {pickupLocation && (
            <OpenStreetMap
              style={styles.map}
              markers={mapMarkers}
              initialLocation={initialLocation}
              zoomLevel={13}
              showLabels={true}
              showCurrentLocation={true}
            />
          )}
        </View>
        
        {/* Status Container - Now scrollable */}
        <View style={styles.statusContainer}>
          <View style={styles.statusHeaderContainer}>
            <Text style={styles.trackingId}>Tracking ID: {parcel?.tracking_code}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {parcel?.status?.toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>

          <View style={styles.deliveryInfoContainer}>
            <View style={styles.infoItem}>
              <Ionicons name="location-outline" size={20} color="#1976D2" />
              <Text style={styles.infoText}>
                {pickupLocation && dropoffLocation
                  ? formatDistance(
                      calculateDistance(
                        pickupLocation.latitude,
                        pickupLocation.longitude,
                        dropoffLocation.latitude,
                        dropoffLocation.longitude
                      )
                    )
                  : 'Unknown distance'}
              </Text>
            </View>

            {estimatedArrival && (
              <View style={styles.infoItem}>
                <Ionicons name="time-outline" size={20} color="#1976D2" />
                <Text style={styles.infoText}>{estimatedArrival}</Text>
              </View>
            )}
          </View>

          {/* QR Code Display */}
          {parcel?.tracking_code && <QRCodeDisplay />}

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.shareButton, sharingInProgress && styles.shareButtonDisabled]}
            onPress={handleShare}
            disabled={sharingInProgress || !qrValue}
          >
            {sharingInProgress ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>Share with QR Code</Text>
              </>
            )}
          </TouchableOpacity>

          {courier && (
            <View style={styles.courierContainer}>
              <View style={styles.courierInfo}>
                <Ionicons name="person-outline" size={20} color="#4CAF50" />
                <Text style={styles.courierName}>{courier.full_name}</Text>
              </View>

              <TouchableOpacity
                style={styles.callButton}
                onPress={() => {
                  if (courier && parcel) {
                    router.push({
                      pathname: '/chat/[parcelId]',
                      params: { parcelId: parcel.id }
                    });
                  }
                }}
              >
                <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  mapContainer: {
    width: '100%',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statusContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    marginTop: -20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  trackingId: {
    fontSize: 14,
    color: '#666666',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliveryInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
  },
  courierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  courierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  courierName: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    marginLeft: 8,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 16,
  },
  shareButtonDisabled: {
    backgroundColor: '#9E9E9E',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  qrCodeWrapper: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    marginVertical: 10,
  },
  qrBackground: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webQrContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  qrCodeSubtitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 8,
  },
  qrCodeDeepLink: {
    fontSize: 11,
    color: '#888888',
    textAlign: 'center',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
    color: '#555555',
  },
});

export default MapTrackingScreen;