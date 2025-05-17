import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

// Remove the conditional import and replace with a more robust approach
// We'll use a completely web-only implementation
let MapView, Marker;
if (Platform.OS !== 'web') {
  try {
    // Dynamic import to prevent webpack from bundling this for web
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (error) {
    console.error('Error importing react-native-maps:', error);
  }
} else {
  // Create dummy components for web to prevent errors
  MapView = ({ children, ...props }) => null;
  Marker = (props) => null;
}

export const PartnerLocationSelect = ({ label, onSelect, selectedPartner, type = 'pickup' }) => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [region, setRegion] = useState({
        latitude: 9.0222,  // Addis Ababa coordinates
        longitude: 38.7468,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    });
    
    useEffect(() => {
        const fetchPartnerLocations = async () => {
            try {
                setLoading(true);
                // Fetch from partner_locations view instead of partners table
                const { data, error } = await supabase
                    .from('partner_locations')
                    .select('*')
                    .eq('is_active', true);
                
                if (error) {
                    throw error;
                }
                
                // Log raw data to debug
                console.log('Raw partner location data:', data);
                
                // Transform data to include coordinates in the expected format
                const formattedPartners = data
                    .filter(location => location.business_name !== 'MBet-Adera Sorting Facility Center')
                    .map(location => {
                        return {
                            id: location.id,
                            name: location.business_name,
                            businessName: location.business_name,
                            address: location.address || 'Addis Ababa, Ethiopia',
                            coordinates: location.latitude && location.longitude ? [
                                location.longitude,
                                location.latitude
                            ] : null,
                            workingHours: location.working_hours || '9:00 AM - 5:00 PM',
                        };
                    })
                    .filter(partner => partner.coordinates !== null);
                
                setPartners(formattedPartners);
                console.log('Loaded partners with coordinates:', formattedPartners.length);
                
                // If no partners were found, show an error in the console
                if (formattedPartners.length === 0) {
                    console.warn('No partners with valid coordinates found in the database');
                }
            } catch (error) {
                console.error('Error loading partner locations:', error);
                setPartners([]);
            } finally {
                setLoading(false);
            }
        };
        
        fetchPartnerLocations();
    }, []);

    const handleSelectPartner = (partner) => {
        onSelect(partner);
        setModalVisible(false);
        if (partner.coordinates) {
            setRegion({
                ...region,
                latitude: partner.coordinates[1],
                longitude: partner.coordinates[0],
            });
        }
    };

    // For web, render a static map image instead of iframe
    const renderWebMap = (lat, lon, zoom = 15) => {
        // Using OpenStreetMap static image API with multiple markers if needed
        let mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=600x400`;
        
        // Add the main marker (red)
        mapUrl += `&markers=${lat},${lon},red`;
        
        // If showing all partners in modal view, add other markers
        if (zoom < 15 && partners.length > 0) {
            partners.forEach(partner => {
                if (partner.coordinates && 
                    (partner.coordinates[1] !== lat || partner.coordinates[0] !== lon)) {
                    mapUrl += `&markers=${partner.coordinates[1]},${partner.coordinates[0]},blue`;
                }
            });
        }
        
        return (
            <View style={styles.webMapContainer}>
                <Image
                    source={{ uri: mapUrl }}
                    style={styles.mapImage}
                    resizeMode="cover"
                    onError={(e) => console.error('Map image loading error:', e.nativeEvent.error)}
                />
            </View>
        );
    };

    // Render map based on platform
    const renderMap = () => {
        if (Platform.OS === 'web') {
            if (!selectedPartner || !selectedPartner.coordinates) {
                return (
                    <View style={styles.webMapPlaceholder}>
                        <MaterialIcons name="location-on" size={24} color="#4CAF50" />
                        <Text style={styles.webMapText}>
                            {selectedPartner ? getDisplayName(selectedPartner) : 'Select a location'}
                        </Text>
                    </View>
                );
            }
            
            return renderWebMap(
                selectedPartner.coordinates[1], 
                selectedPartner.coordinates[0]
            );
        }

        // Only render MapView for native platforms
        if (MapView && Platform.OS !== 'web') {
            return (
                <MapView
                    style={styles.map}
                    region={{
                        latitude: selectedPartner.coordinates[1],
                        longitude: selectedPartner.coordinates[0],
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                >
                    <Marker
                        coordinate={{
                            latitude: selectedPartner.coordinates[1],
                            longitude: selectedPartner.coordinates[0],
                        }}
                        title={getDisplayName(selectedPartner)}
                        pinColor="#4CAF50"
                    />
                </MapView>
            );
        }
        
        // Fallback for web or if MapView couldn't be imported
        return (
            <View style={styles.webMapPlaceholder}>
                <MaterialIcons name="location-on" size={24} color="#4CAF50" />
                <Text style={styles.webMapText}>
                    {selectedPartner ? getDisplayName(selectedPartner) : 'Map not available'}
                </Text>
            </View>
        );
    };

    // Also update the renderModalMap function
    const renderModalMap = () => {
        if (Platform.OS === 'web') {
            if (loading) {
                return (
                    <View style={styles.webModalMapPlaceholder}>
                        <ActivityIndicator size="large" color="#4CAF50" />
                        <Text style={styles.webModalMapText}>
                            Loading partner locations...
                        </Text>
                    </View>
                );
            }
            
            if (partners.length === 0) {
                return (
                    <View style={styles.webModalMapPlaceholder}>
                        <MaterialIcons name="error-outline" size={40} color="#FF5722" />
                        <Text style={styles.webModalMapText}>
                            No partner locations found
                        </Text>
                    </View>
                );
            }
            
            // Center on selected partner or first partner
            const centerPartner = selectedPartner || partners[0];
            
            // Create a clickable map with partner locations
            return (
                <View style={styles.webModalMapContainer}>
                    {renderWebMap(
                        centerPartner.coordinates[1], 
                        centerPartner.coordinates[0],
                        13 // Slightly zoomed out to show multiple locations
                    )}
                    <View style={styles.webMapOverlay}>
                        <Text style={styles.webMapOverlayText}>
                            Click a partner from the list below to select
                        </Text>
                    </View>
                </View>
            );
        }

        // Only render MapView for native platforms
        if (MapView && Platform.OS !== 'web') {
            return (
                <MapView
                    style={styles.modalMap}
                    region={region}
                    onRegionChangeComplete={setRegion}
                >
                    {partners.map(partner => (
                        <Marker
                            key={partner.id}
                            coordinate={{
                                latitude: partner.coordinates[1],
                                longitude: partner.coordinates[0],
                            }}
                            title={getDisplayName(partner)}
                            description={partner.address}
                            pinColor={selectedPartner?.id === partner.id ? '#4CAF50' : '#FF5722'}
                            onPress={() => handleSelectPartner(partner)}
                        />
                    ))}
                </MapView>
            );
        }
        
        // Fallback for web or if MapView couldn't be imported
        return (
            <View style={styles.webModalMapPlaceholder}>
                <MaterialIcons name="map" size={40} color="#4CAF50" />
                <Text style={styles.webModalMapText}>
                    Please select a partner from the list below
                </Text>
            </View>
        );
    };

    // Get the display name, handling different property names
    const getDisplayName = (partner) => {
        return partner.name || partner.businessName || 'Unknown Location';
    };

    // Get icon based on location type (pickup or dropoff)
    const getLocationIcon = () => {
        if (type === 'pickup') {
            return <MaterialIcons name="flight-takeoff" size={20} color="#4CAF50" style={styles.locationIcon} />;
        }
        return <MaterialIcons name="flight-land" size={20} color="#FF5722" style={styles.locationIcon} />;
    };

    // Get color based on type
    const getTypeColor = () => {
        return type === 'pickup' ? '#4CAF50' : '#FF5722';
    };

    // Handle external map link for web
    const openExternalMap = () => {
        if (Platform.OS === 'web' && selectedPartner?.coordinates) {
            const lat = selectedPartner.coordinates[1];
            const lon = selectedPartner.coordinates[0];
            const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`;
            window.open(url, '_blank');
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            
            <TouchableOpacity 
                style={[
                    styles.dropdownButton,
                    selectedPartner && { borderColor: getTypeColor() }
                ]}
                onPress={() => setModalVisible(true)}
                disabled={loading}
            >
                {selectedPartner ? (
                    <View style={styles.selectedDisplay}>
                        {getLocationIcon()}
                        <View style={styles.selectedTextContainer}>
                            <Text style={styles.selectedName}>{getDisplayName(selectedPartner)}</Text>
                            <Text style={styles.selectedAddress}>{selectedPartner.address}</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.placeholderContainer}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#666" style={styles.locationIcon} />
                        ) : (
                            <MaterialIcons name="add-location" size={20} color="#666" style={styles.locationIcon} />
                        )}
                        <Text style={styles.placeholderText}>
                            {loading ? 'Loading partner locations...' : 'Select a partner location'}
                        </Text>
                    </View>
                )}
                <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>
            
            {selectedPartner && (
                <View style={styles.mapPreview}>
                    {renderMap()}
                    <View style={styles.mapOverlay}>
                        <TouchableOpacity 
                            style={styles.mapButton}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={styles.mapButtonText}>Change</Text>
                        </TouchableOpacity>
                        
                        {Platform.OS === 'web' && (
                            <TouchableOpacity 
                                style={[styles.mapButton, styles.mapButtonSecondary]}
                                onPress={openExternalMap}
                            >
                                <Text style={styles.mapButtonText}>View Map</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
            
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(false);
                    // Clear any pending state after animation
                    setTimeout(() => {
                        setSelectedPartner(null);
                    }, 300);
                }}
            >
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, { maxHeight: '60%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {type === 'pickup' ? 'Select Pickup Partner' : 'Select Delivery Partner'}
                            </Text>
                            <TouchableOpacity 
                                onPress={() => {
                                    setModalVisible(false);
                                    // Clear any pending state after animation
                                    setTimeout(() => {
                                        setSelectedPartner(null);
                                    }, 300);
                                }}
                            >
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        {/* Map with all partner locations */}
                        {!loading && partners.length > 0 && (
                            <View style={[styles.mapFullContainer, { height: 150 }]}>
                                {renderModalMap()}
                            </View>
                        )}
                        
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={getTypeColor()} />
                                <Text style={styles.loadingText}>Loading partner locations...</Text>
                            </View>
                        ) : partners.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="error-outline" size={40} color="#FF5722" />
                                <Text style={styles.emptyText}>No partner locations available</Text>
                            </View>
                        ) : (
                            <ScrollView style={[styles.partnerList, { maxHeight: 300 }]}>
                                {partners.map(partner => (
                                    <TouchableOpacity
                                        key={partner.id}
                                        style={[
                                            styles.partnerItem,
                                            selectedPartner?.id === partner.id && [
                                                styles.selectedPartner,
                                                { borderColor: getTypeColor(), backgroundColor: getTypeColor() + '10' }
                                            ]
                                        ]}
                                        onPress={() => handleSelectPartner(partner)}
                                    >
                                        <MaterialIcons 
                                            name={selectedPartner?.id === partner.id ? "radio-button-checked" : "radio-button-unchecked"} 
                                            size={20} 
                                            color={selectedPartner?.id === partner.id ? getTypeColor() : "#666"} 
                                            style={styles.radioIcon}
                                        />
                                        <View style={styles.partnerTextContainer}>
                                            <Text style={styles.partnerName}>{getDisplayName(partner)}</Text>
                                            <Text style={styles.partnerAddress}>{partner.address}</Text>
                                            {partner.phone && (
                                                <Text style={styles.partnerContact}>
                                                    <MaterialIcons name="phone" size={10} color="#666" /> {partner.phone}
                                                </Text>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    selectedDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    placeholderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    placeholderText: {
        color: '#999',
        fontSize: 14,
    },
    selectedTextContainer: {
        flex: 1,
    },
    selectedName: {
        fontWeight: 'bold',
        color: '#333',
    },
    selectedAddress: {
        fontSize: 12,
        color: '#666',
    },
    locationIcon: {
        marginRight: 8,
    },
    mapPreview: {
        height: 120,
        marginTop: 8,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    mapImage: {
        width: '100%',
        height: '100%',
    },
    webMapContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f5f5f5',
    },
    webMapPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    webMapText: {
        marginLeft: 8,
        fontWeight: 'bold',
        color: '#333',
    },
    mapOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    mapButton: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginHorizontal: 4,
    },
    mapButtonSecondary: {
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
    },
    mapButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        height: '80%',
        maxHeight: 600,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalMapContainer: {
        height: 200,
        position: 'relative',
        backgroundColor: '#f0f0f0',
    },
    webMapOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
    },
    webMapOverlayText: {
        color: '#fff',
        textAlign: 'center',
        fontSize: 12,
    },
    modalMap: {
        ...StyleSheet.absoluteFillObject,
    },
    webModalMapPlaceholder: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
    },
    webModalMapText: {
        marginTop: 8,
        fontWeight: 'bold',
        color: '#333',
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        color: '#666',
        fontSize: 16,
        marginTop: 12,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#666',
        fontSize: 16,
        marginTop: 12,
    },
    partnerList: {
        maxHeight: 300,
        padding: 16,
    },
    partnerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
        marginBottom: 8,
        backgroundColor: '#fff',
    },
    selectedPartner: {
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.05)',
    },
    radioIcon: {
        marginRight: 12,
    },
    partnerTextContainer: {
        flex: 1,
    },
    partnerName: {
        fontWeight: 'bold',
        color: '#333',
    },
    partnerAddress: {
        fontSize: 12,
        color: '#666',
    },
    partnerContact: {
        fontSize: 11,
        color: '#666',
        marginTop: 4,
    },
    workingHours: {
        fontSize: 11,
        color: '#4CAF50',
        marginTop: 4,
    },
    mapFullContainer: {
        position: 'relative',
        backgroundColor: '#f0f0f0',
    },
});