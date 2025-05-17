import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, LayoutAnimation } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { formatDate, formatCurrency } from '@/utils/formatting';
import { useAuth } from '../context/AuthContext';

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { user } = useAuth();
  
  // Determine if current user is sender or receiver
  const isSender = user?.id === parcel.sender_id;
  const isReceiver = user?.id === parcel.receiver_id;
  
  // Ensure parcel and its fields have safe defaults
  const safeParcel = {
    ...parcel,
    tracking_code: parcel.tracking_code || 'No Tracking ID',
    status: parcel.status || 'pending',
    package_size: parcel.package_size || '',
    pickup_address: parcel.pickup_address || null,
    dropoff_address: parcel.dropoff_address || null
  };
  
  const status = safeParcel.status && statusConfig[safeParcel.status as ParcelStatus] 
    ? statusConfig[safeParcel.status as ParcelStatus]
    : {
        label: 'Unknown',
        color: '#757575',
        backgroundColor: '#f5f5f5',
        icon: 'help-circle',
        description: 'Status unknown'
      };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      setExpanded(!expanded);
    }
  };

  // Derive key package info
  const packageInfo = [
    safeParcel.package_size && `${safeParcel.package_size.charAt(0).toUpperCase() + safeParcel.package_size.slice(1)} package`,
    safeParcel.weight && `${safeParcel.weight} kg`,
    safeParcel.is_fragile && 'Fragile'
  ].filter(Boolean).join(' • ');

  // Render location points based on user role
  const renderLocationPoints = () => {
    const locations = [
      {
        type: 'Pickup',
        address: safeParcel.pickup_address,
        dotStyle: styles.pickupDot,
        label: isReceiver ? 'From' : 'Pickup'
      },
      {
        type: 'Dropoff',
        address: safeParcel.dropoff_address,
        dotStyle: styles.dropoffDot,
        label: isSender ? 'To' : 'Dropoff'
      }
    ];

    // If user is receiver, reverse the order
    if (isReceiver) {
      locations.reverse();
    }

    return (
      <View style={styles.locationSection}>
        {locations.map((location, index) => (
          <React.Fragment key={location.type}>
            <View style={styles.locationPoint}>
              <View style={[styles.locationDot, location.dotStyle]} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>{location.label}</Text>
                <Text style={styles.addressText}>
                  {location.address?.address_line || 'N/A'}
                </Text>
                <Text style={styles.cityText}>
                  {location.address?.city || 'N/A'}
                </Text>
              </View>
            </View>
            {index === 0 && <View style={styles.routeLine} />}
          </React.Fragment>
        ))}
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.parcelCard,
        expanded && styles.parcelCardExpanded
      ]}
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
              <Text style={styles.trackingCode}>
                {safeParcel.tracking_code === 'No Tracking ID' 
                  ? 'No Tracking ID' 
                  : `#${safeParcel.tracking_code}`}
              </Text>
              {safeParcel.tracking_code && safeParcel.tracking_code !== 'No Tracking ID' && (
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    if (Platform.OS === 'web') {
                      navigator.clipboard.writeText(safeParcel.tracking_code);
                    }
                  }}
                >
                  <MaterialCommunityIcons
                    name="content-copy"
                    size={16}
                    color="#666"
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.date}>{formatDate(safeParcel.created_at)}</Text>
          </View>
        </View>
        {showStatus && (
          <View
            style={[
              styles.statusContainer,
              { backgroundColor: status?.backgroundColor || '#f5f5f5' },
            ]}
          >
            <MaterialCommunityIcons
              name={(status?.icon as any) || 'help-circle'}
              size={16}
              color={status?.color || '#757575'}
            />
            <Text style={[styles.statusText, { color: status?.color || '#757575' }]}>
              {status?.label || 'Unknown'}
            </Text>
          </View>
        )}
      </View>

      {/* Package Summary */}
      {packageInfo && (
        <View style={styles.packageSummary}>
          <MaterialIcons name="info-outline" size={14} color="#666" />
          <Text style={styles.packageSummaryText}>{packageInfo}</Text>
        </View>
      )}

      {/* Location Section */}
      {renderLocationPoints()}

      {/* Package Details Section */}
      <View style={styles.detailsSection}>
        <View style={styles.detailItem}>
          <MaterialIcons name="inventory" size={16} color="#666" />
          <Text style={styles.detailText}>
            Size: {safeParcel.package_size ? 
              safeParcel.package_size.charAt(0).toUpperCase() + 
              safeParcel.package_size.slice(1) : 'N/A'}
          </Text>
        </View>
        
        {safeParcel.weight && (
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weight" size={16} color="#666" />
            <Text style={styles.detailText}>{safeParcel.weight} kg</Text>
          </View>
        )}
        
        {safeParcel.price && (
          <View style={styles.detailItem}>
            <MaterialIcons name="attach-money" size={16} color="#666" />
            <Text style={styles.detailText}>
              {formatCurrency(safeParcel.price)}
            </Text>
          </View>
        )}
        
        {safeParcel.is_fragile && (
          <View style={styles.detailItem}>
            <MaterialIcons name="warning" size={16} color="#f57c00" />
            <Text style={[styles.detailText, { color: '#f57c00' }]}>
              Fragile
            </Text>
          </View>
        )}
      </View>

      {/* Estimated Delivery */}
      {safeParcel.estimated_delivery && (
        <View style={styles.estimatedDelivery}>
          <MaterialIcons name="schedule" size={16} color="#1976D2" />
          <Text style={styles.estimatedText}>
            Estimated delivery: {safeParcel.estimated_delivery}
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
  parcelCardExpanded: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
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
  packageSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageSummaryText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
}); 