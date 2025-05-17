import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../services/supabase';
import Colors from '../../../constants/Colors'; // Assuming Colors.ts exists in constants
import { useAuth } from '../../context/AuthContext'; // Assuming AuthContext provides the user
import { FontAwesome5 } from '@expo/vector-icons'; // For icons

interface AddressInfo {
  city: string | null;
}

interface ProfileInfo {
  id: string;
  full_name: string | null;
}

interface Parcel {
  id: string;
  tracking_code: string | null;
  status: string | null;
  status_display?: string;
  package_size: string | null;
  created_at: string;
  estimated_delivery_time?: string | null;
  pickup_city?: string | null;
  dropoff_city?: string | null;
  sender_name?: string | null;
  receiver_name?: string | null;
  sender_id?: ProfileInfo | null; 
  receiver_id?: ProfileInfo | null;
  // Supabase specific raw relations before transformation
  pickup_address_id?: AddressInfo | null; 
  dropoff_address_id?: AddressInfo | null;
}

const MyOrdersScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

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
          pickup_address_id (city),
          dropoff_address_id (city),
          sender_id (id, full_name),
          receiver_id (id, full_name)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }
      
      if (data) {
        const transformedData: Parcel[] = data.map((item: any) => ({
          id: item.id,
          tracking_code: item.tracking_code,
          status: item.status,
          package_size: item.package_size,
          created_at: item.created_at,
          estimated_delivery_time: item.estimated_delivery_time,
          pickup_city: item.pickup_address_id?.city,
          dropoff_city: item.dropoff_address_id?.city,
          sender_name: item.sender_id?.full_name,
          receiver_name: item.receiver_id?.full_name,
          sender_id: item.sender_id as ProfileInfo | undefined,
          receiver_id: item.receiver_id as ProfileInfo | undefined,
          status_display: item.status?.replace('_', ' ').split(' ')
                           .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                           .join(' ') || 'N/A',
        }));
        setOrders(transformedData);
      }
    } catch (err) {
      console.error('Fetch orders failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchOrders();
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [user]);

  const navigateToDetails = (parcelId: string) => {
    router.push(`/orders/${parcelId}`);
  };

  const getStatusColor = (status: string | null | undefined) => {
    if (!status) return Colors.light.textSecondary; // Fallback to textSecondary for undefined status color
    const s = status.toLowerCase();
    if (s === 'delivered') return Colors.light.success;
    if (s === 'canceled' || s === 'failed_delivery') return Colors.light.error;
    if (s === 'in_transit' || s === 'out_for_delivery') return Colors.light.primary;
    if (s === 'created' || s === 'pending_pickup') return Colors.light.warning;
    return Colors.light.textSecondary;
  };
  
  const getStatusIcon = (status: string | null | undefined) => {
    if (!status) return "question-circle";
    const s = status.toLowerCase();
    if (s === 'delivered') return "check-circle";
    if (s === 'canceled') return "times-circle";
    if (s === 'failed_delivery') return "exclamation-circle";
    if (s === 'in_transit') return "shipping-fast";
    if (s === 'out_for_delivery') return "truck";
    if (s === 'created') return "box-open";
    if (s === 'pending_pickup') return "hourglass-start";
    return "info-circle";
  };

  const renderOrderItem = ({ item }: { item: Parcel }) => (
    <TouchableOpacity style={styles.orderItem} onPress={() => navigateToDetails(item.id)}>
      <View style={styles.itemHeader}>
        <Text style={styles.trackingCode}>{item.tracking_code || 'N/A'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
           <FontAwesome5 name={getStatusIcon(item.status)} size={12} color="white" style={{marginRight: 5}} />
          <Text style={styles.statusText}>{item.status_display || 'N/A'}</Text>
        </View>
      </View>
      <View style={styles.itemBody}>
        <View style={styles.addressRow}>
            <FontAwesome5 name="box" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.detailText}>Size: {item.package_size || 'N/A'}</Text>
        </View>
        <View style={styles.addressRow}>
            <FontAwesome5 name="calendar-alt" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.detailText}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        {item.estimated_delivery_time && (
            <View style={styles.addressRow}>
                <FontAwesome5 name="clock" size={14} color={Colors.light.textSecondary} />
                <Text style={styles.detailText}>Est. Delivery: {new Date(item.estimated_delivery_time).toLocaleDateString()}</Text>
            </View>
        )}
         <View style={styles.addressRow}>
            <FontAwesome5 name="user-friends" size={14} color={Colors.light.textSecondary} />
            <Text style={styles.detailText}>
              {item.sender_id?.id === user?.id ? `To: ${item.receiver_name || 'N/A'}` : `From: ${item.sender_name || 'N/A'}`}
            </Text>
        </View>
      </View>
      <View style={styles.itemFooter}>
        <Text style={styles.footerText}>Tap to see details & QR Code</Text>
        <FontAwesome5 name="chevron-right" size={14} color={Colors.light.primary} />
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text>Loading your orders...</Text>
      </View>
    );
  }

  if (!orders.length && !loading) {
    return (
      <View style={styles.centered}>
        <FontAwesome5 name="search" size={48} color={Colors.light.textSecondary} /> 
        <Text style={styles.emptyText}>You don't have any orders yet.</Text>
        <TouchableOpacity style={styles.createOrderButton} onPress={() => router.push('/(tabs)/home')}>
             <Text style={styles.createOrderButtonText}>Create New Order</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.light.primary]} tintColor={Colors.light.primary}/>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
     backgroundColor: Colors.light.background,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  createOrderButton: {
    marginTop: 20,
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createOrderButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContentContainer: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: Colors.light.borderLight || '#e0e0e0', 
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight || '#e0e0e0', 
  },
  trackingCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  itemBody: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginLeft: 8,
    flexShrink: 1, 
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight || '#e0e0e0', 
  },
  footerText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontStyle: 'italic',
  }
});

export default MyOrdersScreen; 