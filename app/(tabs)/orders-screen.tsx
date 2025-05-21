import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useTheme, Text, Card, Chip, Divider, FAB, Menu, Button, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

type OrderStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';
type OrderType = 'all' | 'sent' | 'received';
type SortOption = 'newest' | 'oldest' | 'price_high' | 'price_low';

interface Address {
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
}

interface Order {
  id: string;
  tracking_number: string;
  status: OrderStatus;
  created_at: string;
  pickup_address: string;
  delivery_address: string;
  recipient_name: string;
  sender_name: string;
  estimated_delivery: string;
  price: number;
  sender_id: string;
  recipient_id?: string;
  package_details: {
    weight: number;
    dimensions: string;
    type: string;
    special_instructions?: string;
  };
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method?: string;
}

interface DatabaseOrder {
  id: string;
  tracking_code: string;
  status: OrderStatus;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  estimated_delivery_time: string;
  estimated_price: number;
  actual_price: number;
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method_id: string;
  weight: number;
  dimensions: string;
  package_size: string;
  package_description: string;
  pickup_contact: string;
  dropoff_contact: string;
  delivery_instructions: string;
  pickup_address_id: {
    address_line: string;
    city: string;
    state: string;
    postal_code: string;
  }[] | null;
  dropoff_address_id: {
    address_line: string;
    city: string;
    state: string;
    postal_code: string;
  }[] | null;
}

export default function OrdersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [menuVisible, setMenuVisible] = useState(false);

  const statusColors = {
    pending: theme.colors.tertiary,
    in_transit: theme.colors.primary,
    delivered: theme.colors.secondary,
    cancelled: theme.colors.error,
  };

  const fetchOrders = async () => {
    try {
      // First get the orders from parcels_with_addresses view
      const { data: viewData, error: viewError } = await supabase
        .from('parcels_with_addresses')
        .select(`
          id,
          tracking_code,
          status,
          status_display,
          created_at,
          updated_at,
          sender_id,
          package_size,
          weight,
          is_fragile,
          pickup_address,
          pickup_city,
          pickup_business_name,
          pickup_partner_color,
          dropoff_address,
          dropoff_city,
          dropoff_business_name,
          dropoff_partner_color
        `)
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });

      if (viewError) {
        console.error('Error loading orders from view:', viewError);
        throw viewError;
      }

      if (!viewData || viewData.length === 0) {
        console.log('No orders found for user:', user?.id);
        setOrders([]);
        setFilteredOrders([]);
        return;
      }

      // Get the IDs of the orders from the view
      const orderIds = viewData.map(order => order.id);

      // Fetch price information from the parcels table
      const { data: priceData, error: priceError } = await supabase
        .from('parcels')
        .select(`
          id,
          estimated_price,
          actual_price,
          payment_status,
          payment_method_id
        `)
        .in('id', orderIds);

      if (priceError) {
        console.error('Error loading price information:', priceError);
        throw priceError;
      }

      // Create a map of price information by order ID
      const priceMap = new Map(
        (priceData || []).map(price => [
          price.id,
          {
            estimated_price: price.estimated_price,
            actual_price: price.actual_price,
            payment_status: price.payment_status,
            payment_method_id: price.payment_method_id
          }
        ])
      );

      // Combine the data
      const viewOrders = viewData.map(order => {
        const priceInfo = priceMap.get(order.id);
        return {
          id: order.id,
          tracking_number: order.tracking_code || 'N/A',
          status: order.status || 'pending',
          created_at: order.created_at || new Date().toISOString(),
          pickup_address: `${order.pickup_address}, ${order.pickup_city}`,
          delivery_address: `${order.dropoff_address}, ${order.dropoff_city}`,
          recipient_name: order.dropoff_business_name || 'N/A',
          sender_name: order.pickup_business_name || 'N/A',
          estimated_delivery: 'N/A', // Not available in the view
          price: priceInfo?.actual_price || priceInfo?.estimated_price || 0,
          sender_id: order.sender_id,
          recipient_id: undefined, // Not available in the view
          package_details: {
            weight: order.weight || 0,
            dimensions: 'N/A', // Not available in the view
            type: order.package_size || 'standard',
            special_instructions: order.is_fragile ? 'Fragile package' : undefined
          },
          payment_status: (priceInfo?.payment_status || 'pending') as 'pending' | 'paid' | 'failed',
          payment_method: priceInfo?.payment_method_id
        };
      });
      
      setOrders(viewOrders);
      applyFiltersAndSort(viewOrders, searchQuery, orderType, sortBy);
    } catch (error) {
      console.error('Error fetching orders:', error);
      
      // Fallback to fetching from the parcels table directly
      console.log('Falling back to fetching from parcels table');
      
      const { data: basicOrders, error: basicError } = await supabase
        .from('parcels')
        .select(`
          id,
          tracking_code,
          status,
          created_at,
          sender_id,
          receiver_id,
          estimated_delivery_time,
          estimated_price,
          actual_price,
          payment_status,
          payment_method_id,
          weight,
          dimensions,
          package_size,
          package_description,
          pickup_contact,
          dropoff_contact,
          delivery_instructions,
          pickup_address_id (
            address_line,
            city,
            state,
            postal_code
          ),
          dropoff_address_id (
            address_line,
            city,
            state,
            postal_code
          )
        `)
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (basicError) throw basicError;
      
      const basicViewOrders = (basicOrders || []).map(order => ({
        id: order.id,
        tracking_number: order.tracking_code || 'N/A',
        status: order.status || 'pending',
        created_at: order.created_at || new Date().toISOString(),
        pickup_address: order.pickup_address_id?.[0]?.address_line || 'N/A',
        delivery_address: order.dropoff_address_id?.[0]?.address_line || 'N/A',
        recipient_name: order.dropoff_contact || 'N/A',
        sender_name: order.pickup_contact || 'N/A',
        estimated_delivery: order.estimated_delivery_time || 'N/A',
        price: order.actual_price || order.estimated_price || 0,
        sender_id: order.sender_id,
        recipient_id: order.receiver_id,
        package_details: {
          weight: order.weight || 0,
          dimensions: order.dimensions || 'N/A',
          type: order.package_size || 'standard',
          special_instructions: order.delivery_instructions
        },
        payment_status: (order.payment_status || 'pending') as 'pending' | 'paid' | 'failed',
        payment_method: order.payment_method_id
      }));
      
      setOrders(basicViewOrders);
      applyFiltersAndSort(basicViewOrders, searchQuery, orderType, sortBy);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFiltersAndSort = (
    ordersToFilter: Order[],
    query: string,
    type: OrderType,
    sort: SortOption
  ) => {
    let filtered = [...ordersToFilter];

    // Apply search filter
    if (query) {
      filtered = filtered.filter(order => 
        order.tracking_number.toLowerCase().includes(query.toLowerCase()) ||
        order.recipient_name.toLowerCase().includes(query.toLowerCase()) ||
        order.sender_name.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply type filter
    if (type !== 'all') {
      filtered = filtered.filter(order => 
        type === 'sent' ? order.sender_id === user?.id : order.recipient_id === user?.id
      );
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
    }

    setFilteredOrders(filtered);
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort(orders, searchQuery, orderType, sortBy);
  }, [searchQuery, orderType, sortBy]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const renderOrderCard = ({ item }: { item: Order }) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/order-details/${item.id}`)}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.trackingInfo}>
            <Text variant="titleMedium">#{item.tracking_number}</Text>
            <Chip
              mode="flat"
              style={[styles.statusChip, { backgroundColor: statusColors[item.status] }]}
            >
              {item.status.replace('_', ' ')}
            </Chip>
          </View>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.addressContainer}>
          <View style={styles.addressRow}>
            <MaterialCommunityIcons
              name="arrow-up-circle"
              size={20}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={styles.addressText}>
              {item.pickup_address}
            </Text>
          </View>
          <View style={styles.addressRow}>
            <MaterialCommunityIcons
              name="arrow-down-circle"
              size={20}
              color={theme.colors.error}
            />
            <Text variant="bodyMedium" style={styles.addressText}>
              {item.delivery_address}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text variant="bodySmall">
            {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
          </Text>
          <Text variant="titleMedium" style={styles.price}>
            ETB {(item.price || 0).toFixed(2)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterContainer}>
        <Searchbar
          placeholder="Search orders..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        <View style={styles.filterButtons}>
          <Button
            mode={orderType === 'all' ? 'contained' : 'outlined'}
            onPress={() => setOrderType('all')}
            style={styles.filterButton}
          >
            All
          </Button>
          <Button
            mode={orderType === 'sent' ? 'contained' : 'outlined'}
            onPress={() => setOrderType('sent')}
            style={styles.filterButton}
          >
            Sent
          </Button>
          <Button
            mode={orderType === 'received' ? 'contained' : 'outlined'}
            onPress={() => setOrderType('received')}
            style={styles.filterButton}
          >
            Received
          </Button>
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              style={styles.sortButton}
            >
              Sort: {sortBy.replace('_', ' ')}
            </Button>
          }
        >
          <Menu.Item onPress={() => { setSortBy('newest'); setMenuVisible(false); }} title="Newest First" />
          <Menu.Item onPress={() => { setSortBy('oldest'); setMenuVisible(false); }} title="Oldest First" />
          <Menu.Item onPress={() => { setSortBy('price_high'); setMenuVisible(false); }} title="Price: High to Low" />
          <Menu.Item onPress={() => { setSortBy('price_low'); setMenuVisible(false); }} title="Price: Low to High" />
        </Menu>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderCard}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="package-variant"
              size={64}
              color={theme.colors.outline}
            />
            <Text variant="titleMedium" style={[styles.emptyText, { color: theme.colors.outline }]}>
              No orders found
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/create-order')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    padding: 16,
    gap: 8,
  },
  searchBar: {
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
  },
  sortButton: {
    marginTop: 8,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginLeft: 8,
  },
  divider: {
    marginVertical: 12,
  },
  addressContainer: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressText: {
    marginLeft: 8,
    flex: 1,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
  },
}); 