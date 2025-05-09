import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { OpenStreetMap } from '../../components/OpenStreetMap.web';

// Web-specific implementation that doesn't use react-native-maps
export const PartnerLocationSelect = ({ label, onSelect, selectedPartner, type = 'pickup' }) => {
    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    
    useEffect(() => {
        const fetchPartnerLocations = async () => {
            try {
                setLoading(true);
                console.log('Fetching partner locations from Supabase...');
                const { data, error } = await supabase
                    .from('partners')
                    .select('*');
                
                if (error) {
                    throw error;
                }
                
                console.log(`Found ${data?.length || 0} partners in database`);
                
                // Format partners with location data from the database
                const formattedPartners = data
                    .filter(partner => partner.business_name !== 'MBet-Adera Sorting Facility Center')
                    .map(partner => {
                        // Get location data from partner's location field
                        const locationData = partner.location || {};
                        const latitude = locationData.latitude;
                        const longitude = locationData.longitude;
                        
                        // Fallback to dummy locations if location is not in the database
                        if (!latitude || !longitude) {
                            // Dummy location data for testing
                            const dummyLocations = {
                                'Bole Express Couriers': { latitude: 8.9806, longitude: 38.7878 },
                                'Kazanchis Post Center': { latitude: 9.0167, longitude: 38.7526 },
                                'Piassa Delivery Hub': { latitude: 9.0356, longitude: 38.7468 },
                                'Merkato Shipping Center': { latitude: 9.0384, longitude: 38.7423 },
                                'Mexico Square Post': { latitude: 9.0147, longitude: 38.7633 },
                                'Megenagna Express': { latitude: 9.0299, longitude: 38.7952 },
                                'Gerji Pickup Point': { latitude: 9.0119, longitude: 38.8129 },
                                'CMC Delivery': { latitude: 9.0486, longitude: 38.7632 },
                                'Jemo Post Office': { latitude: 8.9961, longitude: 38.7175 }
                            };
                            
                            const dummyLocation = dummyLocations[partner.business_name];
                            if (dummyLocation) {
                                return {
                                    id: partner.id,
                                    name: partner.business_name,
                                    businessName: partner.business_name,
                                    address: locationData.address || 'Addis Ababa, Ethiopia',
                                    coordinates: {
                                        latitude: dummyLocation.latitude,
                                        longitude: dummyLocation.longitude
                                    },
                                    workingHours: partner.working_hours || '9:00 AM - 5:00 PM',
                                    color: partner.color || '#4CAF50',
                                };
                            }
                            return null;
                        }
                        
                        return {
                            id: partner.id,
                            name: partner.business_name,
                            businessName: partner.business_name,
                            address: locationData.address || 'Addis Ababa, Ethiopia',
                            coordinates: {
                                latitude,
                                longitude
                            },
                            workingHours: partner.working_hours || '9:00 AM - 5:00 PM',
                            color: partner.color || '#4CAF50',
                        };
                    })
                    .filter(partner => partner && partner.coordinates);
                
                console.log(`Processed ${formattedPartners.length} partners with valid coordinates`);
                setPartners(formattedPartners);
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
    };

    // Format partner data as markers for the map
    const getMapMarkers = () => {
        return partners.map(partner => ({
            id: partner.id,
            latitude: partner.coordinates.latitude,
            longitude: partner.coordinates.longitude,
            title: partner.businessName || partner.name,
            color: partner.color || '#4CAF50',
        }));
    };

    // Render the map with all partner locations
    const renderMap = () => {
        // Default center (Addis Ababa)
        const defaultCenter = {
            latitude: 9.0222, 
            longitude: 38.7468
        };
        
        // If a partner is selected, center on it
        const center = selectedPartner && selectedPartner.coordinates 
            ? { 
                latitude: selectedPartner.coordinates.latitude, 
                longitude: selectedPartner.coordinates.longitude 
              }
            : defaultCenter;
            
        const markers = getMapMarkers();
        console.log(`Rendering map with ${markers.length} markers`);
        
        return (
            <View style={styles.mapContainer}>
                <OpenStreetMap
                    markers={markers}
                    initialLocation={center}
                    style={styles.map}
                    zoomLevel={12}
                    showLabels={true}
                    onMarkerPress={(marker) => {
                        // Find the partner with this ID and select it
                        const partner = partners.find(p => p.id === marker.id);
                        if (partner) {
                            handleSelectPartner(partner);
                        }
                    }}
                />
            </View>
        );
    };

    // Get the display name
    const getDisplayName = (partner) => {
        return partner.name || partner.businessName || 'Unknown Location';
    };

    // Get icon based on location type
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
            
            {selectedPartner && selectedPartner.coordinates && (
                <View style={styles.mapPreview}>
                    {renderMap()}
                </View>
            )}
            
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {type === 'pickup' ? 'Select Pickup Partner' : 'Select Delivery Partner'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        {/* Map with all partner locations */}
                        {!loading && partners.length > 0 && (
                            <View style={styles.mapFullContainer}>
                                {renderMap()}
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
                            <ScrollView style={styles.partnerList}>
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
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
    },
    selectedDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectedTextContainer: {
        flex: 1,
        marginLeft: 8,
    },
    selectedName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    selectedAddress: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    placeholderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    placeholderText: {
        fontSize: 14,
        color: '#999',
        marginLeft: 8,
    },
    locationIcon: {
        marginRight: 4,
    },
    mapPreview: {
        width: '100%',
        height: 180,
        marginTop: 12,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    mapContainer: {
        width: '100%',
        height: '100%',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        maxWidth: 500,
        maxHeight: '90%',
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
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
    partnerList: {
        maxHeight: 300,
    },
    partnerItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    selectedPartner: {
        borderLeftWidth: 4,
    },
    radioIcon: {
        marginRight: 12,
    },
    partnerTextContainer: {
        flex: 1,
    },
    partnerName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    partnerAddress: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: 10,
        color: '#666',
    },
    mapFullContainer: {
        width: '100%',
        height: 300,
    },
    webMapContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
        overflow: 'hidden',
    },
    mapImage: {
        width: '100%',
        height: '100%',
    },
});