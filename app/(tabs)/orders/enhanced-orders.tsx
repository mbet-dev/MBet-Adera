import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { parcelService } from '@/services/parcelService';
import {
  Button,
  Searchbar,
  SegmentedButtons,
  Text,
  Surface,
  useTheme,
  Chip,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ParcelCard } from '@/components/ParcelCard';
import { formatDate, formatCurrency } from '@/utils/formatting';
import { supabase } from '@/lib/supabase';

// Get screen dimensions for responsive layout
const { width, height } = Dimensions.get('window');

// Define tab options
const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Status configuration for styling and messages
const statusConfig = {
  pending: {
    label: 'Pending',
    color: '#FB8C00',
    backgroundColor: '#FFF3E0',
    icon: 'timer-sand',
  },
  confirmed: {
    label: 'Confirmed',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    icon: 'check-circle',
  },
  picked_up: {
    label: 'Picked Up',
    color: '#1976D2',
    backgroundColor: '#E3F2FD',
    icon: 'package-up',
  },
  in_transit: {
    label: 'In Transit',
    color: '#7B1FA2',
    backgroundColor: '#F3E5F5',
    icon: 'truck-fast',
  },
  delivered: {
    label: 'Delivered',
    color: '#388E3C',
    backgroundColor: '#E8F5E9',
    icon: 'check-all',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
    icon: 'close-circle',
  },
};

interface FilterButtonProps {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
  color?: string;
}

const FilterButton: React.FC<FilterButtonProps> = ({ 
  label, 
  count, 
  active, 
  onPress, 
  color = '#666666' 
}) => {
  // Use a loading placeholder if count is being loaded or is undefined
  const displayCount = Number.isFinite(count) ? count : '...';
  
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,
        active && { backgroundColor: `${color}20` } // 20 is hex for 12% opacity
      ]}
      onPress={onPress}
    >
      <Text 
        style={[
          styles.filterLabel,
          active && { color: color, fontWeight: '600' }
        ]}
      >
        {label}
      </Text>
      <View 
        style={[
          styles.countBadge,
          active && { backgroundColor: color }
        ]}
      >
        <Text style={styles.countText}>{displayCount}</Text>
      </View>
    </TouchableOpacity>
  );
};

// Main component for the enhanced orders screen
export default function EnhancedOrdersScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Parcel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [error, setError] = useState<string | null>(null);
  
  const scrollY = new Animated.Value(0);
  const flatListRef = useRef<FlatList>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Calculate header opacity based on scroll position
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Function to fetch order statistics
  const fetchStatistics = useCallback(async () => {
    if (!user) {
      console.log("No user found, cannot fetch statistics");
      return;
    }
    
    try {
      console.log("Fetching order statistics for user:", user.id);
      // Get statistics and handle parsing errors
      let stats = { total: 0, active: 0, delivered: 0, cancelled: 0 };
      
      try {
        stats = await parcelService.getParcelStatistics(user.id);
      } catch (error) {
        console.warn("Error parsing statistics, using fallback values:", error);
        // If there's a parsing error, we'll just use default values
      }
      
      console.log("Received statistics:", stats);
      
      // Ensure all values are numbers
      setStatistics({
        total: Number(stats.total) || 0,
        active: Number(stats.active) || 0,
        delivered: Number(stats.delivered) || 0,
        cancelled: Number(stats.cancelled) || 0
      });
    } catch (error) {
      console.error('Error fetching order statistics:', error);
      // Use default values for statistics if there's an error
      setStatistics({
        total: 0,
        active: 0,
        delivered: 0,
        cancelled: 0
      });
    }
  }, [user]);

  // Function to fetch parcels with filtering
  const fetchParcels = useCallback(async () => {
    if (!user) {
      console.log("No user found, cannot fetch parcels");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching parcels for user: ${user.id} with filter: ${filter}`);
      
      let userParcels: Parcel[] = [];
      
      if (searchQuery.trim()) {
        // If we have a search query, use the search endpoint
        console.log(`Searching parcels with query: "${searchQuery}"`);
        setIsSearching(true);
        try {
          userParcels = await parcelService.searchParcels(user.id, searchQuery);
        } catch (searchError) {
          console.error('Error searching parcels:', searchError);
          // If search fails, use the fallback method to get all parcels
          userParcels = await parcelService.getParcels(user.id);
        }
        setIsSearching(false);
      } else {
        // Otherwise fetch based on filter
        try {
          if (filter === 'active') {
            // For active filter, use the specialized method
            console.log('Using getActiveDeliveries for active filter');
            userParcels = await parcelService.getActiveDeliveries(user.id);
          } else if (filter === 'all') {
            // For 'all' filter, use the simpler getParcels method
            console.log('Using getParcels method for all filter');
            userParcels = await parcelService.getParcels(user.id);
          } else {
            // For other filters (delivered, cancelled), use paginated method
            console.log(`Using getPaginatedParcels method for ${filter} filter`);
            const result = await parcelService.getPaginatedParcels(user.id, { 
              status: filter,
              limit: 20,
              page: 1
            });
            userParcels = result.parcels || [];
          }
        } catch (fetchError) {
          console.error('Error fetching parcels with filter:', fetchError);
          // If error, try a different approach based on filter type
          if (filter === 'active') {
            console.log('Trying getParcels and filtering for active parcels');
            try {
              const allParcels = await parcelService.getParcels(user.id);
              userParcels = allParcels.filter(p => 
                ['pending', 'confirmed', 'picked_up', 'in_transit'].includes(p.status as string)
              );
            } catch (fallbackError) {
              console.error('Fallback fetch also failed:', fallbackError);
              userParcels = [];
            }
          } else if (filter === 'all') {
            // Try active deliveries as fallback for all
            try {
              console.log('Trying to get active deliveries as fallback for all');
              userParcels = await parcelService.getActiveDeliveries(user.id);
            } catch (fallbackError) {
              console.error('Fallback fetch for all also failed:', fallbackError);
              userParcels = [];
            }
          } else {
            // For cancelled/delivered, we'll just show empty state
            userParcels = [];
          }
        }
      }
      
      console.log(`Fetched ${userParcels?.length || 0} parcels before validation`);
      
      // Detailed validation of parcels to help debug issues
      if (!userParcels) {
        console.error('userParcels is null or undefined');
        userParcels = [];
      } else if (!Array.isArray(userParcels)) {
        console.error('userParcels is not an array:', typeof userParcels);
        userParcels = [];
      }
      
      // Validate all parcels to ensure they have required fields
      const validParcels = userParcels.filter(p => {
        if (!p) {
          console.warn('Found null or undefined parcel in results');
          return false;
        }
        if (!p.id) {
          console.warn('Found parcel without ID:', p);
          return false;
        }
        return true;
      });
      
      // Log the parcels we fetched to help debug
      if (validParcels.length > 0) {
        console.log(`Sample parcel data (first item):`, {
          id: validParcels[0].id,
          tracking_code: validParcels[0].tracking_code,
          status: validParcels[0].status,
          has_pickup_address: !!validParcels[0].pickup_address,
          has_dropoff_address: !!validParcels[0].dropoff_address
        });
      } else {
        console.log('No valid parcels found');
      }
      
      // Set parcels state
      setParcels(validParcels);
      console.log("Successfully updated parcels state with", validParcels.length, "parcels");
      
    } catch (error) {
      console.error('Error fetching parcels:', error);
      setError('Failed to load parcels. Please pull down to refresh.');
      // Make sure parcels is at least an empty array
      setParcels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, filter, searchQuery]);

  // Function to handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    console.log('Refreshing orders screen...');
    setRefreshing(true);
    try {
      // First refresh the stats
      const statsData = await parcelService.getParcelStatistics(user?.id || '');
      setStatistics(statsData);
      console.log('Updated stats:', statsData);
      
      // Then fetch parcels with current filter
      await fetchParcels();
    } catch (error) {
      console.error('Error refreshing orders:', error);
      setError('Could not refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [user, filter, searchQuery, fetchParcels]);

  // Handle search queries with debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    
    searchTimeout.current = setTimeout(() => {
      fetchParcels();
    }, 500);
  };

  // Handle filter changes
  const handleFilterChange = (newFilter: string) => {
    console.log(`Filter changed to: ${newFilter}`);
    
    if (newFilter !== filter) {
      setFilter(newFilter);
      
      // Reset error state when changing filters
      setError(null);
      
      // Set loading state but don't clear parcels immediately
      // This provides a better UX by showing the previous content during loading
      setLoading(true);
      
      // Fetch with the new filter
      setTimeout(() => {
        fetchParcels().catch(error => {
          console.error(`Error fetching parcels for filter ${newFilter}:`, error);
          setError('Could not load parcels. Please try again.');
          setLoading(false);
        });
      }, 100); // Small delay to allow UI to update
    }
  };

  // Open parcel details
  const openParcelDetails = (parcelId: string) => {
    try {
      console.log(`Opening parcel details for: ${parcelId}`);
      router.push({
        pathname: '/(modals)/parcel-details',
        params: { id: parcelId },
      });
    } catch (error) {
      console.error('Error navigating to parcel details:', error);
      Alert.alert('Error', 'Could not open parcel details. Please try again.');
    }
  };

  // Initial data loading
  useEffect(() => {
    if (user) {
      console.log("User authenticated, fetching data:", user.id);
      
      // First fetch the statistics
      fetchStatistics()
        .then(() => {
          console.log("Statistics fetched, fetching parcels");
          return fetchParcels();
        })
        .catch(error => {
          console.error('Error during initial data loading:', error);
          setLoading(false);
          // Set error but don't clear parcels array in case we had cached results
          setError('Failed to load data. Pull down to refresh.');
        });
    } else {
      console.log("No user found, waiting for authentication");
    }
  }, [user, fetchStatistics, fetchParcels]);

  // Format statistics for display with loading indicator
  const getStatCount = (type: keyof typeof statistics) => {
    if (loading && !refreshing) {
      return '...';
    }
    return statistics[type] || 0;
  };

  interface EmptyStateProps {
    filter: string;
    isSearching: boolean;
    searchQuery: string;
  }

  const EmptyState: React.FC<EmptyStateProps> = ({ filter, isSearching, searchQuery }) => {
    return (
      <View style={styles.emptyStateContainer}>
        <MaterialCommunityIcons 
          name="package-variant" 
          size={64} 
          color="#BDBDBD" 
        />
        <Text style={styles.emptyStateTitle}>
          {isSearching 
            ? 'No matches found'
            : 'No parcels found'}
        </Text>
        <Text style={styles.emptyStateDescription}>
          {isSearching 
            ? `We couldn't find any parcels matching "${searchQuery}"`
            : filter === 'all' 
              ? 'You have no parcels in your history yet'
              : `You have no ${filter} parcels at this time`}
        </Text>
        {!isSearching && (
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => router.push('/(tabs)/create-order')}
          >
            <Text style={styles.emptyStateButtonText}>Create a new order</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Orders',
          headerShown: true,
        }}
      />
      
      <SafeAreaView style={styles.container}>
        {/* Header Search Bar */}
        <View style={styles.headerContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
          placeholder="Search parcels..."
              placeholderTextColor="#9E9E9E"
          value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
              style={styles.searchIcon} 
              onPress={() => fetchParcels()}
            >
              <Ionicons name="search" size={20} color="#666" />
            </TouchableOpacity>
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearIcon} 
                onPress={() => {
                  setSearchQuery('');
                  setTimeout(() => fetchParcels(), 100);
                }}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filters and Statistics */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <FilterButton 
              label="All" 
              count={statistics.total} 
              active={filter === 'all'} 
              onPress={() => setFilter('all')} 
            />
            <FilterButton 
              label="Active" 
              count={statistics.active} 
              active={filter === 'active'} 
              onPress={() => setFilter('active')} 
              color="#1976D2"
            />
            <FilterButton 
              label="Delivered" 
              count={statistics.delivered} 
              active={filter === 'delivered'} 
              onPress={() => setFilter('delivered')} 
              color="#43A047"
            />
            <FilterButton 
              label="Cancelled" 
              count={statistics.cancelled} 
              active={filter === 'cancelled'} 
              onPress={() => setFilter('cancelled')} 
              color="#E53935"
            />
          </ScrollView>
      </View>

        {/* Loading State */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
          </View>
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color="#E53935" />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => fetchParcels()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Parcel List or Empty State */}
        {!loading && !error && (
          <>
            {parcels.length > 0 ? (
              <FlatList
                data={parcels}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ParcelCard 
                    parcel={item} 
                    onPress={() => openParcelDetails(item.id)} 
                  />
                )}
                contentContainerStyle={styles.parcelListContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#1976D2']}
                    tintColor="#1976D2"
                  />
                }
                ListFooterComponent={
                  <View style={styles.listFooter}>
                    <Text style={styles.footerText}>
                      {parcels.length} {parcels.length === 1 ? 'parcel' : 'parcels'} found
                    </Text>
                  </View>
                }
              />
            ) : (
              <ScrollView 
                contentContainerStyle={styles.emptyScrollContent}
                refreshControl={
                  <RefreshControl
        refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={['#1976D2']}
                    tintColor="#1976D2"
                  />
                }
              >
                <EmptyState 
                  filter={filter} 
                  isSearching={isSearching} 
                  searchQuery={searchQuery}
                />
              </ScrollView>
            )}
          </>
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
        style={styles.fab}
          onPress={() => router.push('/(tabs)/create-order')}
        >
          <MaterialIcons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  filterButtons: {
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  statsCard: {
    flex: 1,
    margin: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  statsLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  parcelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  parcelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  trackingCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  divider: {
    marginVertical: 8,
  },
  parcelDetails: {
    marginTop: 4,
  },
  addressSection: {
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  arrow: {
    alignItems: 'center',
    marginVertical: 2,
  },
  packageInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    marginRight: 8,
    marginBottom: 4,
    height: 24,
  },
  chipText: {
    fontSize: 12,
  },
  fragileChip: {
    backgroundColor: '#FFF3E0',
  },
  fragileText: {
    color: '#F57C00',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  retryButton: {
    marginTop: 8,
  },
  createButton: {
    marginTop: 8,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  listFooter: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 999,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyImage: {
    width: width * 0.5,
    height: width * 0.5,
    marginBottom: 24,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyButton: {
    paddingHorizontal: 16,
  },
  activeFilter: {
    borderColor: '#e0e0e0',
  },
  filter: {
    borderColor: '#e0e0e0',
  },
  activeFilterLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterLabel: {
    fontSize: 12,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  segmentedButtons: {
    flexDirection: 'row',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    margin: 16,
  },
  listHeader: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContainerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  listContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  parcelListContent: {
    padding: 16,
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
  },
  searchIcon: {
    padding: 12,
  },
  clearIcon: {
    padding: 12,
  },
  filterScrollContent: {
    padding: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f5f5f5',
  },
  countBadge: {
    backgroundColor: '#9e9e9e',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
}); 