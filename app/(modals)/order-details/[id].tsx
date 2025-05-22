import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { Text, Card, Button, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

type OrderDetails = {
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

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      Alert.alert('Error', 'Order ID is missing');
      router.back();
      return;
    }
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
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
      setOrder(data);
    } catch (error) {
      console.error('Error fetching order details:', error);
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
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
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Order not found</Text>
        <Button
          mode="contained"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Order #${order.tracking_code}`,
        }}
      />
      <ScrollView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.statusSection}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                <Text style={styles.statusText}>{order.status}</Text>
              </View>
              <Text style={styles.trackingCode}>#{order.tracking_code}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Package Information</Text>
              <Text style={styles.infoText}>Size: {order.package_size}</Text>
              <Text style={styles.infoText}>
                Created: {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
              </Text>
              {order.estimated_delivery_time && (
                <Text style={styles.infoText}>
                  Estimated Delivery: {format(new Date(order.estimated_delivery_time), 'MMM dd, yyyy HH:mm')}
                </Text>
              )}
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sender Details</Text>
              <Text style={styles.infoText}>Name: {order.sender_id?.[0]?.full_name || 'N/A'}</Text>
              <Text style={styles.infoText}>Phone: {order.sender_id?.[0]?.phone || 'N/A'}</Text>
              <Text style={styles.infoText}>Email: {order.sender_id?.[0]?.email || 'N/A'}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Receiver Details</Text>
              <Text style={styles.infoText}>Name: {order.receiver_id?.[0]?.full_name || 'N/A'}</Text>
              <Text style={styles.infoText}>Phone: {order.receiver_id?.[0]?.phone || 'N/A'}</Text>
              <Text style={styles.infoText}>Email: {order.receiver_id?.[0]?.email || 'N/A'}</Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Addresses</Text>
              <Text style={styles.addressTitle}>Pickup Address</Text>
              <Text style={styles.addressText}>
                {order.pickup_address_id?.[0]?.address_line1 || 'N/A'}
                {order.pickup_address_id?.[0]?.address_line2 && `\n${order.pickup_address_id[0].address_line2}`}
                {order.pickup_address_id?.[0]?.city && `\n${order.pickup_address_id[0].city}`}
                {order.pickup_address_id?.[0]?.postal_code && `\n${order.pickup_address_id[0].postal_code}`}
              </Text>

              <Text style={[styles.addressTitle, styles.marginTop]}>Dropoff Address</Text>
              <Text style={styles.addressText}>
                {order.dropoff_address_id?.[0]?.address_line1 || 'N/A'}
                {order.dropoff_address_id?.[0]?.address_line2 && `\n${order.dropoff_address_id[0].address_line2}`}
                {order.dropoff_address_id?.[0]?.city && `\n${order.dropoff_address_id[0].city}`}
                {order.dropoff_address_id?.[0]?.postal_code && `\n${order.dropoff_address_id[0].postal_code}`}
              </Text>
            </View>

            {order.special_instructions && (
              <>
                <Divider style={styles.divider} />
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Special Instructions</Text>
                  <Text style={styles.infoText}>{order.special_instructions}</Text>
                </View>
              </>
            )}

            <Divider style={styles.divider} />

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Information</Text>
              <Text style={styles.infoText}>Status: {order.payment_status}</Text>
              <Text style={styles.infoText}>Method: {order.payment_method}</Text>
              <Text style={styles.infoText}>Delivery Fee: ${order.delivery_fee.toFixed(2)}</Text>
              <Text style={styles.infoText}>Insurance Fee: ${order.insurance_fee.toFixed(2)}</Text>
              <Text style={[styles.infoText, styles.totalText]}>
                Total Amount: ${order.total_amount.toFixed(2)}
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 20,
  },
  backButton: {
    marginTop: 10,
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  trackingCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    marginVertical: 16,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  marginTop: {
    marginTop: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  totalText: {
    fontWeight: 'bold',
    color: '#f4511e',
    marginTop: 8,
  },
}); 