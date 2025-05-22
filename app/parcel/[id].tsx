import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

type ParcelDetails = {
  id: string;
  tracking_code: string;
  status: string;
  package_size: string;
  created_at: string;
  estimated_delivery_time: string | null;
  pickup_address_id: {
    city: string | null;
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
  }[] | null;
  dropoff_address_id: {
    city: string | null;
    address_line1: string | null;
    address_line2: string | null;
    postal_code: string | null;
  }[] | null;
  sender_id: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  }[] | null;
  receiver_id: {
    full_name: string | null;
    phone: string | null;
    email: string | null;
  }[] | null;
  special_instructions: string | null;
  payment_status: string;
  payment_method: string;
  delivery_fee: number;
  insurance_fee: number;
  total_amount: number;
};

export default function ParcelDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [parcel, setParcel] = useState<ParcelDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Parcel ID is missing');
      router.back();
      return;
    }
    fetchParcelDetails();
  }, [id]);

  const fetchParcelDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('parcels')
        .select(`
          id,
          tracking_code,
          status,
          package_size,
          created_at,
          estimated_delivery_time,
          special_instructions,
          payment_status,
          payment_method,
          delivery_fee,
          insurance_fee,
          total_amount,
          pickup_address_id (
            city,
            address_line1,
            address_line2,
            postal_code
          ),
          dropoff_address_id (
            city,
            address_line1,
            address_line2,
            postal_code
          ),
          sender_id (
            full_name,
            phone,
            email
          ),
          receiver_id (
            full_name,
            phone,
            email
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setParcel(data);
    } catch (error) {
      console.error('Error fetching parcel details:', error);
      Alert.alert('Error', 'Failed to load parcel details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!parcel) return;

    try {
      await Share.share({
        message: `Track your parcel #${parcel.tracking_code} on MBet-Adera`,
        url: `https://mbet-adera.com/track/${parcel.tracking_code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': '#FFA500',
      'in_transit': '#1E90FF',
      'delivered': '#32CD32',
      'cancelled': '#FF0000',
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f4511e" />
      </View>
    );
  }

  if (!parcel) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={48} color="#666" />
        <Text style={styles.errorText}>Parcel not found</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Parcel #${parcel.tracking_code}`,
          headerRight: () => (
            <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
              <Icon name="share-variant" size={24} color="#f4511e" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(parcel.status) }]}>
            <Text style={styles.statusText}>{parcel.status}</Text>
          </View>
          <Text style={styles.trackingCode}>#{parcel.tracking_code}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Information</Text>
          <View style={styles.infoRow}>
            <Icon name="package-variant" size={20} color="#666" />
            <Text style={styles.infoText}>Size: {parcel.package_size}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="clock-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              Created: {format(new Date(parcel.created_at), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>
          {parcel.estimated_delivery_time && (
            <View style={styles.infoRow}>
              <Icon name="truck-delivery" size={20} color="#666" />
              <Text style={styles.infoText}>
                Estimated Delivery: {format(new Date(parcel.estimated_delivery_time), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sender Details</Text>
          <View style={styles.infoRow}>
            <Icon name="account" size={20} color="#666" />
            <Text style={styles.infoText}>{parcel.sender_id?.[0]?.full_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone" size={20} color="#666" />
            <Text style={styles.infoText}>{parcel.sender_id?.[0]?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="email" size={20} color="#666" />
            <Text style={styles.infoText}>{parcel.sender_id?.[0]?.email || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receiver Details</Text>
          <View style={styles.infoRow}>
            <Icon name="account" size={20} color="#666" />
            <Text style={styles.infoText}>{parcel.receiver_id?.[0]?.full_name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="phone" size={20} color="#666" />
            <Text style={styles.infoText}>{parcel.receiver_id?.[0]?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="email" size={20} color="#666" />
            <Text style={styles.infoText}>{parcel.receiver_id?.[0]?.email || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Addresses</Text>
          <View style={styles.addressContainer}>
            <Text style={styles.addressTitle}>Pickup Address</Text>
            <Text style={styles.addressText}>
              {parcel.pickup_address_id?.[0]?.address_line1 || 'N/A'}
              {parcel.pickup_address_id?.[0]?.address_line2 && `\n${parcel.pickup_address_id[0].address_line2}`}
              {parcel.pickup_address_id?.[0]?.city && `\n${parcel.pickup_address_id[0].city}`}
              {parcel.pickup_address_id?.[0]?.postal_code && `\n${parcel.pickup_address_id[0].postal_code}`}
            </Text>
          </View>
          <View style={styles.addressContainer}>
            <Text style={styles.addressTitle}>Dropoff Address</Text>
            <Text style={styles.addressText}>
              {parcel.dropoff_address_id?.[0]?.address_line1 || 'N/A'}
              {parcel.dropoff_address_id?.[0]?.address_line2 && `\n${parcel.dropoff_address_id[0].address_line2}`}
              {parcel.dropoff_address_id?.[0]?.city && `\n${parcel.dropoff_address_id[0].city}`}
              {parcel.dropoff_address_id?.[0]?.postal_code && `\n${parcel.dropoff_address_id[0].postal_code}`}
            </Text>
          </View>
        </View>

        {parcel.special_instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <Text style={styles.instructionsText}>{parcel.special_instructions}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          <View style={styles.infoRow}>
            <Icon name="cash" size={20} color="#666" />
            <Text style={styles.infoText}>Status: {parcel.payment_status}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="credit-card" size={20} color="#666" />
            <Text style={styles.infoText}>Method: {parcel.payment_method}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="truck" size={20} color="#666" />
            <Text style={styles.infoText}>Delivery Fee: ${parcel.delivery_fee.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="shield-check" size={20} color="#666" />
            <Text style={styles.infoText}>Insurance Fee: ${parcel.insurance_fee.toFixed(2)}</Text>
          </View>
          <View style={[styles.infoRow, styles.totalRow]}>
            <Icon name="cash-multiple" size={20} color="#f4511e" />
            <Text style={[styles.infoText, styles.totalText]}>
              Total Amount: ${parcel.total_amount.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#f4511e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  shareButton: {
    padding: 10,
  },
  statusSection: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  trackingCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#666',
  },
  addressContainer: {
    marginBottom: 20,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  addressText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  instructionsText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  totalRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  totalText: {
    fontWeight: 'bold',
    color: '#f4511e',
  },
}); 