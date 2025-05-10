import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Linking
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/services/supabase';

// Conditionally import MapView and Marker for native platforms
let MapView: any, Marker: any;
if (Platform.OS !== 'web') {
  try {
    // Using require to avoid bundling issues with webpack
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default;
    Marker = RNMaps.Marker;
  } catch (error) {
    console.error('Error importing react-native-maps:', error);
  }
}

// Define the Partner Location interface
interface PartnerLocation {
  id: string;
  name?: string;
  businessName?: string;
  address?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  workingHours?: string;
  isFacility?: boolean;
  phoneNumber?: string;
  color?: string;
  [key: string]: any;
}

interface PartnerLocationComponentProps {
  label: string;
  onSelect: (partner: PartnerLocation | null) => void;
  selectedPartner: PartnerLocation | null;
  type?: 'pickup' | 'dropoff';
  defaultViewMode?: 'dropdown' | 'map';
}

const { width } = Dimensions.get('window');

export const PartnerLocationComponent: React.FC<PartnerLocationComponentProps> = ({
  label,
  onSelect,
  selectedPartner,
  type = 'pickup',
  defaultViewMode = 'dropdown'
}) => {
  const [partners, setPartners] = useState<PartnerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'dropdown' | 'map'>(defaultViewMode);
  const [filteredPartners, setFilteredPartners] = useState<PartnerLocation[]>([]);

  // Initial region for map (Addis Ababa center)
  const [mapRegion, setMapRegion] = useState({
    latitude: 9.0222,
    longitude: 38.7468,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  // Fetch partner locations on mount
  useEffect(() => {
    const fetchPartnerLocations = async () => {
      try {
        setLoading(true);
        
        console.log('❗DEBUGGING PARTNER LOCATIONS - Fetch Start❗');
        
        // Fetch partners from Supabase WITHOUT any limit
        const { data: partners, error: partnersError } = await supabase
          .from('partners')
          .select('id, business_name, location, working_hours, is_facility, phone_number, color')
          .order('business_name');
          
        if (partnersError) {
          console.error('Error fetching partners:', partnersError);
          throw partnersError;
        }

        console.log('❗Partners fetched from DB:', partners?.length || 0);
        console.log('❗Partner IDs:', partners?.map(p => p.id) || []);
        
        // If we didn't get any partners, let's check if there's any data in the table
        if (!partners || partners.length === 0) {
          const { count, error: countError } = await supabase
            .from('partners')
            .select('*', { count: 'exact', head: true });
            
          console.log('Total partners count:', count);
          if (countError) console.error('Error counting partners:', countError);
        }
        
        // Let's also get all addresses to ensure we have complete location data
        const { data: addresses, error: addressesError } = await supabase
          .from('addresses')
          .select('*');
          
        if (addressesError) {
          console.error('Error fetching addresses:', addressesError);
          throw addressesError;
        }
        
        console.log('❗Addresses fetched from DB:', addresses?.length || 0);

        if (partners && partners.length > 0) {
          // Transform the data to match our PartnerLocation interface
          const transformedPartners: PartnerLocation[] = partners.map(partner => {
            // Parse the JSON location field if it's a string
            let locationData = partner.location;
            if (typeof locationData === 'string') {
              try {
                locationData = JSON.parse(locationData);
              } catch (e) {
                console.error('Error parsing location data:', e);
              }
            }

            // If location data is missing, try to find matching address
            if (!locationData || !locationData.latitude || !locationData.longitude) {
              if (addresses && addresses.length > 0) {
                // First try to match by business name in address
                const matchingAddress = addresses.find(addr => 
                  addr.address_line && 
                  partner.business_name && 
                  addr.address_line.toLowerCase().includes(partner.business_name.toLowerCase())
                );
                
                if (matchingAddress) {
                  locationData = {
                    latitude: matchingAddress.latitude,
                    longitude: matchingAddress.longitude,
                    address: matchingAddress.address_line
                  };
                }
              }
            }

            // Parse the JSON working_hours field if it's a string
            let workingHoursData = partner.working_hours;
            if (typeof workingHoursData === 'string') {
              try {
                const parsedData = JSON.parse(workingHoursData);
                // Type the working hours object properly
                const workingHoursObj = parsedData as {
                  monday?: { open?: string; close?: string };
                  tuesday?: { open?: string; close?: string };
                  wednesday?: { open?: string; close?: string };
                  thursday?: { open?: string; close?: string };
                  friday?: { open?: string; close?: string };
                  saturday?: { open?: string; close?: string };
                  sunday?: { open?: string; close?: string };
                };
                
                // Convert working hours to a readable format
                const monday = workingHoursObj.monday;
                const formattedHours = monday && monday.open && monday.close 
                  ? `${monday.open} - ${monday.close}` 
                  : 'Hours not available';
                workingHoursData = formattedHours;
              } catch (e) {
                console.error('Error parsing working hours:', e);
                workingHoursData = 'Hours not available';
              }
            } else if (typeof workingHoursData === 'object') {
              // Handle case when working_hours is already an object (not a string)
              try {
                // Type the working hours object properly
                const workingHoursObj = workingHoursData as {
                  monday?: { open?: string; close?: string };
                  tuesday?: { open?: string; close?: string };
                  wednesday?: { open?: string; close?: string };
                  thursday?: { open?: string; close?: string };
                  friday?: { open?: string; close?: string };
                  saturday?: { open?: string; close?: string };
                  sunday?: { open?: string; close?: string };
                };
                
                const monday = workingHoursObj.monday;
                const formattedHours = monday && monday.open && monday.close 
                  ? `${monday.open} - ${monday.close}` 
                  : 'Hours not available';
                workingHoursData = formattedHours;
              } catch (e) {
                console.error('Error formatting working hours:', e);
                workingHoursData = 'Hours not available';
              }
            } else {
              // Set default if no valid data
              workingHoursData = 'Hours not available';
            }

            return {
              id: partner.id,
              businessName: partner.business_name,
              name: partner.business_name,
              address: locationData?.address || 'No address available',
              coordinates: locationData ? {
                latitude: parseFloat(locationData.latitude) || 0,
                longitude: parseFloat(locationData.longitude) || 0
              } : undefined,
              workingHours: workingHoursData,
              isFacility: partner.is_facility,
              phoneNumber: partner.phone_number,
              color: partner.color
            };
          });
          
          console.log('❗All transformed partners:', transformedPartners.length);
          
          // Only filter out sorting facilities, NOT limiting number
          const availablePartners = transformedPartners.filter(partner => 
            !partner.isFacility && partner.coordinates && 
            partner.coordinates.latitude !== 0 && partner.coordinates.longitude !== 0
          );
          
          console.log('❗CRITICAL: Available partners after filtering:', availablePartners.length);
          console.log('❗Partner business names:', availablePartners.map(p => p.businessName));
          
          // CRITICAL: Set both state variables to the FULL list of available partners
          setPartners(availablePartners);
          setFilteredPartners(availablePartners);
          
          console.log('❗Set partners and filteredPartners state with', availablePartners.length, 'items');
        } else {
          console.error('❗No partners data returned from database');
        }
      } catch (error) {
        console.error('❗Error loading partner locations:', error);
        setPartners([]);
        setFilteredPartners([]);
      } finally {
        setLoading(false);
        console.log('❗Partner location loading completed');
      }
    };
    
    fetchPartnerLocations();
  }, []);

  // Filter partners when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPartners(partners);
      console.log('❗SEARCH: Showing all', partners.length, 'partners (empty search)');
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = partners.filter(partner => 
        partner.name?.toLowerCase().includes(query) || 
        partner.businessName?.toLowerCase().includes(query) ||
        partner.address?.toLowerCase().includes(query)
      );
      setFilteredPartners(filtered);
      console.log('❗SEARCH: Filtered to', filtered.length, 'partners based on query:', searchQuery);
    }
  }, [searchQuery, partners]);

  const handleSelectPartner = (partner: PartnerLocation) => {
    console.log('❗Selected partner:', partner.businessName);
    onSelect(partner);
    setModalVisible(false);
    if (partner.coordinates) {
      setMapRegion({
        ...mapRegion,
        latitude: partner.coordinates.latitude,
        longitude: partner.coordinates.longitude,
      });
    }
  };

  const getLocationIcon = () => {
    if (type === 'pickup') {
      return <MaterialIcons name="flight-takeoff" size={24} color="#4CAF50" />;
    }
    return <MaterialIcons name="flight-land" size={24} color="#4CAF50" />;
  };

  const getTypeColor = () => {
    return type === 'pickup' ? '#4CAF50' : '#2196F3';
  };

  const openExternalMap = (latitude: number, longitude: number) => {
    const label = selectedPartner?.businessName || 'Selected Location';
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    });

    Linking.canOpenURL(url!)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url!);
        }
      })
      .catch(error => console.error('Error opening map:', error));
  };

  // Render web map using OpenStreetMap
  const renderWebMap = (locations: PartnerLocation[], selectedLocation?: PartnerLocation) => {
    if (locations.length === 0) {
      return (
        <View style={styles.webMapPlaceholder}>
          <MaterialIcons name="location-off" size={30} color="#999" />
          <Text style={styles.webMapText}>No locations available</Text>
        </View>
      );
    }

    // Center on selected location or first location
    const center = selectedLocation || locations[0];
    
    if (!center.coordinates) {
      return (
        <View style={styles.webMapPlaceholder}>
          <MaterialIcons name="error-outline" size={30} color="#F44336" />
          <Text style={styles.webMapText}>Location coordinates not available</Text>
        </View>
      );
    }
    
    // Using OpenStreetMap static image API for a simple map representation
    let mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${center.coordinates.latitude},${center.coordinates.longitude}&zoom=14&size=600x300&scale=2&maptype=roadmap`;
    
    // Add markers for each location
    locations.forEach(loc => {
      if (loc.coordinates) {
        const isSelected = selectedLocation?.id === loc.id;
        const markerColor = isSelected ? 'red' : 'blue';
        mapUrl += `&markers=color:${markerColor}|${loc.coordinates.latitude},${loc.coordinates.longitude}`;
      }
    });
    
    // Alternative using OpenStreetMap if Google Maps is not preferred
    const openStreetMapUrl = center.coordinates 
      ? `https://staticmap.openstreetmap.de/staticmap.php?center=${center.coordinates.latitude},${center.coordinates.longitude}&zoom=14&size=600x300&markers=${center.coordinates.latitude},${center.coordinates.longitude},red`
      : '';
    
    return (
      <View style={styles.webMapContainer}>
        <Image
          source={{ uri: openStreetMapUrl }}
          style={styles.mapImage}
          resizeMode="cover"
        />
        <TouchableOpacity 
          style={styles.openMapButton}
          onPress={() => {
            if (center.coordinates) {
              openExternalMap(center.coordinates.latitude, center.coordinates.longitude);
            }
          }}
        >
          <MaterialIcons name="open-in-new" size={16} color="#FFFFFF" />
          <Text style={styles.openMapButtonText}>Open in Maps</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render native map using React Native Maps
  const renderNativeMap = (locations: PartnerLocation[], selectedLocation?: PartnerLocation) => {
    if (!MapView) {
      return (
        <View style={styles.webMapPlaceholder}>
          <MaterialIcons name="error-outline" size={30} color="#F44336" />
          <Text style={styles.webMapText}>Maps not available on this platform</Text>
        </View>
      );
    }

    if (locations.length === 0) {
      return (
        <View style={styles.webMapPlaceholder}>
          <MaterialIcons name="location-off" size={30} color="#999" />
          <Text style={styles.webMapText}>No locations available</Text>
        </View>
      );
    }

    // Center on selected location or first location
    const center = selectedLocation || locations[0];
    
    if (!center.coordinates) {
      return (
        <View style={styles.webMapPlaceholder}>
          <MaterialIcons name="error-outline" size={30} color="#F44336" />
          <Text style={styles.webMapText}>Location coordinates not available</Text>
        </View>
      );
    }

    const mapRegion = {
      latitude: center.coordinates.latitude,
      longitude: center.coordinates.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };

    return (
      <View style={styles.nativeMapContainer}>
        <MapView
          style={styles.nativeMap}
          region={mapRegion}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {locations.map(location => {
            if (!location.coordinates) return null;
            
            const isSelected = selectedLocation?.id === location.id;
            
            return (
              <Marker
                key={location.id}
                coordinate={{
                  latitude: location.coordinates.latitude,
                  longitude: location.coordinates.longitude,
                }}
                title={location.businessName || location.name || 'Partner Location'}
                description={location.address}
                pinColor={isSelected ? 'red' : type === 'pickup' ? 'green' : 'blue'}
                onPress={() => handleSelectPartner(location)}
              />
            );
          })}
        </MapView>
      </View>
    );
  };

  // Select the appropriate map renderer based on platform
  const renderMap = (locations: PartnerLocation[], selectedLocation?: PartnerLocation) => {
    return Platform.OS === 'web' 
      ? renderWebMap(locations, selectedLocation)
      : renderNativeMap(locations, selectedLocation);
  };

  const renderPartnerItem = (partner: PartnerLocation) => {
    const isSelected = selectedPartner?.id === partner.id;
    console.log(`❗Rendering partner item: ${partner.businessName}`);

    // Ensure all displayed properties are strings to avoid React errors
    const displayName = partner.businessName || partner.name || 'Unknown Location';
    const displayAddress = partner.address || 'Address not available';
    
    // Make sure workingHours is a string
    let displayHours = 'Hours not available';
    if (typeof partner.workingHours === 'string') {
      displayHours = partner.workingHours;
    } else if (partner.workingHours && typeof partner.workingHours === 'object') {
      try {
        // Type the working hours object properly
        const workingHoursObj = partner.workingHours as {
          monday?: { open?: string; close?: string };
          tuesday?: { open?: string; close?: string };
          wednesday?: { open?: string; close?: string };
          thursday?: { open?: string; close?: string };
          friday?: { open?: string; close?: string };
          saturday?: { open?: string; close?: string };
          sunday?: { open?: string; close?: string };
        };
        
        const monday = workingHoursObj.monday;
        displayHours = monday && monday.open && monday.close 
          ? `${monday.open} - ${monday.close}` 
          : 'Hours not available';
      } catch (e) {
        console.error('Error formatting hours for display:', e);
      }
    }

    return (
      <TouchableOpacity
        key={partner.id}
        style={[
          styles.partnerItem,
          isSelected && { backgroundColor: `${getTypeColor()}20` }
        ]}
        onPress={() => handleSelectPartner(partner)}
      >
        <View style={styles.partnerItemContent}>
          <View style={styles.partnerInfo}>
            <Text style={styles.partnerName}>{displayName}</Text>
            <Text style={styles.partnerAddress}>{displayAddress}</Text>
            <Text style={styles.partnerHours}>{displayHours}</Text>
          </View>
          
          {isSelected && (
            <MaterialIcons 
              name="check-circle" 
              size={24} 
              color={getTypeColor()} 
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSelectedPartner = () => {
    if (!selectedPartner) {
      return (
        <Text style={styles.placeholderText}>
          Select a {type} location
        </Text>
      );
    }

    return (
      <View style={styles.selectedPartnerContainer}>
        <View style={styles.selectedPartnerInfo}>
          <Text style={styles.selectedPartnerName}>
            {selectedPartner.businessName || selectedPartner.name}
          </Text>
          <Text style={styles.selectedPartnerAddress}>
            {selectedPartner.address}
          </Text>
        </View>
        
        {selectedPartner.coordinates && viewMode === 'map' && (
          <View style={styles.miniMapContainer}>
            {renderMap([selectedPartner], selectedPartner || undefined)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label} <Text style={styles.required}>*</Text></Text>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'dropdown' && styles.viewToggleButtonActive,
            ]}
            onPress={() => setViewMode('dropdown')}
          >
            <MaterialIcons 
              name="list" 
              size={18} 
              color={viewMode === 'dropdown' ? '#4CAF50' : '#666'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.viewToggleButton,
              viewMode === 'map' && styles.viewToggleButtonActive,
            ]}
            onPress={() => setViewMode('map')}
          >
            <MaterialIcons 
              name="map" 
              size={18} 
              color={viewMode === 'map' ? '#4CAF50' : '#666'} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.selectButton,
          selectedPartner && styles.selectButtonActive
        ]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectButtonContent}>
          {getLocationIcon()}
          <View style={styles.selectButtonTextContainer}>
            {renderSelectedPartner()}
          </View>
          <MaterialIcons name="arrow-drop-down" size={24} color="#666666" />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <MaterialIcons 
                  name={type === 'pickup' ? 'flight-takeoff' : 'flight-land'} 
                  size={24} 
                  color={getTypeColor()} 
                />
                <Text style={styles.modalTitle}>Select {type} Location</Text>
              </View>
              
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <MaterialIcons name="search" size={20} color="#666666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search partner locations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setSearchQuery('')}
                >
                  <MaterialIcons name="clear" size={20} color="#666666" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  viewMode === 'dropdown' && styles.activeTabButton
                ]}
                onPress={() => setViewMode('dropdown')}
              >
                <MaterialIcons 
                  name="format-list-bulleted" 
                  size={20} 
                  color={viewMode === 'dropdown' ? '#FFF' : '#666'} 
                />
                <Text style={[
                  styles.tabButtonText,
                  viewMode === 'dropdown' && styles.activeTabButtonText
                ]}>List View</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  viewMode === 'map' && styles.activeTabButton
                ]}
                onPress={() => setViewMode('map')}
              >
                <MaterialIcons 
                  name="map" 
                  size={20} 
                  color={viewMode === 'map' ? '#FFF' : '#666'} 
                />
                <Text style={[
                  styles.tabButtonText,
                  viewMode === 'map' && styles.activeTabButtonText
                ]}>Map View</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={getTypeColor()} />
                <Text style={styles.loadingText}>
                  Loading partner locations...
                </Text>
              </View>
            ) : (
              <>
                {viewMode === 'map' && (
                  <View style={styles.mapViewContainer}>
                    {renderMap(filteredPartners, selectedPartner || undefined)}
                    <Text style={styles.mapInstructions}>
                      Select a partner from the list below to choose location
                    </Text>
                  </View>
                )}
                
                <ScrollView style={styles.partnersList}>
                  {filteredPartners.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialIcons name="search-off" size={40} color="#CCCCCC" />
                      <Text style={styles.emptyStateText}>
                        No partner locations found
                      </Text>
                      <Text style={styles.emptyStateSubtext}>
                        Try adjusting your search criteria
                      </Text>
                    </View>
                  ) : (
                    filteredPartners.map(partner => renderPartnerItem(partner))
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  required: {
    color: '#F44336',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  viewToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F5F5F5',
  },
  viewToggleButtonActive: {
    backgroundColor: '#E8F5E9',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    minHeight: 60,
    justifyContent: 'center',
  },
  selectButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#F0F9F0',
  },
  selectButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  selectButtonTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  placeholderText: {
    color: '#999999',
    fontSize: 14,
  },
  selectedPartnerContainer: {
    flexDirection: 'column',
  },
  selectedPartnerInfo: {
    flex: 1,
  },
  selectedPartnerName: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '500',
  },
  selectedPartnerAddress: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
  },
  miniMapContainer: {
    height: 120,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    maxHeight: '80%',
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
      web: {
        boxShadow: '0px -2px 4px rgba(0, 0, 0, 0.1)'
      } as any
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    margin: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    height: 40,
  },
  clearButton: {
    padding: 4,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: '#4CAF50',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 12,
  },
  partnersList: {
    padding: 16,
    maxHeight: 400,
  },
  partnerItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)'
      } as any
    }),
  },
  partnerItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 4,
  },
  partnerAddress: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  partnerHours: {
    fontSize: 12,
    color: '#888888',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
  mapViewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  mapInstructions: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  webMapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    position: 'relative',
  },
  nativeMapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  nativeMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  webMapPlaceholder: {
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  webMapText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  openMapButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openMapButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
}); 