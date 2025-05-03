import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { formatDate, formatCurrency } from '@/utils/formatting';

const statusConfig: Record<ParcelStatus, {
  label: string;
  color: string;
  backgroundColor: string;
  icon: string;
  description: string;
}> = {
  pending: {
    label: 'Pending',
    color: '#F57C00',
    backgroundColor: '#FFF3E0',
    icon: 'timer-sand',
    description: 'Awaiting pickup'
  },
  confirmed: {
    label: 'Confirmed',
    color: '#039BE5',
    backgroundColor: '#E1F5FE',
    icon: 'check-circle',
    description: 'Order confirmed'
  },
  picked_up: {
    label: 'Picked Up',
    color: '#7B1FA2',
    backgroundColor: '#F3E5F5',
    icon: 'package-up',
    description: 'With courier'
  },
  in_transit: {
    label: 'In Transit',
    color: '#00897B',
    backgroundColor: '#E0F2F1',
    icon: 'truck-fast',
    description: 'On the way'
  },
  delivered: {
    label: 'Delivered',
    color: '#43A047',
    backgroundColor: '#E8F5E9',
    icon: 'check-all',
    description: 'Successfully delivered'
  },
  cancelled: {
    label: 'Cancelled',
    color: '#E53935',
    backgroundColor: '#FFEBEE',
    icon: 'close-circle',
    description: 'Delivery cancelled'
  }
};

interface ParcelCardProps {
  parcel: Parcel;
  onPress?: () => void;
  showStatus?: boolean;
}

export const ParcelCard: React.FC<ParcelCardProps> = ({
  parcel,
  onPress,
  showStatus = true
}) => {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[parcel.status as ParcelStatus];

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <TouchableOpacity
      style={styles.parcelCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header Section */}
      <View style={styles.parcelHeader}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="package-variant"
            size={24}
            color="#1976D2"
          />
          <View style={styles.headerInfo}>
            <View style={styles.trackingCodeContainer}>
              <Text style={styles.trackingCode}>#{parcel.tracking_code}</Text>
              <TouchableOpacity 
                style={styles.copyButton}
                onPress={() => {
                  if (Platform.OS === 'web') {
                    navigator.clipboard.writeText(parcel.tracking_code);
                  }
                }}
              >
                <MaterialCommunityIcons
                  name="content-copy"
                  size={16}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.date}>{formatDate(parcel.created_at)}</Text>
          </View>
        </View>
        {showStatus && (
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: status.backgroundColor },
            ]}
          >
            <MaterialCommunityIcons
              name={status.icon as any}
              size={16}
              color={status.color}
            />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        )}
      </View>

      {/* Location Section */}
      <View style={styles.locationSection}>
        <View style={styles.locationPoint}>
          <View style={[styles.locationDot, styles.pickupDot]} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.addressText}>
              {parcel.pickup_address?.address_line || 'N/A'}
            </Text>
            <Text style={styles.cityText}>
              {parcel.pickup_address?.city || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.routeLine} />
        
        <View style={styles.locationPoint}>
          <View style={[styles.locationDot, styles.dropoffDot]} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.addressText}>
              {parcel.dropoff_address?.address_line || 'N/A'}
            </Text>
            <Text style={styles.cityText}>
              {parcel.dropoff_address?.city || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Package Details Section */}
      <View style={styles.detailsSection}>
        <View style={styles.detailItem}>
          <MaterialIcons name="inventory" size={16} color="#666" />
          <Text style={styles.detailText}>
            Size: {parcel.package_size ? 
              parcel.package_size.charAt(0).toUpperCase() + 
              parcel.package_size.slice(1) : 'N/A'}
          </Text>
        </View>
        
        {parcel.weight && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weight" size={16} color="#666" />
            <Text style={styles.detailText}>{parcel.weight} kg</Text>
          </View>
        )}
        
        {parcel.price && (
          <View style={styles.detailItem}>
            <MaterialIcons name="attach-money" size={16} color="#666" />
            <Text style={styles.detailText}>
              {formatCurrency(parcel.price)}
            </Text>
          </View>
        )}
        
        {parcel.is_fragile && (
          <View style={styles.detailItem}>
            <MaterialIcons name="warning" size={16} color="#f57c00" />
            <Text style={[styles.detailText, { color: '#f57c00' }]}>
              Fragile
            </Text>
          </View>
        )}
      </View>

      {/* Estimated Delivery */}
      {parcel.estimated_delivery && (
        <View style={styles.estimatedDelivery}>
          <MaterialIcons name="schedule" size={16} color="#1976D2" />
          <Text style={styles.estimatedText}>
            Estimated delivery: {parcel.estimated_delivery}
          </Text>
        </View>
      )}

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.expandedSection}>
          <Text style={styles.statusDescription}>
            {status.description}
          </Text>
          {/* Add more expanded details here */}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  parcelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 8,
  },
  trackingCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    letterSpacing: 0.5,
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  locationSection: {
    marginBottom: 16,
  },
  locationPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  pickupDot: {
    backgroundColor: '#4CAF50',
  },
  dropoffDot: {
    backgroundColor: '#F44336',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginLeft: 5,
    marginVertical: 4,
  },
  locationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  cityText: {
    fontSize: 12,
    color: '#666',
  },
  detailsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  estimatedDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  estimatedText: {
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
}); 