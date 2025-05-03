import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Animated, LayoutAnimation } from 'react-native';
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
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

  useEffect(() => {
    if (expanded) {
      // Configure animation when expanding
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      // Configure animation when collapsing
      fadeAnim.setValue(0);
    }
  }, [expanded, fadeAnim]);

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
      <View style={styles.locationSection}>
        <View style={styles.locationPoint}>
          <View style={[styles.locationDot, styles.pickupDot]} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.addressText}>
              {safeParcel.pickup_address?.address_line || 'N/A'}
            </Text>
            <Text style={styles.cityText}>
              {safeParcel.pickup_address?.city || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.routeLine} />
        
        <View style={styles.locationPoint}>
          <View style={[styles.locationDot, styles.dropoffDot]} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.addressText}>
              {safeParcel.dropoff_address?.address_line || 'N/A'}
            </Text>
            <Text style={styles.cityText}>
              {safeParcel.dropoff_address?.city || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Expanded Details */}
      {expanded && (
        <Animated.View 
          style={[styles.expandedSection, { opacity: fadeAnim }]}
        >
          {/* Package Details Section */}
          <View style={styles.detailsGroup}>
            <Text style={styles.detailsGroupTitle}>Package Details</Text>
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
          </View>

          {/* Delivery Status */}
          <View style={styles.detailsGroup}>
            <Text style={styles.detailsGroupTitle}>Delivery Status</Text>
            <View style={styles.statusDetails}>
              <MaterialCommunityIcons
                name={(status?.icon as any) || 'help-circle'}
                size={20}
                color={status?.color || '#757575'}
              />
              <View style={styles.statusInfo}>
                <Text style={[styles.statusTitle, { color: status?.color || '#757575' }]}>
                  {status?.label || 'Unknown'}
                </Text>
                <Text style={styles.statusDescription}>
                  {status.description}
                </Text>
              </View>
            </View>
          </View>

          {/* Estimated Delivery */}
          {safeParcel.estimated_delivery && (
            <View style={styles.detailsGroup}>
              <Text style={styles.detailsGroupTitle}>Delivery Estimate</Text>
              <View style={styles.estimatedDelivery}>
                <MaterialIcons name="schedule" size={16} color="#1976D2" />
                <Text style={styles.estimatedText}>
                  {safeParcel.estimated_delivery}
                </Text>
              </View>
            </View>
          )}
          
          {/* Description if available */}
          {safeParcel.package_description && (
            <View style={styles.detailsGroup}>
              <Text style={styles.detailsGroupTitle}>Description</Text>
              <Text style={styles.descriptionText}>
                {safeParcel.package_description}
              </Text>
            </View>
          )}
        </Animated.View>
      )}
      
      {/* Card Footer with expand indicator */}
      <View style={styles.cardFooter}>
        <TouchableOpacity
          onPress={handlePress}
          style={styles.expandButton}
        >
          <Text style={styles.expandText}>
            {expanded ? 'Show less' : 'Show more'}
          </Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={18}
            color="#666"
          />
        </TouchableOpacity>
      </View>
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
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 12,
  },
  trackingCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackingCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  copyButton: {
    marginLeft: 4,
    padding: 4,
  },
  date: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  statusContainer: {
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
  packageSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageSummaryText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 6,
  },
  locationSection: {
    marginVertical: 8,
  },
  locationPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
  },
  pickupDot: {
    backgroundColor: '#4CAF50',
  },
  dropoffDot: {
    backgroundColor: '#F44336',
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    color: '#212121',
  },
  cityText: {
    fontSize: 12,
    color: '#757575',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginLeft: 6,
  },
  expandedSection: {
    marginTop: 16,
  },
  detailsGroup: {
    marginBottom: 16,
  },
  detailsGroupTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
    marginBottom: 8,
  },
  detailsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  statusDetails: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusInfo: {
    marginLeft: 8,
    flex: 1,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  estimatedDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimatedText: {
    fontSize: 13,
    color: '#1976D2',
    marginLeft: 8,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 16,
    alignItems: 'center',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  expandText: {
    fontSize: 13,
    color: '#666',
    marginRight: 4,
  },
}); 