import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Modal } from 'react-native';
import { Parcel } from '../../types';
import { supabase } from '../../services/supabase';
import { OpenStreetMap } from '../../components/OpenStreetMap';
import * as Location from 'expo-location';

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
  zIndex?: number;
  description?: string;
  icon?: string;
}

export default function Home({ navigation }: any) {
  const [activeDeliveries, setActiveDeliveries] = useState<Parcel[]>([]);
  const [partnerLocations, setPartnerLocations] = useState<PartnerLocation[]>([]);
  const [userLocation, setUserLocation] = useState({
    latitude: 9.0222,  // Addis Ababa coordinates
    longitude: 38.7468,
  });
  const [selectedLocation, setSelectedLocation] = useState<PartnerLocation | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerLocation | null>(null);
  const [showPartnerDetails, setShowPartnerDetails] = useState(false);

  useEffect(() => {
    fetchPartnerLocations();
    fetchActiveDeliveries();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

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
          // Avoid deep cloning to prevent performance issues
          const hours = workingHours;
          
          // Get current day and time - optimized
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
          return 'Hours not available';
        }
      };
      
      // Helper function to capitalize first letter
      const capitalizeFirstLetter = (string: string): string => {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };

      // Match partners with addresses
      const locations = partners
        .map((partner, index) => {
          // Use a better matching strategy:
          // 1. Look for addresses that contain the partner's business name in the address line
          // 2. Look for addresses at the same index as the partner
          // 3. Fall back to the first address
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

  const fetchActiveDeliveries = async () => {
    try {
      const { data: deliveries, error } = await supabase
        .from('parcels_with_addresses')
        .select('*')
        .in('status', ['pending', 'accepted', 'picked_up', 'in_transit']);

      if (error) throw error;
      console.log('Active deliveries with addresses:', deliveries);
      setActiveDeliveries(deliveries || []);
    } catch (error) {
      console.error('Error fetching active deliveries:', error);
    }
  };

  const handleMarkerPress = (marker: Marker) => {
    const partnerLocation = partnerLocations.find(loc => loc.id === marker.id);
    if (partnerLocation) {
      setSelectedPartner(partnerLocation);
      setShowPartnerDetails(true);
    }
  };

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
          onPress: () => navigation.navigate('NewDelivery', { pickupLocation: location }),
        },
        {
          text: 'Use as Dropoff',
          onPress: () => navigation.navigate('NewDelivery', { dropoffLocation: location }),
        },
      ]
    );
  };

  // Transform markers for the map with unique styling per partner
  const transformedMarkers = partnerLocations.map((location, index) => ({
    id: location.id,
    latitude: location.latitude,
    longitude: location.longitude,
    title: location.title,
    color: location.color,
    size: location.size || (30 + (index % 3) * 5), // Use specified size or default with variation
    zIndex: location.isFacility ? 1000 : (index + 1), // Ensure facility is on top
    description: location.description,
    icon: location.isFacility ? 'ios-truck' : location.icon,
    iconColor: location.isFacility ? '#000' : undefined
  }));
  
  console.log('Markers to display:', transformedMarkers);

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'pending': 
        return styles.statusPending;
      case 'picked_up':
      case 'in_transit':
        return styles.statusInTransit;
      case 'delivered':
        return styles.statusDelivered;
      case 'cancelled':
        return styles.statusCancelled;
      default:
        return {};
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Text style={styles.sectionTitle}>Available PickUp/Dropoff Points</Text>
        <OpenStreetMap
          markers={transformedMarkers}
          initialLocation={userLocation}
          onMarkerPress={handleMarkerPress}
          onMapPress={handleMapPress}
          style={styles.map}
          showCurrentLocation={true}
          zoomLevel={13}
        />
      </View>

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
                      <Text style={styles.partnerInfoLabel}>Location:</Text>
                      <Text style={styles.partnerInfoValue}>{selectedPartner.address || 'Location not specified'}</Text>
                    </View>
                    
                    <View style={styles.partnerInfoItem}>
                      <Text style={styles.partnerInfoLabel}>Phone:</Text>
                      <Text style={styles.partnerInfoValue}>{selectedPartner.phoneNumber || 'Not specified'}</Text>
                    </View>
                    
                    <View style={styles.hoursContainer}>
                      <Text style={styles.hoursTitle}>Working Hours:</Text>
                      {(selectedPartner.workingHours || 'Not specified').split('\n').map((dayHours, index) => {
                        // Handle the case where it's not a formatted day/hours string
                        if (!dayHours.includes(': ')) {
                          return (
                            <Text key={index} style={styles.hoursValue}>
                              {dayHours}
                            </Text>
                          );
                        }
                        
                        // Simpler parsing - split only once at the first colon
                        const splitIdx = dayHours.indexOf(': ');
                        const day = dayHours.substring(0, splitIdx);
                        const hours = dayHours.substring(splitIdx + 2);
                        
                        // Simple checks for status
                        const isToday = hours.includes('(Open now)') || hours.includes('(Closed now)');
                        const isClosed = hours === 'Closed';
                        const isOpenNow = hours.includes('(Open now)');
                        
                        // Clean display hours without status tag
                        const displayHours = isToday 
                          ? hours.substring(0, hours.indexOf('(')) 
                          : hours;
                          
                        return (
                          <View key={index} style={styles.dayHoursRow}>
                            <Text style={[
                              styles.dayName,
                              isToday && { fontWeight: 'bold' }
                            ]}>
                              {day}
                            </Text>
                            <Text style={[
                              styles.hoursValue, 
                              isClosed ? styles.closedHours : styles.openHours,
                              isOpenNow && { fontWeight: 'bold' }
                            ]}>
                              {displayHours}
                              {isToday && (
                                <Text style={isOpenNow ? styles.openHours : styles.closedHours}>
                                  {isOpenNow ? ' (Open now)' : ' (Closed now)'}
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
                          <Text style={styles.facilityNoticeText}>
                            This is a sorting facility used for internal operations and cannot be used as a pickup or dropoff point.
                          </Text>
                        </View>
                        <Text style={styles.facilityExplanation}>
                          MBet-Adera uses sorting facilities to efficiently route and process parcels. Please select a regular partner location for your pickup or dropoff needs.
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowPartnerDetails(false)}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                  
                  {!selectedPartner.isFacility && (
                    <>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.pickupButton]}
                        onPress={() => {
                          setShowPartnerDetails(false);
                          navigation.navigate('NewDelivery', { pickupLocation: selectedPartner });
                        }}
                      >
                        <Text style={styles.buttonText}>Use as Pickup</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.dropoffButton]}
                        onPress={() => {
                          setShowPartnerDetails(false);
                          navigation.navigate('NewDelivery', { dropoffLocation: selectedPartner });
                        }}
                      >
                        <Text style={styles.buttonText}>Use as Dropoff</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.deliveriesContainer}>
        <Text style={styles.sectionTitle}>Active Deliveries</Text>
        {activeDeliveries.length === 0 ? (
          <Text style={styles.emptyText}>No active deliveries</Text>
        ) : (
          activeDeliveries.map((delivery) => (
            <TouchableOpacity
              key={delivery.id}
              style={styles.deliveryCard}
              onPress={() => navigation.navigate('DeliveryDetails', { id: delivery.id })}
            >
              <View style={styles.deliveryHeader}>
                <Text style={styles.deliveryId}>#{delivery.tracking_code}</Text>
                <View style={[styles.statusBadge, getStatusStyle(delivery.status)]}>
                  <Text style={styles.statusText}>{delivery.status_display || delivery.status}</Text>
                </View>
              </View>
              
              <View style={styles.deliveryDetails}>
                {delivery.package_size && (
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageSize}>
                      {delivery.package_size.charAt(0).toUpperCase() + delivery.package_size.slice(1)} package
                    </Text>
                    {delivery.is_fragile && (
                      <View style={styles.fragileTag}>
                        <Text style={styles.fragileText}>Fragile</Text>
                      </View>
                    )}
                  </View>
                )}
                
                {delivery.package_description && (
                  <Text style={styles.packageDescription} numberOfLines={1} ellipsizeMode="tail">
                    {delivery.package_description}
                  </Text>
                )}
                
                {delivery.estimated_price && (
                  <Text style={styles.priceText}>
                    {delivery.formatted_price || `ETB ${delivery.estimated_price}`}
                    {delivery.formatted_distance && ` • ${delivery.formatted_distance}`}
                  </Text>
                )}
              </View>
              
              <View style={styles.addressContainer}>
                <View style={styles.addressItem}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>From:</Text>
                    {delivery.pickup_business_name && (
                      <View style={[styles.partnerTag, {backgroundColor: delivery.pickup_partner_color || '#4CAF50'}]}>
                        <Text style={styles.partnerText}>{delivery.pickup_business_name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>{delivery.pickup_address || 'N/A'}</Text>
                  {delivery.pickup_working_hours && (
                    <Text style={styles.workingHours}>Hours: {delivery.pickup_working_hours}</Text>
                  )}
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.addressItem}>
                  <View style={styles.addressHeader}>
                    <Text style={styles.addressLabel}>To:</Text>
                    {delivery.dropoff_business_name && (
                      <View style={[styles.partnerTag, {backgroundColor: delivery.dropoff_partner_color || '#2196F3'}]}>
                        <Text style={styles.partnerText}>{delivery.dropoff_business_name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addressText}>{delivery.dropoff_address || 'N/A'}</Text>
                  {delivery.dropoff_working_hours && (
                    <Text style={styles.workingHours}>Hours: {delivery.dropoff_working_hours}</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.newDeliveryButton}
        onPress={() => navigation.navigate('NewDelivery')}
      >
        <Text style={styles.buttonText}>New Delivery</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    height: '50%',
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  map: {
    flex: 1,
  },
  deliveriesContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
    position: 'absolute',
    top: 10,
    left: 10,
    borderRadius: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  deliveryCard: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  deliveryId: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deliveryStatus: {
    color: '#4CAF50',
    marginTop: 5,
    marginBottom: 10,
  },
  addressContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop:.8,
  },
  addressItem: {
    marginVertical: 6,
  },
  addressLabel: {
    fontWeight: 'bold',
    marginRight: 5,
    color: '#555',
  },
  addressText: {
    flex: 1,
    color: '#333',
  },
  newDeliveryButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    margin: 20,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
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
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  statusPending: {
    backgroundColor: '#FF9800',
  },
  statusInTransit: {
    backgroundColor: '#2196F3',
  },
  statusDelivered: {
    backgroundColor: '#4CAF50',
  },
  statusCancelled: {
    backgroundColor: '#F44336',
  },
  deliveryDetails: {
    marginBottom: 10,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  packageSize: {
    fontSize: 14,
    color: '#555',
  },
  fragileTag: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  fragileText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceText: {
    fontSize: 14,
    color: '#555',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  partnerTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  partnerText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  workingHours: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  packageDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  partnerInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  partnerInfoLabel: {
    fontWeight: 'bold',
    marginRight: 5,
    color: '#555',
  },
  partnerInfoValue: {
    flex: 1,
    color: '#333',
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  partnerInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  partnerDetailsScrollView: {
    flex: 1,
  },
  partnerDetailsContainer: {
    padding: 20,
  },
  hoursContainer: {
    marginTop: 20,
  },
  hoursTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dayHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  dayName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  hoursValue: {
    fontSize: 14,
    color: '#555',
  },
  closedHours: {
    color: '#FF9800',
  },
  openHours: {
    color: '#4CAF50',
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionText: {
    color: '#666',
  },
  facilityBadge: {
    backgroundColor: 'rgba(255, 160, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  facilityBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFA000',
  },
  facilityNoticeText: {
    color: '#666',
  },
  facilityExplanation: {
    padding: 12,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  todayText: {
    fontWeight: 'bold',
    color: '#333',
  },
  openNowText: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  singleLineHours: {
    fontSize: 14,
    marginBottom: 4,
  },
});
