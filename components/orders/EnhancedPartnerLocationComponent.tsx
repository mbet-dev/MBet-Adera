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

// Conditionally import MapView and Marker for different platforms
let MapView: any, Marker: any;

// Import a shim for react-native-maps when in web environment
if (Platform.OS === 'web') {
  console.log('Running in web environment, using map fallbacks');
  // For web, explicitly set MapView and Marker as dummy components
  MapView = ({ children, ...props }: any) => (
    <View style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#f5f5f5',
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <Text style={{ color: '#666' }}>Map View (Web)</Text>
      {children}
    </View>
  );
  Marker = () => null;
} else {
  try {
    // Using require to avoid bundling issues with webpack
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default;
    Marker = RNMaps.Marker;
  } catch (error) {
    console.error('Error importing react-native-maps:', error);
  }
}

// Mock data for partners - this would normally come from an API/database
const MOCK_PARTNERS = [
  {
    id: '1',
    name: 'Bole Express Couriers',
    businessName: 'Bole Express Couriers',
    address: 'Bole Road, Addis Ababa',
    coordinates: {
      latitude: 8.9806,
      longitude: 38.7878
    },
    workingHours: '9:00 AM - 6:00 PM'
  },
  {
    id: '2',
    name: 'Kazanchis Post Center',
    businessName: 'Kazanchis Post Center',
    address: 'Kazanchis, Addis Ababa',
    coordinates: {
      latitude: 9.0167,
      longitude: 38.7526
    },
    workingHours: '8:30 AM - 5:30 PM'
  },
  {
    id: '3',
    name: 'Piassa Delivery Hub',
    businessName: 'Piassa Delivery Hub',
    address: 'Piassa, Addis Ababa',
    coordinates: {
      latitude: 9.0356,
      longitude: 38.7468
    },
    workingHours: '9:00 AM - 6:00 PM'
  },
  {
    id: '4',
    name: 'Merkato Shipping Center',
    businessName: 'Merkato Shipping Center',
    address: 'Merkato, Addis Ababa',
    coordinates: {
      latitude: 9.0384,
      longitude: 38.7423
    },
    workingHours: '8:00 AM - 7:00 PM'
  },
  {
    id: '5',
    name: 'Mexico Square Post',
    businessName: 'Mexico Square Post',
    address: 'Mexico Square, Addis Ababa',
    coordinates: {
      latitude: 9.0147,
      longitude: 38.7633
    },
    workingHours: '9:00 AM - 5:00 PM'
  },
  {
    id: '6',
    name: 'MBet-Adera Sorting Facility Center',
    businessName: 'MBet-Adera Sorting Facility Center/Hub',
    address: 'Central Addis Ababa',
    coordinates: {
      latitude: 9.0222,
      longitude: 38.7468
    },
    workingHours: '24/7',
    isFacility: true
  }
];

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

export const EnhancedPartnerLocationComponent: React.FC<PartnerLocationComponentProps> = ({
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
        // Normally this would be an API call
        // For now, we're just using mock data
        
        // Filter out the sorting facility - it cannot be used as pickup/dropoff
        const availablePartners = MOCK_PARTNERS.filter(partner => !partner.isFacility);
        
        setPartners(availablePartners);
        setFilteredPartners(availablePartners);
      } catch (error) {
        console.error('Error loading partner locations:', error);
        setPartners([]);
        setFilteredPartners([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPartnerLocations();
  }, []);

  // Filter partners when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPartners(partners);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = partners.filter(partner => 
        partner.name?.toLowerCase().includes(query) || 
        partner.businessName?.toLowerCase().includes(query) ||
        partner.address?.toLowerCase().includes(query)
      );
      setFilteredPartners(filtered);
    }
  }, [searchQuery, partners]);

  const handleSelectPartner = (partner: PartnerLocation) => {
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

    if (url) {
      Linking.canOpenURL(url)
        .then(supported => {
          if (supported) {
            return Linking.openURL(url);
          }
        })
        .catch(error => console.error('Error opening map:', error));
    }
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
    
    // Get coordinates
    const lat = center.coordinates.latitude;
    const lon = center.coordinates.longitude;
    
    // Use a more reliable and free OSM static image service
    // This is a fallback that doesn't require an API key
    const openStreetMapUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=300&center=lonlat:${lon},${lat}&zoom=14&marker=lonlat:${lon},${lat};color:%23ff0000;size:medium&apiKey=15e7c8bc879347fc9e27e4a087ac4eaa`;
    
    // Fallback URL in case the API key doesn't work
    const fallbackUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon-0.01},${lat-0.01},${lon+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lon}`;
    
    return (
      <View style={styles.webMapContainer}>
        {Platform.OS === 'web' ? (
          <iframe 
            src={fallbackUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            onError={(e) => console.error('iframe loading error:', e)}
          />
        ) : (
          <Image
            source={{ uri: openStreetMapUrl }}
            style={styles.mapImage}
            resizeMode="cover"
            onError={(e) => console.error('Image loading error:', e.nativeEvent)}
          />
        )}
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
  const renderMap = (locations: PartnerLocation[], selectedLocation?: PartnerLocation | null) => {
    return Platform.OS === 'web' 
      ? renderWebMap(locations, selectedLocation || undefined)
      : renderNativeMap(locations, selectedLocation || undefined);
  };

  const renderPartnerItem = (partner: PartnerLocation) => {
    const isSelected = selectedPartner?.id === partner.id;

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
            <Text style={styles.partnerName}>{partner.businessName || partner.name}</Text>
            <Text style={styles.partnerAddress}>{partner.address}</Text>
            <Text style={styles.partnerHours}>{partner.workingHours}</Text>
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
            {/* Use the partner directly since we know it has coordinates here */}
            {renderMap([selectedPartner], selectedPartner)}
          </View>
        )}
      </View>
    );
  };

  // Add after the imports
  useEffect(() => {
    // Add debugging to help identify web platform issues
    if (Platform.OS === 'web') {
      console.log('EnhancedPartnerLocationComponent initialized on web platform');
      
      // Check if the necessary web components are available
      if (typeof window !== 'undefined' && window.document) {
        console.log('Window and document are available');
      } else {
        console.error('Window or document is not available - this might cause rendering issues');
      }
    }
  }, []);

  // Modify the component's return statement to include error boundary
  try {
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
  } catch (error) {
    console.error('Error rendering EnhancedPartnerLocationComponent:', error);
    // Return a minimal fallback UI
    return (
      <View style={[styles.container, { padding: 16, backgroundColor: '#f8d7da', borderRadius: 8 }]}>
        <Text style={{ color: '#721c24', fontWeight: 'bold' }}>
          Error rendering location component
        </Text>
        <Text style={{ color: '#721c24', marginTop: 8 }}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }
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