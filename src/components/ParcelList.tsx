import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { formatDate } from '@/utils/formatting';
import { Button } from 'react-native-paper';

interface ParcelListProps {
  parcels: Parcel[];
  loading: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  showStatus?: boolean;
  emptyMessage?: string;
  totalCount?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
}

const statusConfig = {
  pending: {
    label: 'Pending Pickup',
    icon: 'time-outline',
    color: '#FFA000',
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
  },
  confirmed: {
    label: 'Confirmed',
    icon: 'checkmark-circle-outline',
    color: '#7B1FA2',
    backgroundColor: 'rgba(123, 31, 162, 0.1)',
  },
  picked_up: {
    label: 'Picked Up',
    icon: 'archive-outline',
    color: '#1976D2',
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  in_transit: {
    label: 'In Transit',
    icon: 'car-outline',
    color: '#0097A7',
    backgroundColor: 'rgba(0, 151, 167, 0.1)',
  },
  delivered: {
    label: 'Delivered',
    icon: 'checkmark-done-outline',
    color: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'close-circle-outline',
    color: '#F44336',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
};

const ParcelList: React.FC<ParcelListProps> = ({
  parcels,
  loading,
  onRefresh,
  refreshing = false,
  showStatus = true,
  emptyMessage = 'No parcels found',
  totalCount = 0,
  currentPage = 0,
  onPageChange,
  itemsPerPage = 10,
}) => {
  // Calculate total pages
  const totalPages = Math.ceil(totalCount / itemsPerPage);
  
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <Button
          mode="text"
          disabled={currentPage === 0}
          onPress={() => onPageChange?.(currentPage - 1)}
          icon="chevron-left"
          contentStyle={styles.paginationButton}
        >
          Prev
        </Button>
        
        <Text style={styles.paginationText}>
          Page {currentPage + 1} of {totalPages}
        </Text>
        
        <Button
          mode="text"
          disabled={currentPage >= totalPages - 1}
          onPress={() => onPageChange?.(currentPage + 1)}
          icon="chevron-right"
          contentStyle={[styles.paginationButton, { flexDirection: 'row-reverse' }]}
        >
          Next
        </Button>
      </View>
    );
  };

  const renderParcelItem = ({ item }: { item: Parcel }) => {
    const status = statusConfig[item.status as ParcelStatus];

    return (
      <TouchableOpacity
        style={styles.parcelCard}
        onPress={() => router.push(`/orders/${item.id}` as any)}
      >
        <View style={styles.parcelHeader}>
          <Text style={styles.trackingCode}>#{item.tracking_code}</Text>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
        
        <View style={styles.addressContainer}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.pickup_address?.address_line || 'N/A'}
            </Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#666" />
            <Text style={styles.addressText} numberOfLines={1}>
              {item.dropoff_address?.address_line || 'N/A'}
            </Text>
          </View>
        </View>

        {showStatus && (
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: status.backgroundColor },
            ]}
          >
            <Ionicons name={status.icon as any} size={16} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
    <FlatList
      data={parcels}
      renderItem={renderParcelItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListEmptyComponent={
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      }
        ListFooterComponent={renderPaginationControls}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  parcelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#666',
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
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  paginationButton: {
    height: 36,
  },
  paginationText: {
    fontSize: 14,
    color: '#555',
  },
});

export default ParcelList;
