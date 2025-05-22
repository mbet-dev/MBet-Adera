import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../lib/supabase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { format } from 'date-fns';

type Order = {
  id: string;
  tracking_code: string;
  status: string;
  package_size: string;
  created_at: string;
  estimated_delivery_time: string | null;
  pickup_city: string | null;
  dropoff_city: string | null;
  sender_name: string | null;
  receiver_name: string | null;
  pickup_address_id: {
    city: string | null;
  } | null;
  dropoff_address_id: {
    city: string | null;
  } | null;
  sender_id: {
    full_name: string | null;
  } | null;
  receiver_id: {
    full_name: string | null;
  } | null;
};

type FilterOptions = {
  status: string[];
  packageSize: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
};

const ITEMS_PER_PAGE = 10;

export default function OrdersScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: [],
    packageSize: [],
    dateRange: { start: null, end: null },
    searchQuery: '',
  });
  const [sortBy, setSortBy] = useState<'created_at' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchOrders = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setPage(0);
        setOrders([]);
      }

      let query = supabase
        .from('parcels')
        .select(`
          id,
          tracking_code,
          status,
          package_size,
          created_at,
          estimated_delivery_time,
          pickup_address_id (
            city
          ),
          dropoff_address_id (
            city
          ),
          sender_id (
            full_name
          ),
          receiver_id (
            full_name
          )
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

      // Apply filters
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.packageSize.length > 0) {
        query = query.in('package_size', filters.packageSize);
      }
      if (filters.dateRange.start) {
        query = query.gte('created_at', filters.dateRange.start.toISOString());
      }
      if (filters.dateRange.end) {
        query = query.lte('created_at', filters.dateRange.end.toISOString());
      }
      if (filters.searchQuery) {
        query = query.or(`tracking_code.ilike.%${filters.searchQuery}%,sender_id.full_name.ilike.%${filters.searchQuery}%,receiver_id.full_name.ilike.%${filters.searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const transformedData = data.map((item: any) => ({
        ...item,
        pickup_city: item.pickup_address_id?.city,
        dropoff_city: item.dropoff_address_id?.city,
        sender_name: item.sender_id?.full_name,
        receiver_name: item.receiver_id?.full_name,
      }));

      setOrders(prev => refresh ? transformedData : [...prev, ...transformedData]);
      setHasMore(transformedData.length === ITEMS_PER_PAGE);
      setLoading(false);
      setRefreshing(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, filters, sortBy, sortOrder]);

  useEffect(() => {
    fetchOrders(true);
  }, [filters, sortBy, sortOrder]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders(true);
  }, [fetchOrders]);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchOrders();
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderItem}
      onPress={() => navigation.navigate('ParcelDetails', { parcelId: item.id })}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.trackingCode}>#{item.tracking_code}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Icon name="package-variant" size={20} color="#666" />
          <Text style={styles.detailText}>{item.package_size}</Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="account" size={20} color="#666" />
          <Text style={styles.detailText}>
            From: {item.sender_name || 'N/A'} → To: {item.receiver_name || 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="map-marker" size={20} color="#666" />
          <Text style={styles.detailText}>
            {item.pickup_city || 'N/A'} → {item.dropoff_city || 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="clock-outline" size={20} color="#666" />
          <Text style={styles.detailText}>
            Created: {format(new Date(item.created_at), 'MMM dd, yyyy HH:mm')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': '#FFA500',
      'in_transit': '#1E90FF',
      'delivered': '#32CD32',
      'cancelled': '#FF0000',
    };
    return colors[status] || '#666';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Icon name="filter-variant" size={24} color="#f4511e" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>

        <View style={styles.sortButtons}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'created_at' && styles.activeSortButton]}
            onPress={() => {
              setSortBy('created_at');
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
          >
            <Icon name="clock-outline" size={20} color={sortBy === 'created_at' ? '#fff' : '#666'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === 'status' && styles.activeSortButton]}
            onPress={() => {
              setSortBy('status');
              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
            }}
          >
            <Icon name="sort" size={20} color={sortBy === 'status' ? '#fff' : '#666'} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Icon name="package-variant" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No orders found</Text>
            </View>
          ) : null
        }
      />

      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Orders</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterOptions}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              {['pending', 'in_transit', 'delivered', 'cancelled'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={styles.filterOption}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      status: prev.status.includes(status)
                        ? prev.status.filter(s => s !== status)
                        : [...prev.status, status],
                    }));
                  }}
                >
                  <Icon
                    name={filters.status.includes(status) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color="#f4511e"
                  />
                  <Text style={styles.filterOptionText}>{status}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.filterSectionTitle}>Package Size</Text>
              {['small', 'medium', 'large'].map(size => (
                <TouchableOpacity
                  key={size}
                  style={styles.filterOption}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      packageSize: prev.packageSize.includes(size)
                        ? prev.packageSize.filter(s => s !== size)
                        : [...prev.packageSize, size],
                    }));
                  }}
                >
                  <Icon
                    name={filters.packageSize.includes(size) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color="#f4511e"
                  />
                  <Text style={styles.filterOptionText}>{size}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.filterSectionTitle}>Search</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by tracking code or name..."
                value={filters.searchQuery}
                onChangeText={text => setFilters(prev => ({ ...prev, searchQuery: text }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setFilters({
                    status: [],
                    packageSize: [],
                    dateRange: { start: null, end: null },
                    searchQuery: '',
                  });
                }}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setFilterModalVisible(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f4511e" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  filterButtonText: {
    marginLeft: 8,
    color: '#f4511e',
    fontSize: 16,
  },
  sortButtons: {
    flexDirection: 'row',
  },
  sortButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  activeSortButton: {
    backgroundColor: '#f4511e',
  },
  list: {
    padding: 16,
  },
  orderItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
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
  },
  orderDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 8,
    color: '#666',
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterOptions: {
    maxHeight: '70%',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterOptionText: {
    marginLeft: 8,
    color: '#666',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  clearButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f4511e',
  },
  clearButtonText: {
    color: '#f4511e',
  },
  applyButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f4511e',
  },
  applyButtonText: {
    color: '#fff',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
}); 