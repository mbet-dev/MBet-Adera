import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Share,
  RefreshControl,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../../../src/services/supabase';
import { formatCurrency, formatDate } from '../../../src/utils/formatting';
import QRCode from 'react-native-qrcode-svg';
import { Parcel, Address, ParcelStatus } from '@/types/parcel';
import { parcelService } from '../../../src/services/parcelService';
import { useAuth } from '@/context/AuthContext';
import Avatar from '@/components/Avatar';

const windowWidth = Dimensions.get('window').width;

interface Profile {
  id: string;
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending Pickup',
    icon: 'time-outline',
    color: '#FFA000',
    backgroundColor: 'rgba(255, 160, 0, 0.1)',
  },
  confirmed: {
    label: 'Confirmed by Courier',
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

const ParcelDetailScreen = () => {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: 'Parcel Detail',
      headerRight: () => (
        <MaterialIcons name="inventory" size={24} color="#333333" style={{ marginRight: 16 }} />
      ),
    });
  }, [navigation]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [sender, setSender] = useState<Profile | null>(null);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [viewMode, setViewMode] = useState('details');

  useEffect(() => {
    navigation.setOptions({
      title: 'Parcel Details',
      headerShown: true,
      headerLeft: () => (
        <TouchableOpacity
          style={{ marginLeft: 16 }}
          onPress={() => router.back()}
        >
          <MaterialIcons name="local-shipping" size={24} color="#333333" />
        </TouchableOpacity>
      ),
    });

    fetchParcelDetails();
  }, [id, user]);

  const fetchParcelDetails = async () => {
    if (!id || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setRefreshing(true);

      const fetchedParcel = await parcelService.getParcelById(id, user.id);

      if (!fetchedParcel) {
        Alert.alert('Error', 'Parcel not found or access denied.');
        router.back();
        return;
      }

      setParcel(fetchedParcel);

      setSender(null);
      setRecipient(null);

      if (fetchedParcel.sender_id) {
        const { data: senderData, error: senderError } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number, avatar_url')
          .eq('id', fetchedParcel.sender_id)
          .single();
        if (senderError) console.error("Error fetching sender:", senderError.message);
        else setSender(senderData as Profile);
      }

      if (fetchedParcel.receiver_id) {
        const { data: recipientData, error: recipientError } = await supabase
          .from('profiles')
          .select('id, full_name, phone_number, avatar_url')
          .eq('id', fetchedParcel.receiver_id)
          .single();
        if (recipientError) console.error("Error fetching recipient:", recipientError.message);
        else setRecipient(recipientData as Profile);
      }
    } catch (error: any) {
      console.error('Error fetching parcel details:', error);
      Alert.alert('Error', `Failed to load parcel details: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    fetchParcelDetails();
  }, [id, user]);

  const renderAddressItem = (address: Address | null, title: string) => {
    if (!address) return null;
    return (
      <View style={styles.addressContainer}>
        <Text style={styles.addressTitle}>{title}</Text>
        <Text style={styles.addressLine}>{address.address_line}</Text>
        <Text style={styles.addressLine}>{address.city || ''}</Text>
      </View>
    );
  };

  const renderPersonItem = (person: Profile | null, title: string, icon: keyof typeof Ionicons.glyphMap) => {
    if (!person) return null;
    return (
      <View style={styles.personContainer}>
        <Text style={styles.personTitle}>{title}</Text>
        <View style={styles.personDetails}>
          <Avatar 
            source={person.avatar_url ? { uri: person.avatar_url } : null} 
            name={person.full_name}
            style={styles.personImage}
          />
          <View>
            <Text style={styles.personName}>{person.full_name || 'N/A'}</Text>
            <Text style={styles.personContact}>{person.phone_number || 'No contact'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderStatusTimeline = () => {
    if (!parcel) return null;
    const statuses: ParcelStatus[] = ['pending', 'confirmed', 'picked_up', 'in_transit', 'delivered'];
    const currentStatusIndex = statuses.indexOf(parcel.status);
    
    if (parcel.status === 'cancelled') {
      return (
        <View style={styles.cancelledContainer}>
          <Ionicons name="close-circle" size={48} color="#F44336" />
          <Text style={styles.cancelledText}>This parcel has been cancelled</Text>
          <Text style={styles.cancelledDate}>
            Cancelled on <Text>{formatDate(parcel.updated_at)}</Text>
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.timelineContainer}>
        {statuses.map((status, index) => {
           const isCompleted = index < currentStatusIndex;
           const isActive = index === currentStatusIndex;
           const statusInfo = statusConfig[status as keyof typeof statusConfig]; // Type assertion
           
           return (
             <View key={status} style={styles.timelineItem}>
               <View style={styles.timelineConnector}>
                 {index > 0 && (
                   <View
                     style={[
                       styles.connector,
                       { backgroundColor: index <= currentStatusIndex ? '#4CAF50' : '#E0E0E0' },
                     ]}
                   />
                 )}
               </View>

               <View
                 style={[
                   styles.timelineIconContainer,
                   {
                     backgroundColor: isActive ? statusInfo.color : '#E0E0E0',
                   },
                 ]}
               >
                 <Ionicons
                   name={statusInfo.icon as keyof typeof Ionicons.glyphMap} 
                   size={16} 
                   color="#FFFFFF"
                 />
               </View>

               <View style={styles.timelineContent}>
                 <Text
                   style={[
                     styles.timelineStatus,
                     { color: isActive ? statusInfo.color : isCompleted ? '#333' : '#999' },
                   ]}
                 >
                   {statusInfo.label}
                 </Text>
                 {isActive && status === parcel.status && (
                   <Text style={styles.timelineDate}>
                     {formatDate(parcel.updated_at)}
                   </Text>
                 )}
               </View>
             </View>
           );
         })}
      </View>
    );
  };

  const renderHeader = () => {
    if (!parcel) return null;
    const currentStatusInfo = statusConfig[parcel.status as keyof typeof statusConfig]; // Type assertion
    
    return (
      <View style={styles.headerContainer}>
          {/* QR Code Section */}
          <View style={styles.qrCodeContainer}>
            <QRCode
              value={parcel.tracking_code || parcel.id} 
              size={windowWidth * 0.25}
              logoBackgroundColor='transparent'
            />
          </View>

          {/* Details Section */}
          <View style={styles.headerDetailsContainer}>
            <Text style={styles.trackingLabel}>Tracking ID</Text>
            <Text style={styles.trackingId}>{parcel.tracking_code}</Text>
            
            <View
              style={[
                styles.statusContainer,
                { backgroundColor: currentStatusInfo.backgroundColor },
              ]}
            >
              <Ionicons 
                name={currentStatusInfo.icon as keyof typeof Ionicons.glyphMap} 
                size={16} 
                color={currentStatusInfo.color} 
                style={styles.statusIcon}
              />
              <Text style={[styles.statusText, { color: currentStatusInfo.color }]}>
                {currentStatusInfo.label}
              </Text>
            </View>
          </View>
      </View>
    );
  };

  const renderContent = () => {
    if (!parcel) return null;
    
    return (
      <View style={styles.contentContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, viewMode === 'details' && styles.activeTabButton]}
            onPress={() => setViewMode('details')}
          >
            <Ionicons 
              name="information-circle-outline" 
              size={20} 
              color={viewMode === 'details' ? '#4CAF50' : '#666'}
              style={styles.tabIcon}
            />
            <Text 
              style={[styles.tabText, viewMode === 'details' && styles.activeTabText]}
            >
              Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tabButton, viewMode === 'tracking' && styles.activeTabButton]}
            onPress={() => setViewMode('tracking')}
          >
             <Ionicons 
              name="footsteps-outline" 
              size={20} 
              color={viewMode === 'tracking' ? '#4CAF50' : '#666'}
              style={styles.tabIcon}
            />
            <Text 
              style={[styles.tabText, viewMode === 'tracking' && styles.activeTabText]}
            >
              Tracking
            </Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'details' && (
          <View style={styles.detailsViewContainer}>
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Package Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Package Size</Text>
                <Text style={styles.detailValue}>
                  {parcel.package_size ? parcel.package_size.charAt(0).toUpperCase() + parcel.package_size.slice(1) : 'Not specified'}
                </Text>
              </View>
              {parcel.package_description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{parcel.package_description}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Delivery Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>{formatDate(parcel.created_at)}</Text>
              </View>
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Addresses</Text>
              {renderAddressItem(parcel.pickup_address, 'Pickup Address')}
              {renderAddressItem(parcel.dropoff_address, 'Dropoff Address')}
            </View>
            
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>People</Text>
              {renderPersonItem(sender, 'Sender', 'person-outline')}
              {renderPersonItem(recipient, 'Recipient', 'person-outline')}
            </View>
          </View>
        )}

        {viewMode === 'tracking' && (
          <View style={styles.trackingViewContainer}>
            {renderStatusTimeline()}
            
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push({
                  pathname: '/track-map' as any,
                  params: { id: parcel.id },
                })}
              >
                <Ionicons name="map-outline" size={24} color="#4CAF50" />
                <Text style={styles.actionText}>Track on Map</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `Track my parcel with MBet-Adera!\nTracking ID: ${parcel.tracking_code}\nStatus: ${statusConfig[parcel.status as keyof typeof statusConfig].label}`,
                      url: `mbetadera://parcel/${parcel.id}`,
                      title: 'Track My Parcel',
                    });
                  } catch (error) {
                    console.error('Error sharing parcel details:', error);
                  }
                }}
              >
                <Ionicons name="share-social-outline" size={24} color="#4CAF50" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading parcel details...</Text>
      </View>
    );
  }

  if (!parcel) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
        <Text style={styles.errorText}>Parcel not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {parcel && renderHeader()}
        {parcel && renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 18,
    color: '#F44336',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
  qrCodeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDetailsContainer: {
    flex: 2,
    justifyContent: 'center',
  },
  trackingLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  trackingId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
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
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: '#4CAF50',
  },
  tabIcon: {
    marginBottom: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  detailsViewContainer: {
    flex: 1,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    flex: 2,
    textAlign: 'right',
  },
  addressContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 16,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  addressLine: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 4,
  },
  personContainer: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 16,
  },
  personTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  personDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  personName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  personContact: {
    fontSize: 14,
    color: '#666666',
  },
  trackingViewContainer: {
    flex: 1,
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
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
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  timelineConnector: {
    width: 16,
    alignItems: 'center',
    paddingTop: 8,
    marginRight: 8,
  },
  connector: {
    width: 2,
    height: 40,
    backgroundColor: '#4CAF50',
    position: 'absolute',
    top: -20,
    bottom: 0,
  },
  timelineIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: '#666666',
  },
  cancelledContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  cancelledText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 12,
    marginBottom: 4,
  },
  cancelledDate: {
    fontSize: 14,
    color: '#666666',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
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
  actionButton: {
    alignItems: 'center',
    width: '48%',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  actionText: {
    marginTop: 8,
    fontSize: 14,
    color: '#333333',
  },
});

export default ParcelDetailScreen;