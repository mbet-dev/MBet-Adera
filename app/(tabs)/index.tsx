import React, { useEffect, useState, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Platform, 
  Alert, 
  Modal, 
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  FlatList,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  useWindowDimensions
} from 'react-native';
import { OpenStreetMap } from '../../src/components/OpenStreetMap';
import { router } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import { parcelService } from '@/services/parcelService';
import { Parcel } from '@/types/parcel';
import { ParcelCard } from '../../src/components/ParcelCard';
import { WebLayout } from '../../src/components/layout/WebLayout';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ParcelStatsDashboard, useParcelStats } from '../../src/components/ParcelStatsDashboard';

// Get screen dimensions for responsive layouts
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Define constants at the top of the file - after imports
const CARD_WIDTH = 300; // Fixed width for cards

interface PartnerLocation {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  businessName: string;
  workingHours?: string;
  phoneNumber?: string;
  address: string;
  description?: string;
  isFacility: boolean;
  icon?: string;
  size?: number;
}

interface Marker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  color: string;
  size?: number;
  icon?: string;
  zIndex?: number;
  description?: string;
}

interface Partner {
  id: string;
  business_name: string;
  address: {
    latitude: number;
    longitude: number;
    address_line: string;
  } | null;
}

// Default map configuration
const DEFAULT_MAP_CONFIG = {
  zoomLevel: 13, // Higher number = more zoomed in
  centerLatitude: 9.0222, // Addis Ababa coordinates
  centerLongitude: 38.7468,
};

export default function Home() {
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeDeliveries, setActiveDeliveries] = useState<Parcel[]>([]);
  const [partnerLocations, setPartnerLocations] = useState<PartnerLocation[]>([]);
  const [activeDeliveryIndex, setActiveDeliveryIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const [userLocation, setUserLocation] = useState({
    latitude: DEFAULT_MAP_CONFIG.centerLatitude,
    longitude: DEFAULT_MAP_CONFIG.centerLongitude,
  });
  const [mapConfig, setMapConfig] = useState({
    zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel,
    center: {
      latitude: DEFAULT_MAP_CONFIG.centerLatitude,
      longitude: DEFAULT_MAP_CONFIG.centerLongitude,
    }
  });
  const [selectedPartner, setSelectedPartner] = useState<PartnerLocation | null>(null);
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  
  // Use our custom hook for parcel stats
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useParcelStats();

  // DEBUG: Log user ID and active deliveries state
  React.useEffect(() => {
    console.log('==== HOME COMPONENT STATE ====');
    console.log('Current user ID:', user?.id);
    console.log('Active deliveries state:', activeDeliveries);
  }, [user, activeDeliveries]);

  useEffect(() => {
    if (user) {
      console.log('[useEffect] User loaded, fetching data...');
      fetchPartnerLocations();
      fetchActiveDeliveries();
      requestLocationPermission();
    }
  }, [user]);

  // Request location permissions and update map
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        
        const newLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        
        setUserLocation(newLocation);
        
        // Update map center to user's location with slightly increased zoom level
        setMapConfig({
          zoomLevel: DEFAULT_MAP_CONFIG.zoomLevel + 1,
          center: newLocation
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Fetch partner locations from database
  const fetchPartnerLocations = async () => {
    try {
      // Get all partners first with more details, including is_facility field
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select(`
          id,
          business_name,
          color,
          working_hours,
          phone_number,
          is_facility
        `);

      if (partnersError) throw partnersError;
      
      if (!partners || partners.length === 0) {
        console.warn('No partners found in the database');
        return;
      }
      
      // Get all addresses explicitly - we need all fields to ensure we have complete data
      const { data: addresses, error: addressesError } = await supabase
        .from('addresses')
        .select('*');

      if (addressesError) throw addressesError;
      
      console.log('Fetched partners data:', partners);
      console.log('Fetched addresses data:', addresses);

      // Define a set of distinct colors for partners
      const partnerColors = [
        '#4CAF50', // Green
        '#2196F3', // Blue
        '#FF9800', // Orange
        '#9C27B0', // Purple
        '#F44336', // Red
        '#009688', // Teal
        '#673AB7', // Deep Purple
        '#3F51B5', // Indigo
        '#E91E63', // Pink
        '#FFEB3B'  // Yellow
      ];

      // Format working hours helper function
      const formatWorkingHours = (workingHours: any): string => {
        if (!workingHours) return 'Not specified';
        
        if (typeof workingHours === 'string') return workingHours;
        
        try {
          // Simple stringification to avoid deep processing that might cause timeouts
          const hours = workingHours; // Avoid unnecessary JSON parse/stringify
          
          // Get current day and time - simplified approach
          const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const today = new Date();
          const currentDay = days[today.getDay()];
          const currentHour = today.getHours();
          const currentMinute = today.getMinutes();
          
          // Days of the week in order
          const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          
          // Format each day with minimal processing
          const formattedDays = daysOfWeek.map(day => {
            const dayData = hours[day];
            if (!dayData) return `${capitalizeFirstLetter(day)}: Closed`;
            
            const open = dayData.open;
            const close = dayData.close;
            
            if (!open || !close) return `${capitalizeFirstLetter(day)}: Closed`;
            
            // Only add status tag for today to reduce calculations
            let statusTag = '';
            if (day === currentDay) {
              // Simple time check
              const [openHour, openMinute] = open.split(':').map(Number);
              const [closeHour, closeMinute] = close.split(':').map(Number);
              
              const isOpen = 
                (currentHour > openHour || (currentHour === openHour && currentMinute >= openMinute)) && 
                (currentHour < closeHour || (currentHour === closeHour && currentMinute <= closeMinute));
                
              statusTag = isOpen ? ' (Open now)' : ' (Closed now)';
            }
            
            return `${capitalizeFirstLetter(day)}: ${open} - ${close}${statusTag}`;
          });
          
          return formattedDays.join('\n');
        } catch (e) {
          console.error('Error formatting working hours:', e);
          return 'Working hours not available';
        }
      };
      
      // Helper function to capitalize first letter
      const capitalizeFirstLetter = (string: string): string => {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };

      // Match partners with addresses
      const locations = partners
        .map((partner, index) => {
          // Use a better matching strategy
          let partnerAddress = null;
          
          // Try to match by business name in address line
          if (addresses && addresses.length > 0) {
            const matchByName = addresses.find(addr => 
              addr.address_line && 
              partner.business_name && 
              addr.address_line.toLowerCase().includes(partner.business_name.toLowerCase())
            );
            
            if (matchByName) {
              partnerAddress = matchByName;
            } else if (addresses.length > index) {
              // Fall back to matching by index
              partnerAddress = addresses[index];
            } else {
              // Last resort: just use the first address
              partnerAddress = addresses[0];
            }
          }
          
          if (!partnerAddress || partnerAddress.latitude === null || partnerAddress.longitude === null) {
            console.warn(`No valid address data for partner ${partner.id}`);
            return null;
          }
          
          // Use partner's color if available, otherwise pick from our array based on index
          const colorToUse = partner.color || partnerColors[index % partnerColors.length];
          
          // Format working hours with our helper function
          const formattedHours = formatWorkingHours(partner.working_hours);
          
          // Special icon and size for sorting facility
          let icon = undefined;
          let size = undefined;
          
          // Determine if this is a sorting facility
          const isFacility = partner.is_facility === true;
          if (isFacility) {
            icon = 'local-shipping';
            size = 40; // Larger marker for the facility
          }
          
          return {
            id: partner.id,
            latitude: partnerAddress.latitude,
            longitude: partnerAddress.longitude,
            title: partner.business_name?.substring(0, 2) || 'MP',
            color: colorToUse,
            businessName: partner.business_name || 'MBet Partner',
            workingHours: formattedHours,
            phoneNumber: partner.phone_number || 'Not available',
            address: partnerAddress.address_line || 'Address not available',
            description: `${partner.business_name || 'MBet Partner'} - ${partnerAddress.address_line || 'Address not available'}`,
            isFacility: isFacility,
            icon: icon,
            size: size
          };
        })
        .filter(Boolean) as PartnerLocation[];

      console.log('Transformed partner locations:', locations);
      setPartnerLocations(locations);
    } catch (error) {
      console.error('Error fetching partner locations:', error);
    }
  };

  // Fetch active deliveries for current user
  const fetchActiveDeliveries = async () => {
    if (!user) {
      console.log('[fetchActiveDeliveries] No user found');
      return;
    }
    
    console.log('[fetchActiveDeliveries] Fetching for user:', user.id);
    
    try {
      setLoading(true);
      const deliveries = await parcelService.getActiveDeliveries(user.id);
      console.log('[fetchActiveDeliveries] Active deliveries received:', deliveries);
      console.log('[fetchActiveDeliveries] Deliveries count:', deliveries.length);
      setActiveDeliveries(deliveries);
    } catch (error) {
      console.error('[fetchActiveDeliveries] Error fetching active deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle marker press on map
  const handleMarkerPress = (marker: Marker) => {
    const partnerLocation = partnerLocations.find(loc => loc.id === marker.id);
    if (partnerLocation) {
      setSelectedPartner(partnerLocation);
      setShowPartnerDetails(true);
    }
  };

  // Handle map press to set location
  const handleMapPress = (location: { latitude: number; longitude: number }) => {
    Alert.alert(
      'Location Selected',
      'Would you like to use this location?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Use as Pickup',
          onPress: () => router.push('/new-delivery' as any),
        },
        {
          text: 'Use as Dropoff',
          onPress: () => router.push('/new-delivery' as any),
        },
      ]
    );
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchActiveDeliveries(),
        refetchStats(),
        fetchPartnerLocations()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, refetchStats]);

  // Transform data for map markers with custom styling
  const transformedMarkers = [
    // User location marker (only show if we have actual user location)
    ...(locationPermissionGranted ? [{
      id: 'user',
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      title: 'You',
      color: '#f44336', // Red color for user
      size: 40, // Larger marker for user
      icon: 'person-pin' // Custom icon
    }] : []),
    
    // Partner location markers with varying styles
    ...partnerLocations.map((location, index) => {
      // Special handling for sorting facility
      if (location.isFacility) {
        return {
          id: location.id,
          latitude: location.latitude,
          longitude: location.longitude,
          title: 'MB-SF', // Short code for map marker
          color: '#000000', // Black color specifically for sorting facility
          size: 40, // Larger size for visibility
          icon: 'local-shipping',
          zIndex: 1000, // Ensure facility is on top
          description: 'MBet-Adera Sorting Facility Hub - ' + location.address // Specific description to identify
        };
      }
      
      // Regular partner locations
      return {
        id: location.id,
        latitude: location.latitude,
        longitude: location.longitude,
        title: location.title,
        color: location.color, 
        size: location.size || (30 + (index % 3) * 5), // Use specified size or default with variation
        icon: location.icon || 'store', // Custom icon for partners
        zIndex: index + 1,
        description: location.description // Add description to marker
      };
    })
  ];
  
  console.log('Map markers to render:', transformedMarkers);

  // Render statistics card
  const renderStatsCard = () => (
    <ParcelStatsDashboard stats={stats} isLoading={statsLoading} />
  );

  // Render quick action buttons
  const renderQuickActions = () => (
    <View style={styles.quickActionsSection}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/create-order')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
            <MaterialIcons name="local-shipping" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>Send Parcel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/orders')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#2196F3' }]}>
            <MaterialIcons name="inventory" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>My Parcels</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/profile/wallet')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FFC107' }]}>
            <Ionicons name="wallet" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/tracking')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#9C27B0' }]}>
            <MaterialIcons name="map" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>Tracking Map</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/notifications')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#E91E63' }]}>
            <Ionicons name="notifications" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/scan')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#009688' }]}>
            <MaterialIcons name="qr-code-scanner" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>Scan QR</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/support')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FF5722' }]}>
            <MaterialIcons name="support-agent" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>Support</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/(tabs)/favorites')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#673AB7' }]}>
            <MaterialIcons name="favorite" size={24} color="#FFF" />
          </View>
          <Text style={styles.actionText}>Favorites</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render empty state for active deliveries
  const renderEmptyDeliveries = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="inventory" size={48} color="#CCCCCC" />
      <Text style={styles.emptyText}>No active deliveries</Text>
      <Text style={styles.emptySubtext}>
        This is a demo with sample data. In a real implementation, this would show your active parcels.
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => router.push('/(tabs)/create-order')}
      >
        <Text style={styles.emptyButtonText}>Send a Parcel</Text>
      </TouchableOpacity>
    </View>
  );

  // Render active deliveries section
  const renderActiveDeliveries = () => {
    console.log('Rendering active deliveries. Count:', activeDeliveries.length);
    
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      );
    }

    if (activeDeliveries.length === 0) {
      return renderEmptyDeliveries();
    }

    // Manual card navigation - simpler approach
    const handlePrevious = () => {
      if (activeDeliveryIndex > 0) {
        setActiveDeliveryIndex(activeDeliveryIndex - 1);
      }
    };

    const handleNext = () => {
      if (activeDeliveryIndex < activeDeliveries.length - 1) {
        setActiveDeliveryIndex(activeDeliveryIndex + 1);
      }
    };
    
    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollX = event.nativeEvent.contentOffset.x;
      const index = Math.round(scrollX / CARD_WIDTH);
      if (index !== activeDeliveryIndex) {
        setActiveDeliveryIndex(index);
      }
    };

    return (
      <View>
        <View style={styles.deliveriesHeader}>
          <Text style={styles.deliveriesCount}>
            {activeDeliveries.length} Active {activeDeliveries.length === 1 ? 'Delivery' : 'Deliveries'}
            {activeDeliveries.length > 1 ? ` (${activeDeliveryIndex + 1}/${activeDeliveries.length})` : ''}
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={fetchActiveDeliveries}
          >
            <MaterialIcons name="refresh" size={18} color="#4CAF50" />
          </TouchableOpacity>
        </View>
        
        {/* Horizontal scrolling carousel for active deliveries */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalCarouselContent}
          snapToInterval={CARD_WIDTH} // Snap to card width
          decelerationRate="fast"
          style={styles.horizontalCarousel}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {activeDeliveries.map((parcel, index) => (
            <View 
              key={parcel.id} 
              style={[
                styles.carouselCardContainer,
                index === activeDeliveryIndex && styles.carouselCardActive
              ]}
            >
              <ParcelCard 
                parcel={parcel} 
                onPress={() => router.push(`/(tabs)/orders/${parcel.id}`)}
              />
            </View>
          ))}
        </ScrollView>
        
        {activeDeliveries.length > 1 && (
          <View style={styles.paginationContainer}>
            {activeDeliveries.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  index === activeDeliveryIndex && styles.paginationDotActive
                ]}
                onPress={() => setActiveDeliveryIndex(index)}
              />
            ))}
          </View>
        )}
        
        {activeDeliveries.length > 0 && (
        <TouchableOpacity 
          style={styles.seeAllButton}
          onPress={() => router.push('/(tabs)/orders')}
        >
            <Text style={styles.seeAllText}>See All Parcels</Text>
          <MaterialIcons name="chevron-right" size={20} color="#4CAF50" />
        </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <WebLayout contentContainerStyle={styles.webContainer}>
      <FlatList
        data={[{ key: 'content' }]}
        renderItem={() => (
          <View style={styles.content}>
            {/* Welcome Header */}
            <View style={styles.welcomeHeader}>
              <Text style={styles.welcomeText}>
                Welcome
                {user?.user_metadata?.name ? <Text>, {user.user_metadata.name}</Text> : null}!
              </Text>
              <Text style={styles.welcomeSubtext}>Track your deliveries and explore services</Text>
            </View>
            
            {/* Statistics Overview */}
            {renderStatsCard()}
            
            {/* Quick Actions */}
            {renderQuickActions()}
            
            {/* Partner Map */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Available PickUp/Dropoff Points</Text>
            </View>
            <View style={styles.mapContainer}>
              <OpenStreetMap
                markers={transformedMarkers}
                initialLocation={{
                  latitude: mapConfig.center.latitude,
                  longitude: mapConfig.center.longitude
                }}
                zoomLevel={mapConfig.zoomLevel}
                onMarkerPress={handleMarkerPress}
                onMapPress={handleMapPress}
                style={styles.map}
                showLabels={true}
                showCurrentLocation={true}
              />
            </View>
            
            {/* Active Deliveries */}
            <View style={styles.activeDeliveriesHeader}>
              <MaterialIcons name="local-shipping" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Active Deliveries</Text>
            </View>
            
            <View style={styles.deliveriesContainer}>
              {renderActiveDeliveries()}
            </View>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        contentContainerStyle={styles.flatListContent}
      />

      <Modal
        visible={showPartnerDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPartnerDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedPartner && (
              <>
                <View style={[styles.partnerHeader, { 
                  backgroundColor: selectedPartner.color,
                  borderBottomWidth: selectedPartner.isFacility ? 2 : 0,
                  borderBottomColor: '#FFA000'
                }]}>
                  <Text style={styles.modalTitle}>{selectedPartner.businessName}</Text>
                  {selectedPartner.isFacility && (
                    <View style={styles.facilityBadge}>
                      <MaterialIcons name="local-shipping" size={16} color="#fff" />
                      <Text style={styles.facilityBadgeText}>Sorting Facility</Text>
                    </View>
                  )}
                  <Text style={styles.partnerInitials}>{selectedPartner.title}</Text>
                </View>
                
                <ScrollView style={styles.partnerDetailsScrollView}>
                  <View style={styles.partnerDetailsContainer}>
                    {selectedPartner.description && (
                      <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>{selectedPartner.description}</Text>
                      </View>
                    )}
                  
                    <View style={styles.partnerInfoItem}>
                      <MaterialIcons name="location-on" size={20} color={selectedPartner.color} />
                      <Text style={styles.partnerInfoLabel}>Address:</Text>
                      <Text style={styles.partnerInfoValue}>{selectedPartner.address || 'Address not specified'}</Text>
                    </View>
                    
                    <View style={styles.partnerInfoItem}>
                      <MaterialIcons name="phone" size={20} color={selectedPartner.color} />
                      <Text style={styles.partnerInfoLabel}>Phone:</Text>
                      <Text style={styles.partnerInfoValue}>{selectedPartner.phoneNumber}</Text>
                    </View>
                    
                    <View style={styles.hoursContainer}>
                      <Text style={styles.hoursTitle}>Working Hours:</Text>
                      {(selectedPartner.workingHours || 'Not specified').split('\n').map((dayHours, index) => {
                        // Handle the case where it's just a simple string
                        if (!dayHours.includes(': ')) {
                          return (
                            <Text key={index} style={styles.singleLineHours}>
                              {dayHours}
                            </Text>
                          );
                        }
                        
                        // Simpler parsing - split only once at the first colon
                        const splitIdx = dayHours.indexOf(': ');
                        const day = dayHours.substring(0, splitIdx);
                        const hours = dayHours.substring(splitIdx + 2);
                        
                        // Simple checks instead of string contains which can be expensive
                        const isToday = hours.endsWith('(Open now)') || hours.endsWith('(Closed now)');
                        const isOpen = hours.endsWith('(Open now)');
                        const isClosed = hours.startsWith('Closed');
                        
                        // Extract just the hours without the status tag for display
                        const displayHours = isToday ? 
                          hours.substring(0, hours.lastIndexOf('(')) : 
                          hours;
                        
                        return (
                          <View key={index} style={styles.dayHoursRow}>
                            <Text style={[
                              styles.dayName,
                              isToday && styles.todayText
                            ]}>
                              {day}
                            </Text>
                            <Text style={[
                              styles.hoursValue, 
                              isClosed ? styles.closedHours : styles.openHours,
                              isOpen && styles.openNowText
                            ]}>
                              {displayHours}
                              {isToday && (
                                <Text style={isOpen ? styles.openNowText : styles.closedHours}>
                                  {isOpen ? ' (Open now)' : ' (Closed now)'}
                                </Text>
                              )}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                    
                    {selectedPartner.isFacility && (
                      <View style={styles.facilityNoticeContainer}>
                        <View style={styles.facilityNotice}>
                          <MaterialIcons name="info" size={22} color="#FFA000" style={styles.facilityIcon} />
                          <Text style={styles.facilityNoticeText}>
                            This is a sorting facility used for internal operations and cannot be used as a pickup or dropoff point.
                          </Text>
                        </View>
                        <Text style={styles.facilityExplanation}>
                          MBet-Adera uses sorting facilities to efficiently route and process parcels. 
                          Please select a regular partner location for your pickup or dropoff needs.
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
                
                <View style={styles.partnerActions}>
                  {!selectedPartner.isFacility && (
                    <Text style={styles.actionTitle}>What would you like to do?</Text>
                  )}
                  
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowPartnerDetails(false)}
                    >
                      <MaterialIcons name="close" size={18} color="#fff" />
                      <Text style={styles.buttonText}>Close</Text>
                    </TouchableOpacity>
                    
                    {!selectedPartner.isFacility ? (
                      <>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.pickupButton]}
                          onPress={() => {
                            setShowPartnerDetails(false);
                            router.push({
                              pathname: '/new-delivery',
                              params: { pickupId: selectedPartner.id }
                            } as any);
                          }}
                        >
                          <MaterialIcons name="flight-takeoff" size={18} color="#fff" />
                          <Text style={styles.buttonText}>Pickup</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.modalButton, styles.dropoffButton]}
                          onPress={() => {
                            setShowPartnerDetails(false);
                            router.push({
                              pathname: '/new-delivery',
                              params: { dropoffId: selectedPartner.id }
                            } as any);
                          }}
                        >
                          <MaterialIcons name="flight-land" size={18} color="#fff" />
                          <Text style={styles.buttonText}>Dropoff</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[styles.modalButton, styles.viewPartnersButton]}
                        onPress={() => {
                          setShowPartnerDetails(false);
                          // Optionally zoom out on the map to show other partners
                        }}
                      >
                        <MaterialIcons name="store" size={18} color="#fff" />
                        <Text style={styles.buttonText}>View Partner Locations</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    maxWidth: Platform.OS === 'web' ? 1200 : undefined,
    padding: 16,
  },
  flatListContent: {
    flexGrow: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 80, // Extra padding at bottom for content
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  welcomeHeader: {
    marginVertical: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statCard: {
    alignItems: 'center',
    width: '30%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    width: '22%', // 4 items per row
    alignItems: 'center',
    padding: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionText: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginRight: 4,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  map: {
    flex: 1,
  },
  deliveriesContainer: {
    marginBottom: 16,
    minHeight: 100,
    backgroundColor: '#FCFCFC',
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loadingContainer: {
    minHeight: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    marginVertical: 5,
    minWidth: '30%',
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  pickupButton: {
    backgroundColor: '#4CAF50',
  },
  dropoffButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  partnerHeader: {
    padding: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginBottom: 10,
  },
  partnerInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  partnerDetailsContainer: {
    marginBottom: 20,
  },
  partnerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  partnerInfoLabel: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  partnerInfoValue: {
    flex: 1,
  },
  partnerActions: {
    marginTop: 20,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  partnerDetailsScrollView: {
    maxHeight: 200,
  },
  hoursContainer: {
    marginTop: 10,
  },
  hoursTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  singleLineHours: {
    fontSize: 14,
  },
  dayHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 5,
  },
  hoursValue: {
    fontSize: 14,
  },
  closedHours: {
    color: '#f44336',
  },
  openHours: {
    color: '#4CAF50',
  },
  descriptionContainer: {
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
  },
  facilityNoticeContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFA000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  facilityNotice: {
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFA000',
  },
  facilityExplanation: {
    padding: 12,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  facilityIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  facilityNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  todayText: {
    fontWeight: 'bold',
    color: '#333',
  },
  openNowText: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  viewPartnersButton: {
    backgroundColor: '#FFA000',
    flex: 1,
  },
  facilityBadge: {
    backgroundColor: 'rgba(255, 160, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  facilityBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  activeDeliveriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  deliveriesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  horizontalCarouselContent: {
    padding: 16,
  },
  horizontalCarousel: {
    marginVertical: 12,
  },
  carouselCardContainer: {
    width: CARD_WIDTH,
    borderRadius: 8,
    overflow: 'hidden',
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  carouselCardActive: {
    borderColor: '#4CAF50',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 4,
    padding: 5,
  },
  paginationDotActive: {
    backgroundColor: '#4CAF50',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginTop: 12,
  },
});
