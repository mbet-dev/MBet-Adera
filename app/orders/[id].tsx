import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  RefreshControl, Alert, TouchableOpacity, useWindowDimensions, Linking, Platform
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/services/supabase';
import Colors from '../../constants/Colors';
import LogoQRCode from '../../src/components/common/LogoQRCode';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface ParcelFullDetail {
  id: string;
  tracking_code?: string | null;
  status?: string | null;
  package_size?: string | null;
  weight?: number | null;
  dimensions?: any | null;
  estimated_delivery_time?: string | null;
  actual_delivery_time?: string | null;
  pickup_contact?: string | null;
  pickup_phone?: string | null;
  dropoff_contact?: string | null;
  dropoff_phone?: string | null;
  created_at: string;
  updated_at?: string | null;
  is_fragile?: boolean | null;
  delivery_instructions?: string | null;
  package_description?: string | null;
  sender?: { id?: string | null; full_name?: string | null; phone_number?: string | null } | null;
  receiver?: { id?: string | null; full_name?: string | null; phone_number?: string | null } | null;
  pickup_address_id?: any | null;
  dropoff_address_id?: any | null;
  sender_name?: string | null;
  sender_phone?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  sender_full_name?: string | null;
  sender_phone_number?: string | null;
  receiver_full_name?: string | null;
  receiver_phone_number?: string | null;
}

interface StatusHistoryItem {
  id: string;
  status?: string | null;
  address_text?: string | null;
  notes?: string | null;
  created_at: string;
  location?: any | null;
}

const ParcelDetailScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [parcel, setParcel] = useState<ParcelFullDetail | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const formatAddress = (address: any): string => {
    if (!address) return 'N/A';
    return [
      address.address_line,
      address.street_address,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean).join(', ') || 'Address details not available';
  };

  const fetchParcelDetails = async () => {
    if (!id) {
      Alert.alert('Error', 'Parcel ID is missing.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    setLoading(true);
    try {
      const { data: parcelData, error: parcelError } = await supabase
        .from('parcels')
        .select(`
          *,
          sender:sender_id (id, full_name, phone_number),
          receiver:receiver_id (id, full_name, phone_number),
          pickup_address_id (*),
          dropoff_address_id (*)
        `)
        .eq('id', id)
        .single();

      if (parcelError) throw parcelError;
      const mappedData = {
        ...parcelData,
        sender_full_name: parcelData.sender?.full_name || parcelData.sender_name,
        sender_phone_number: parcelData.sender?.phone_number || parcelData.sender_phone || parcelData.pickup_phone,
        receiver_full_name: parcelData.receiver?.full_name || parcelData.receiver_name,
        receiver_phone_number: parcelData.receiver?.phone_number || parcelData.receiver_phone || parcelData.dropoff_phone,
      };
      setParcel(mappedData as ParcelFullDetail);

      const { data: historyData, error: historyError } = await supabase
        .from('parcel_status_history')
        .select('*')
        .eq('parcel_id', id)
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;
      setStatusHistory(historyData || []);

    } catch (error: any) {
      console.error('Error fetching parcel details:', error);
      Alert.alert('Error', error.message || 'Failed to fetch parcel details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchParcelDetails();
  }, [id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchParcelDetails();
  }, [id]);

  const getStatusDisplay = (status: string | null | undefined): string => {
      return status?.replace(/_/g, ' ').split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ') || 'N/A';
  }

  const getStatusColor = (status: string | null | undefined): string => {
    const primaryColor = Colors.light.primary;
    const successColor = Colors.light.success;
    const errorColor = Colors.light.error;
    const warningColor = Colors.light.warning;
    const textSecondaryColor = Colors.light.textSecondary;

    if (!status) return textSecondaryColor;
    const s = status.toLowerCase();
    if (s === 'delivered') return successColor;
    if (s === 'canceled' || s === 'failed_delivery') return errorColor;
    if (s === 'in_transit' || s === 'out_for_delivery') return primaryColor;
    if (s === 'created' || s === 'pending_pickup') return warningColor;
    return textSecondaryColor;
  };

  const getStatusIcon = (status: string | null | undefined): JSX.Element => {
    let iconName: keyof typeof MaterialCommunityIcons.glyphMap = 'help-circle-outline';
    const color = getStatusColor(status);

    if (!status) return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
    const s = status.toLowerCase();

    if (s === 'delivered') iconName = 'check-circle-outline';
    else if (s === 'canceled' || s === 'failed_delivery') iconName = 'close-circle-outline';
    else if (s === 'in_transit') iconName = 'truck-fast-outline';
    else if (s === 'out_for_delivery') iconName = 'package-variant-closed';
    else if (s === 'at_pickup_location' || s === 'arrived_at_facility') iconName = 'map-marker-check-outline';
    else if (s === 'pending' || s === 'created' || s === 'pending_pickup' || s === 'accepted') iconName = 'clock-outline';
    else if (s === 'picked_up') iconName = 'package-variant-closed';

    return <MaterialCommunityIcons name={iconName} size={24} color={color} />;
  };

  const DetailRow: React.FC<{icon?: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value?: string | number | null; onPress?: () => void; valueStyle?: object}> = ({ icon, label, value, onPress, valueStyle }) => (
    <TouchableOpacity onPress={onPress} disabled={!onPress} style={styles.detailRow}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={Colors.light.primary} style={styles.detailIcon} />}
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={[styles.detailValue, valueStyle, onPress && styles.linkValue]}>{value ? String(value) : 'N/A'}</Text>
    </TouchableOpacity>
  );

  const ContactDetailRow: React.FC<{icon: keyof typeof MaterialCommunityIcons.glyphMap; name?: string | null; phone?: string | null; type: 'Sender' | 'Receiver'}> = ({ icon, name, phone, type }) => {
    const handlePhonePress = () => {
      if (phone) {
        const phoneNumber = Platform.OS === 'android' ? `tel:${phone}` : `telprompt:${phone}`;
        Linking.canOpenURL(phoneNumber)
          .then(supported => {
            if (!supported) {
              Alert.alert('Phone number is not available');
            } else {
              return Linking.openURL(phoneNumber);
            }
          })
          .catch(err => console.error('An error occurred', err));
      }
    };

    return (
      <View style={styles.contactRow}>
        <MaterialCommunityIcons name={icon} size={24} color={Colors.light.primary} style={styles.contactIcon} />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{name || `${type} Name N/A`}</Text>
          {phone ? (
            <TouchableOpacity onPress={handlePhonePress}>
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={16} color={Colors.light.primary} style={styles.phoneIcon}/>
                <Text style={styles.phoneValue}>{phone}</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={styles.contactDetail}>Phone N/A</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading && !parcel) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading parcel details...</Text>
      </View>
    );
  }

  if (!parcel) {
    return (
      <View style={styles.centeredContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={Colors.light.error} />
        <Text style={styles.errorText}>Could not load parcel details for ID: {id}.</Text>
        {router.canGoBack() && 
            <TouchableOpacity onPress={() => router.back()} style={[styles.actionButton, {backgroundColor: Colors.light.primary}]}>
                <Text style={styles.actionButtonText}>Go Back</Text>
            </TouchableOpacity>
        }
      </View>
    );
  }

  const currentStatusDisplay = getStatusDisplay(parcel.status);
  const currentStatusColor = getStatusColor(parcel.status);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: parcel.tracking_code ? `Parcel ${parcel.tracking_code}` : 'Parcel Details',
          headerStyle: { backgroundColor: Colors.light.primary },
          headerTintColor: Colors.light.background,
        }}
      />
      <ScrollView 
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} tintColor={Colors.light.primary}/>}
          contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.card}>
            <View style={styles.qrStatusContainer}>
                {parcel.tracking_code && 
                    <View style={styles.qrCodeWrapper}>
                        <LogoQRCode value={parcel.tracking_code} size={width * 0.4} logoSize={width*0.08} />
                    </View>
                }
                <View style={styles.statusSummary}>
                    <Text style={styles.trackingCodeValue}>{parcel.tracking_code || 'N/A'}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: currentStatusColor }]}>
                        <Text style={styles.statusBadgeText}>{currentStatusDisplay}</Text>
                    </View>
                </View>
            </View>
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key Information</Text>
            <DetailRow icon="information-outline" label="Description" value={parcel.package_description} />
            <DetailRow icon="cube-scan" label="Size" value={parcel.package_size} />
            <DetailRow icon="weight-kilogram" label="Weight" value={parcel.weight ? `${parcel.weight} kg` : undefined} />
            <DetailRow icon="alert-octagon-outline" label="Fragile" value={parcel.is_fragile ? 'Yes' : 'No'} />
            <DetailRow icon="note-text-outline" label="Instructions" value={parcel.delivery_instructions} />
            <DetailRow icon="clock-start" label="Created" value={new Date(parcel.created_at).toLocaleString()} />
            {parcel.estimated_delivery_time && <DetailRow icon="timelapse" label="Est. Delivery" value={new Date(parcel.estimated_delivery_time).toLocaleString()} />}
            {parcel.actual_delivery_time && <DetailRow icon="check-circle-outline" label="Delivered At" value={new Date(parcel.actual_delivery_time).toLocaleString()} />}
        </View>

        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Sender & Receiver</Text>
            <ContactDetailRow 
              icon="account-arrow-right-outline" 
              name={parcel.sender_full_name} 
              phone={(parcel as any).sender_phone_number}
              type="Sender"
            />
            <DetailRow icon="map-marker-outline" label="From" value={formatAddress(parcel.pickup_address_id)} />
            
            <View style={styles.separator} />

            <ContactDetailRow 
              icon="account-arrow-left-outline" 
              name={parcel.receiver_full_name}
              phone={(parcel as any).receiver_phone_number}
              type="Receiver"
            />
            <DetailRow icon="map-marker-check-outline" label="To" value={formatAddress(parcel.dropoff_address_id)} />
        </View>
        
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tracking History</Text>
            {statusHistory.length > 0 ? statusHistory.map((item, index) => (
            <View key={item.id} style={styles.historyItemContainer}>
                <View style={styles.historyTimeline}>
                    {getStatusIcon(item.status)}
                    {index < statusHistory.length - 1 && <View style={[styles.historyTimelineLine, {backgroundColor: Colors.light.borderLight}]} />}
                </View>
                <View style={styles.historyItemContent}>
                    <Text style={styles.historyStatusText}>{getStatusDisplay(item.status)}</Text>
                    {item.address_text && <Text style={styles.historyDetailText}><MaterialCommunityIcons name="map-marker-outline" size={14} color={Colors.light.textSecondary} /> {item.address_text}</Text>}
                    {item.notes && <Text style={styles.historyDetailTextitalic}><MaterialCommunityIcons name="information-outline" size={14} color={Colors.light.textSecondary} /> Notes: {item.notes}</Text>}
                    <Text style={styles.historyDateText}><MaterialCommunityIcons name="clock-outline" size={14} color={Colors.light.textMuted} /> {new Date(item.created_at).toLocaleString()}</Text>
                </View>
            </View>
            )) : (
                <Text style={styles.noItemsText}>No tracking history available.</Text>
            )}
        </View>

      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundAlt,
  },
  scrollContentContainer: {
    paddingBottom: 20,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  errorText: {
    marginTop: 16,
    fontSize: 17,
    color: Colors.light.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  actionButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: Colors.light.background,
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 12,
    marginTop: 12,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  qrStatusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10, 
  },
  qrCodeWrapper: {
      marginRight: 16,
      padding: 8,
      backgroundColor: '#fff',
      borderRadius: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
  },
  statusSummary: {
      flex: 1,
      justifyContent: 'center',
  },
  trackingCodeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'center',
    elevation: 1,
  },
  statusBadgeText: {
    color: Colors.light.background,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2, 
    width: 24,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: 15,
    color: Colors.light.textSecondary,
    fontWeight: '600',
    width: 130,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'left',
  },
  linkValue: {
    color: Colors.light.primary,
    textDecorationLine: 'underline',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  historyItemContainer: {
    flexDirection: 'row',
    marginBottom: 0,
    alignItems: 'flex-start', 
  },
  historyTimeline: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 0,
    width: 24,
  },
  historyTimelineLine: {
    width: 2,
    flex: 1,
    minHeight: 30,
    backgroundColor: Colors.light.borderLight,
    marginVertical: -2,
    zIndex: -1,
  },
  historyItemContent: {
    flex: 1,
    paddingVertical: 8,
    paddingLeft: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  lastHistoryItemContent: {
    borderBottomWidth: 0,
  },
  historyStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.textHeader,
    marginBottom: 5,
  },
  historyDetailText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDetailTextitalic: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    fontStyle: 'italic',
    marginBottom: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDateText: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noItemsText: {
    textAlign: 'center',
    color: Colors.light.textSecondary,
    paddingVertical: 20,
    fontSize: 15,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  contactIcon: {
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  contactDetail: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIcon: {
    marginRight: 5,
  },
  phoneValue: {
    fontSize: 14,
    color: Colors.light.primary,
    textDecorationLine: 'underline',
  },
});

export default ParcelDetailScreen; 