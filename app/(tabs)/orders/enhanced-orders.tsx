import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
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
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Parcel } from '@/types/parcel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ParcelList } from '@/components/ParcelList';

// Get screen dimensions for responsive layout
const { width } = Dimensions.get('window');

// Define filter options
const FILTER_OPTIONS = [
  { value: 'all', label: 'All', icon: 'package-variant' },
  { value: 'active', label: 'Active', icon: 'truck-delivery' },
  { value: 'delivered', label: 'Delivered', icon: 'check-circle' },
  { value: 'cancelled', label: 'Cancelled', icon: 'cancel' },
];

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
  const [orderStatistics, setOrderStatistics] = useState({
    active: 0,
    delivered: 0,
    cancelled: 0,
    total: 0,
  });
  
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
      const stats = await parcelService.getParcelStatistics(user.id);
      setOrderStatistics(stats);
    } catch (error) {
      console.error('Error fetching order statistics:', error);
    }
  };

  // Function to fetch parcels with filtering
  const fetchParcels = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Map filter to actual status values
      let status = null;
      if (filter === 'active') {
        status = 'active';
      } else if (filter !== 'all') {
        status = filter;
      }
      
      const { parcels: fetchedParcels } = await parcelService.getPaginatedParcels(
        user.id, 
        {
          status,
          limit: 50, // Increased limit since we're using categories
          page: 0,
          sortBy: 'created_at',
          sortDirection: 'desc',
        }
      );
      
      setParcels(fetchedParcels);
      
    } catch (error) {
      console.error('Error fetching parcels:', error);
    } finally {
      setLoading(false);
    }
  }, [user, filter]);

  // Use effect to fetch data on component mount and when dependencies change
  useEffect(() => {
    if (user) {
      fetchParcels();
      fetchOrderStatistics();
    }
  }, [fetchParcels]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // For a better search experience, search directly on the backend if possible
      if (user && query.length > 2) {
        // If we have a backend search endpoint, use it
        const results = await parcelService.searchParcels(user.id, query);
        setSearchResults(results);
      } else {
        // Otherwise fall back to client-side filtering
        const searchResults = parcels.filter(parcel => 
          parcel.tracking_code.toLowerCase().includes(query.toLowerCase()) ||
          parcel.pickup_address?.address_line?.toLowerCase().includes(query.toLowerCase()) ||
          parcel.dropoff_address?.address_line?.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(searchResults);
      }
    } catch (error) {
      console.error('Error during search:', error);
      // If search fails, fall back to client-side filtering
      const searchResults = parcels.filter(parcel => 
        parcel.tracking_code.toLowerCase().includes(query.toLowerCase()) ||
        parcel.pickup_address?.address_line?.toLowerCase().includes(query.toLowerCase()) ||
        parcel.dropoff_address?.address_line?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(searchResults);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchParcels(), fetchOrderStatistics()]);
    setRefreshing(false);
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setSearchQuery('');
    setIsSearching(false);
  };

  const handleParcelPress = (parcel: Parcel) => {
    // Use the new modal screen instead of the tab screen
    router.push(`/parcel-details?id=${parcel.id}` as any);
  };

  const renderStatisticsCards = () => (
    <Animated.View 
      style={[
        styles.statsContainer,
        { opacity: headerOpacity }
      ]}
    >
      <Surface style={[styles.statsCard, { backgroundColor: theme.colors.primaryContainer }]}>
        <MaterialCommunityIcons name="truck-delivery" size={24} color={theme.colors.primary} />
        <Text style={styles.statsNumber}>{orderStatistics.active}</Text>
        <Text style={styles.statsLabel}>Active</Text>
      </Surface>

      <Surface style={[styles.statsCard, { backgroundColor: theme.colors.secondaryContainer }]}>
        <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.secondary} />
        <Text style={styles.statsNumber}>{orderStatistics.delivered}</Text>
        <Text style={styles.statsLabel}>Delivered</Text>
      </Surface>

      <Surface style={[styles.statsCard, { backgroundColor: theme.colors.errorContainer }]}>
        <MaterialCommunityIcons name="close-circle" size={24} color={theme.colors.error} />
        <Text style={styles.statsNumber}>{orderStatistics.cancelled}</Text>
        <Text style={styles.statsLabel}>Cancelled</Text>
      </Surface>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      
      <View style={styles.header}>
        <Searchbar
          placeholder="Search parcels..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchBar}
        />
        
        <SegmentedButtons
          value={filter}
          onValueChange={handleFilterChange}
          buttons={FILTER_OPTIONS.map(option => ({
            value: option.value,
            label: option.label,
            icon: option.icon,
          }))}
          style={styles.filterButtons}
        />
      </View>

      {renderStatisticsCards()}

      <ParcelList
        parcels={isSearching ? searchResults : parcels}
        onParcelPress={handleParcelPress}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      <Button
        mode="contained"
        onPress={() => router.push('/create-order')}
        style={styles.fab}
        icon="plus"
      >
        New Order
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    borderRadius: 28,
  },
}); 