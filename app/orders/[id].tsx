import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { parcelService } from '../../src/services/parcelService';
import { Parcel } from '../../src/types/parcel';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import Colors from '../../constants/Colors';
import { useAuth } from '../../src/context/AuthContext';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    fetchParcelDetails();
  }, [id]);
  
  const fetchParcelDetails = async () => {
    if (!id || !user) return;
    
    setLoading(true);
    try {
      const result = await parcelService.getParcelById(id as string, user.id);
      
      if (!result) {
        Alert.alert('Error', 'Failed to load parcel details', [{ text: 'OK', onPress: () => router.back() }]);
        console.log("Parcel not found, navigating back");
        router.back();
      } else {
        setParcel(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load parcel details. Please check your connection and try again.', [{ text: 'OK', onPress: () => router.back() }]);
      console.error("Error fetching parcel details:", error);
      router.back();
    }
    setLoading(false);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.light.warning;
      case 'pickup': return Colors.light.info;
      case 'in_transit': return Colors.light.info;
      case 'delivered': return Colors.light.success;
      default: return Colors.light.text;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'pickup': return 'Ready for Pickup';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return status;
    }
  };
  
  const copyTrackingCode = async () => {
    if (!parcel?.tracking_code) return;
    
    await Clipboard.setStringAsync(parcel.tracking_code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied', 'Tracking code copied to clipboard');
  };
  
  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText style={styles.loadingText}>Loading parcel details...</ThemedText>
      </ThemedView>
    );
  }
  
  if (!parcel) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.light.error} />
        <ThemedText style={styles.errorText}>Parcel not found</ThemedText>
      </ThemedView>
    );
  }
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: `Parcel ${parcel.tracking_code}`,
          headerBackTitle: 'Orders'
        }} 
      />
      <ScrollView style={styles.container}>
        <ThemedView style={styles.card}>
          <View style={styles.qrContainer}>
            <QRCode
              value={`https://mbetadera.app/track/${parcel.tracking_code}`}
              size={200}
              color={Colors.light.text}
              backgroundColor="transparent"
            />
          </View>
          
          <View style={styles.trackingCodeContainer}>
            <ThemedText style={styles.trackingCodeLabel}>Tracking Code:</ThemedText>
            <Pressable onPress={copyTrackingCode} style={styles.trackingCode}>
              <ThemedText style={styles.trackingCodeText}>{parcel.tracking_code}</ThemedText>
              <Ionicons name="copy-outline" size={20} color={Colors.light.textSecondary} />
            </Pressable>
          </View>
          
          <View style={styles.statusContainer}>
            <ThemedText style={styles.statusLabel}>Status:</ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(parcel.status) }]}>
              <ThemedText style={styles.statusText}>{getStatusText(parcel.status)}</ThemedText>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.addressContainer}>
            <View style={styles.addressSection}>
              <Ionicons name="location" size={24} color={Colors.light.primary} />
              <View style={styles.addressTextContainer}>
                <ThemedText style={styles.addressLabel}>Pickup Location</ThemedText>
                <ThemedText style={styles.addressText}>{parcel.pickup_address?.address_line}</ThemedText>
                <ThemedText style={styles.contactText}>{parcel.pickup_contact}</ThemedText>
              </View>
            </View>
            
            <View style={styles.directionArrow}>
              <Ionicons name="arrow-down" size={24} color={Colors.light.textSecondary} />
            </View>
            
            <View style={styles.addressSection}>
              <Ionicons name="flag" size={24} color={Colors.light.error} />
              <View style={styles.addressTextContainer}>
                <ThemedText style={styles.addressLabel}>Dropoff Location</ThemedText>
                <ThemedText style={styles.addressText}>{parcel.dropoff_address?.address_line}</ThemedText>
                <ThemedText style={styles.contactText}>{parcel.dropoff_contact}</ThemedText>
              </View>
            </View>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.details}>
            <View style={styles.detailsHeader}>
              <Ionicons name="cube-outline" size={24} color={Colors.light.primary} />
              <ThemedText style={styles.sectionTitle}>Package Information</ThemedText>
            </View>
            <DetailItem 
              icon="cube" 
              label="Package Size" 
              value={parcel.package_size ? parcel.package_size.charAt(0).toUpperCase() + parcel.package_size.slice(1) : ''}
            />
            <DetailItem 
              icon="create-outline" 
              label="Description" 
              value={parcel.package_description || 'No description'} 
            />
            <DetailItem 
              icon="alert-circle-outline" 
              label="Special Handling" 
              value={parcel.is_fragile ? 'Fragile' : 'Standard'} 
              highlightValue={parcel.is_fragile}
              highlightColor={Colors.light.warning}
            />
            
            {(parcel.estimated_price || parcel.distance) && (
              <>
                <View style={styles.divider} />
                <View style={styles.detailsHeader}>
                  <Ionicons name="information-circle-outline" size={24} color={Colors.light.primary} />
                  <ThemedText style={styles.sectionTitle}>Delivery Information</ThemedText>
                </View>
                {parcel.estimated_price && (
                  <DetailItem 
                    icon="cash-outline" 
                    label="Delivery Fee" 
                    value={parcel.formatted_price || `ETB ${parcel.estimated_price.toFixed(2)}`} 
                  />
                )}
                {parcel.distance && (
                  <DetailItem 
                    icon="map-outline" 
                    label="Delivery Distance" 
                    value={parcel.formatted_distance || `${parcel.distance.toFixed(1)} km`} 
                  />
                )}
              </>
            )}
            
            <View style={styles.divider} />
            <View style={styles.detailsHeader}>
              <Ionicons name="time-outline" size={24} color={Colors.light.primary} />
              <ThemedText style={styles.sectionTitle}>Timestamps</ThemedText>
            </View>
            <DetailItem 
              icon="calendar-outline" 
              label="Created" 
              value={parcel.created_at ? new Date(parcel.created_at).toLocaleString() : ''} 
            />
            <DetailItem 
              icon="time-outline" 
              label="Last Updated" 
              value={parcel.updated_at ? new Date(parcel.updated_at).toLocaleString() : ''} 
            />
          </View>
          
          <Pressable 
            style={styles.trackButton}
            onPress={() => router.push(`/track-map?id=${parcel.id}`)}
          >
            <Ionicons name="map" size={20} color="#fff" />
            <ThemedText style={styles.trackButtonText}>Track on Map</ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    </>
  );
}

const DetailItem = ({ 
  label, 
  value, 
  icon, 
  highlightValue = false,
  highlightColor = Colors.light.primary
}: { 
  label: string, 
  value: string, 
  icon?: string,
  highlightValue?: boolean,
  highlightColor?: string
}) => (
  <View style={styles.detailItem}>
    {icon && <Ionicons name={icon as any} size={18} color={Colors.light.textSecondary} style={styles.detailIcon} />}
    <ThemedText style={styles.detailLabel}>{label}:</ThemedText>
    <ThemedText 
      style={[
        styles.detailValue, 
        highlightValue && { 
          color: highlightColor,
          fontWeight: 'bold'
        }
      ]}
    >
      {value}
    </ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  qrContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  trackingCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  trackingCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackingCode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 6,
  },
  trackingCodeText: {
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 16,
  },
  addressContainer: {
    marginBottom: 16,
  },
  addressSection: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  addressTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
  },
  contactText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 4,
  },
  directionArrow: {
    alignItems: 'center',
    marginVertical: 8,
  },
  details: {
    marginVertical: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  trackButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
