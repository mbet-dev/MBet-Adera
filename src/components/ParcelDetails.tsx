import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Parcel, ParcelStatus } from '@/types/parcel';
import { formatDate } from '@/utils/formatting';
import Avatar from './Avatar';

interface Profile {
  id: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
}

interface ParcelDetailsProps {
  parcel: Parcel;
  sender: Profile | null;
  recipient: Profile | null;
  onCancel?: () => void;
  onTrack?: () => void;
  onChat?: () => void;
  onClose?: () => void;
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

const ParcelDetails: React.FC<ParcelDetailsProps> = ({
  parcel,
  sender,
  recipient,
  onCancel,
  onTrack,
  onChat,
  onClose
}) => {
  const status = statusConfig[parcel.status as ParcelStatus];

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Track my parcel with tracking code: ${parcel.tracking_code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCall = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const renderAddressSection = (title: string, address: any) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.addressContainer}>
        <View style={styles.addressRow}>
          <Ionicons name="location" size={20} color="#666" />
          <Text style={styles.addressText}>{address?.address_line || 'N/A'}</Text>
        </View>
        <View style={styles.addressRow}>
          <Ionicons name="business" size={20} color="#666" />
          <Text style={styles.addressText}>{address?.city || 'Addis Ababa'}</Text>
        </View>
      </View>
    </View>
  );

  const renderPersonSection = (title: string, person: Profile | null, contact?: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.personContainer}>
        <View style={styles.personRow}>
          <Avatar
            size={40}
            source={parcel?.sender?.logo_url ? { uri: parcel.sender.logo_url } : require('../../assets/images/avatar 9.jpg')}
          />
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{person?.full_name || 'N/A'}</Text>
            <Text style={styles.personContact}>{contact || person?.phone_number || 'N/A'}</Text>
          </View>
          {(contact || person?.phone_number) && (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(contact || person?.phone_number)}
            >
              <Ionicons name="call" size={20} color="#4CAF50" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Parcel Details</Text>
          {onClose && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderPersonSection('Sender', sender, parcel.pickup_contact)}
      {renderPersonSection('Recipient', recipient, parcel.dropoff_contact)}
      {renderAddressSection('Pickup Location', parcel.pickup_address)}
      {renderAddressSection('Dropoff Location', parcel.dropoff_address)}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Package Details</Text>
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Size</Text>
            <Text style={styles.detailValue}>{parcel.package_size}</Text>
          </View>
          {parcel.package_description && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Description</Text>
              <Text style={styles.detailValue}>{parcel.package_description}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Fragile</Text>
            <Text style={styles.detailValue}>{parcel.is_fragile ? 'Yes' : 'No'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.actionsContainer}>
        {parcel.status !== 'cancelled' && parcel.status !== 'delivered' && (
          <>
            {onTrack && (
              <TouchableOpacity style={styles.actionButton} onPress={onTrack}>
                <Ionicons name="map" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>Track</Text>
              </TouchableOpacity>
            )}
            {onChat && (
              <TouchableOpacity style={styles.actionButton} onPress={onChat}>
                <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>Chat</Text>
              </TouchableOpacity>
            )}
            {onCancel && parcel.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-social" size={24} color="#FFFFFF" />
          <Text style={styles.actionText}>Share</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  trackingCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  addressContainer: {
    marginTop: 8,
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
  personContainer: {
    marginTop: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personInfo: {
    flex: 1,
    marginLeft: 12,
  },
  personName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  personContact: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  callButton: {
    padding: 8,
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    marginBottom: 24,
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
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: '48%',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F44336',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ParcelDetails;
