import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  Dimensions,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { parcelService } from '@/services/parcelService';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Menu,
  Searchbar,
  SegmentedButtons,
  Surface,
} from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { formatDate, formatCurrency } from '@/utils/formatting';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');

// Define filter options
const FILTER_OPTIONS = [
  { value: 'all', label: 'All', icon: 'package-variant' },
  { value: 'active', label: 'Active', icon: 'truck-delivery' },
  { value: 'delivered', label: 'Delivered', icon: 'check-circle' },
  { value: 'cancelled', label: 'Cancelled', icon: 'cancel' },
];

// Define sort options
const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Newest first', icon: 'sort-calendar-descending' },
  { value: 'created_asc', label: 'Oldest first', icon: 'sort-calendar-ascending' },
  { value: 'price_desc', label: 'Price (high to low)', icon: 'sort-numeric-descending' },
  { value: 'price_asc', label: 'Price (low to high)', icon: 'sort-numeric-ascending' },
];

// Status configuration including emojis and detailed descriptions
const STATUS_CONFIG = {
  pending: {
    label: 'Pending Pickup',
    icon: 'timer-sand',
    emoji: '⏳',
    color: '#FFA000',
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
    description: 'Your parcel is waiting to be picked up',
  },
  confirmed: {
    label: 'Confirmed',
    icon: 'check-circle-outline',
    emoji: '✅',
    color: '#7B1FA2',
    backgroundColor: 'rgba(123, 31, 162, 0.1)',
    description: 'Your delivery has been confirmed',
  },
  picked_up: {
    label: 'Picked Up',
    icon: 'package-up',
    emoji: '📦',
    color: '#1976D2',
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    description: 'Your parcel has been picked up',
  },
  in_transit: {
    label: 'In Transit',
    icon: 'truck-fast',
    emoji: '🚚',
    color: '#0097A7',
    backgroundColor: 'rgba(0, 151, 167, 0.1)',
    description: 'Your parcel is on the way',
  },
  delivered: {
    label: 'Delivered',
    icon: 'check-all',
    emoji: '🎉',
    color: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    description: 'Your parcel has been delivered',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'close-circle',
    emoji: '❌',
    color: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    description: 'This delivery was cancelled',
  },
};

// Main component for the enhanced orders screen
export default function EnhancedOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filter, setFilter] = useState('all');
  const [sortOption, setSortOption] = useState('created_desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Parcel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [orderStatistics, setOrderStatistics] = useState({
    active: 0,
    delivered: 0,
    cancelled: 0,
    total: 0,
  });
  
  const ITEMS_PER_PAGE = 10;
  const scrollY = new Animated.Value(0);

  // Calculate header opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Function to fetch order statistics
  const fetchOrderStatistics = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching order statistics for user:', user.id);
      // Use the optimized getParcelStatistics function
      const stats = await parcelService.getParcelStatistics(user.id);
      console.log('Order statistics received:', stats);
      setOrderStatistics(stats);
    } catch (error) {
      console.error('Error fetching order statistics:', error);
    }
  };

  // Function to fetch parcels with pagination and filtering
  const fetchParcels = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Map filter to actual status values
      let status = null;
      if (filter === 'active') {
        // Use the API's ability to fetch parcels with these statuses
        status = 'active'; // This should be handled on the backend to include confirmed, picked_up, in_transit
      } else if (filter !== 'all') {
        status = filter;
      }
      
      // Extract sort direction and field
      const [sortField, sortDirection] = sortOption.split('_');
      
      const { parcels: fetchedParcels, totalCount } = await parcelService.getPaginatedParcels(
        user.id, 
        {
          status,
          limit: ITEMS_PER_PAGE,
          page: currentPage,
          sortBy: sortField,
          sortDirection,
        }
      );
      
      setParcels(fetchedParcels);
      setTotalCount(totalCount);
      
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter, currentPage, sortOption]);

  // Use effect to fetch parcels on component mount and when dependencies change
  useEffect(() => {
    if (user) {
      fetchParcels();
    }
  }, [fetchParcels]);

  // Separate useEffect to fetch order statistics only once on component mount
  useEffect(() => {
    if (user) {
      console.log('Initial fetch of order statistics');
      fetchOrderStatistics();
    }
  }, [user]);

  // Handle search query changes
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      // This could be replaced with a dedicated search API endpoint
      const { parcels: allParcels } = await parcelService.getPaginatedParcels(
        user?.id || '', 
        { limit: 100 }
      );
      
      // Filter parcels locally based on the search query
      const results = allParcels.filter(parcel => 
        parcel.tracking_code?.toLowerCase().includes(query.toLowerCase()) ||
        parcel.package_description?.toLowerCase().includes(query.toLowerCase()) ||
        parcel.pickup_address?.address_line?.toLowerCase().includes(query.toLowerCase()) ||
        parcel.dropoff_address?.address_line?.toLowerCase().includes(query.toLowerCase())
      );
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching parcels:', error);
    }
  };

  // Handle refresh action
  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(0);
    await fetchParcels();
    await fetchOrderStatistics();
    setRefreshing(false);
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setFilter(value);
    setCurrentPage(0);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Function to render each parcel card
  const renderParcelCard = ({ item }: { item: Parcel }) => {
    const status = STATUS_CONFIG[item.status as ParcelStatus] || STATUS_CONFIG.pending;
    
    return (
      <Card 
        style={styles.parcelCard}
        mode="elevated"
        onPress={() => router.push(`/orders/${item.id}` as any)}
      >
        <Card.Title
          title={`Tracking #${item.tracking_code}`}
          subtitle={formatDate(item.created_at)}
          left={(props) => (
            <Avatar.Icon 
              {...props} 
              icon={status.icon} 
              style={{ backgroundColor: status.backgroundColor }} 
              color={status.color}
            />
          )}
          right={(props) => (
            <IconButton
              {...props}
              icon="chevron-right"
              onPress={() => router.push(`/orders/${item.id}` as any)}
            />
          )}
        />
        
        <Card.Content>
          <View style={styles.locationRow}>
            <MaterialIcons name="my-location" size={18} color="#666" style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickup_address?.address_line || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={18} color="#666" style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.dropoff_address?.address_line || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.detailsRow}>
            {item.package_size && (
              <Chip 
                icon="package-variant" 
                style={styles.detailChip}
                textStyle={styles.detailChipText}
              >
                {item.package_size.charAt(0).toUpperCase() + item.package_size.slice(1)}
              </Chip>
            )}
            
            {item.is_fragile && (
              <Chip 
                icon="alert" 
                style={styles.detailChip}
                textStyle={styles.detailChipText}
              >
                Fragile
              </Chip>
            )}
            
            {item.estimated_price && (
              <Chip 
                icon="cash" 
                style={styles.detailChip}
                textStyle={styles.detailChipText}
              >
                {formatCurrency(item.estimated_price)}
              </Chip>
            )}
          </View>
          
          <View style={[styles.statusContainer, { backgroundColor: status.backgroundColor }]}>
            <MaterialCommunityIcons name={status.icon as any} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.emoji} {status.label} - {status.description}
            </Text>
          </View>
        </Card.Content>
        
        <Card.Actions>
          <Button 
            mode="text"
            onPress={() => router.push(`/orders/${item.id}` as any)}
          >
            View Details
          </Button>
          
          {item.status !== 'delivered' && item.status !== 'cancelled' && (
            <Button 
              mode="text"
              onPress={() => {/* Handle track */}}
              icon="map-marker-path"
            >
              Track
            </Button>
          )}
          
          {item.status === 'pending' && (
            <Button 
              mode="text"
              onPress={() => {/* Handle cancel */}}
              icon="close-circle"
              textColor="#F44336"
            >
              Cancel
            </Button>
          )}
        </Card.Actions>
      </Card>
    );
  };

  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  
  // Function to render pagination controls
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <Button
          mode="outlined"
          disabled={currentPage === 0}
          onPress={() => handlePageChange(currentPage - 1)}
          icon="chevron-left"
          style={styles.paginationButton}
        >
          Prev
        </Button>
        
        <Text style={styles.paginationText}>
          Page {currentPage + 1} of {totalPages}
        </Text>
        
        <Button
          mode="outlined"
          disabled={currentPage >= totalPages - 1}
          onPress={() => handlePageChange(currentPage + 1)}
          icon="chevron-right"
          contentStyle={{ flexDirection: 'row-reverse' }}
          style={styles.paginationButton}
        >
          Next
        </Button>
      </View>
    );
  };

  // Function to render statistics cards
  const renderStatisticsCards = () => (
    <Animated.View style={[styles.statisticsContainer, { opacity: headerOpacity }]}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScrollView}>
        <Surface style={[styles.statCard, { backgroundColor: '#E1F5FE' }]}>
          <MaterialCommunityIcons name="truck-delivery" size={24} color="#0288D1" />
          <Text style={styles.statValue}>{orderStatistics.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </Surface>
        
        <Surface style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
          <MaterialCommunityIcons name="check-all" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{orderStatistics.delivered}</Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </Surface>
        
        <Surface style={[styles.statCard, { backgroundColor: '#FFEBEE' }]}>
          <MaterialCommunityIcons name="close-circle" size={24} color="#F44336" />
          <Text style={styles.statValue}>{orderStatistics.cancelled}</Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </Surface>
        
        <Surface style={[styles.statCard, { backgroundColor: '#E0E0E0' }]}>
          <MaterialCommunityIcons name="package-variant" size={24} color="#616161" />
          <Text style={styles.statValue}>{orderStatistics.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Surface>
      </ScrollView>
    </Animated.View>
  );

  // Main render function
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <Surface style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        
        <View style={styles.headerActions}>
          <IconButton
            icon="magnify"
            mode="contained-tonal"
            size={20}
            onPress={() => setIsSearching(true)}
          />
          
          <Menu
            visible={showSortMenu}
            onDismiss={() => setShowSortMenu(false)}
            anchor={
              <IconButton
                icon="sort"
                mode="contained-tonal"
                size={20}
                onPress={() => setShowSortMenu(true)}
              />
            }
          >
            {SORT_OPTIONS.map(option => (
              <Menu.Item
                key={option.value}
                title={option.label}
                leadingIcon={option.icon}
                onPress={() => {
                  setSortOption(option.value);
                  setShowSortMenu(false);
                }}
                trailingIcon={sortOption === option.value ? 'check' : undefined}
              />
            ))}
          </Menu>
        </View>
      </Surface>
      
      {/* Search bar */}
      {isSearching && (
        <Searchbar
          placeholder="Search by tracking #, address or description"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          onIconPress={() => {
            setSearchQuery('');
            setIsSearching(false);
            setSearchResults([]);
          }}
          icon={searchQuery ? 'close' : 'magnify'}
        />
      )}
      
      {/* Filter buttons */}
      <Surface style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={handleFilterChange}
          buttons={FILTER_OPTIONS.map(option => ({
            value: option.value,
            label: option.label,
            icon: option.icon,
          }))}
          style={styles.segmentedButtons}
        />
      </Surface>
      
      {/* Order statistics */}
      {renderStatisticsCards()}
      
      {/* Loading indicator */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      ) : (
        <>
          {/* Parcel list */}
          {isSearching && searchQuery ? (
            <FlatList
              data={searchResults}
              renderItem={renderParcelCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="magnify-close" size={64} color="#BDBDBD" />
                  <Text style={styles.emptyText}>No results found for "{searchQuery}"</Text>
                </View>
              }
            />
          ) : (
            <Animated.FlatList
              data={parcels}
              renderItem={renderParcelCard}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#4CAF50']}
                  tintColor="#4CAF50"
                />
              }
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="package-variant" size={64} color="#BDBDBD" />
                  <Text style={styles.emptyText}>
                    No {filter === 'all' ? '' : filter} parcels found
                  </Text>
                  <Button 
                    mode="contained" 
                    icon="plus"
                    onPress={() => router.push('/new-order' as any)}
                    style={styles.newOrderButton}
                  >
                    Create New Order
                  </Button>
                </View>
              }
              ListFooterComponent={renderPaginationControls}
            />
          )}
        </>
      )}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchbar: {
    margin: 8,
    elevation: 2,
  },
  filterContainer: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  segmentedButtons: {
    backgroundColor: '#FFFFFF',
  },
  statisticsContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333333',
  },
  statsScrollView: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  statCard: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    width: width / 3.8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  parcelCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#555555',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  detailChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#EEEEEE',
  },
  detailChipText: {
    fontSize: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 13,
    marginLeft: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  paginationButton: {
    borderRadius: 20,
  },
  paginationText: {
    fontSize: 14,
    color: '#555555',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  newOrderButton: {
    borderRadius: 20,
  },
}); 