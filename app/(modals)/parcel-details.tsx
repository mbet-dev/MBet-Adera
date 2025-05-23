import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Platform,
  Share,
  Linking,
  Alert,
  Image,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// Import utilities and services
import { supabase } from '@/lib/supabase';
import { formatDate, formatCurrency } from '@/utils/formatting';
import { useAuth } from '../../src/context/AuthContext';
import { parcelService } from '@/services/parcelService';
import Colors from '../../constants/Colors';

// Import types from the parcel types file
import { Parcel, ParcelStatus, Profile, NullableAddress, DatabaseParcel } from '../../src/types/parcel';

// Status colors mapping
const statusColors: Record<string, string> = {
  'pending': '#FFA000',
  'confirmed': '#1976D2',
  'picked_up': '#7B1FA2',
  'in_transit': '#0288D1',
  'out_for_delivery': '#0097A7',
  'delivered': '#388E3C',
  'cancelled': '#D32F2F',
  'failed': '#D32F2F',
};

export default function ParcelDetailsModal() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { user } = useAuth();
  const qrRef = useRef<any>(null);
  const { width } = Dimensions.get('window');
  
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [sender, setSender] = useState<Profile | null>(null);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [qrValue, setQrValue] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'tracking' | 'timeline'>('details');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Effect for loading the parcel
  useEffect(() => {
    if (!id || !user) {
      console.log("Missing required parameters:", { id, userId: user?.id });
      setError("Missing required information. Please try again.");
      setLoading(false);
      return;
    }
    
    console.log("Parcel ID from params:", id);
    fetchParcelDetails();
  }, [id, user]);

  // Setup QR code value
  useEffect(() => {
    if (parcel) {
      const trackingCode = parcel.tracking_code || parcel.id;
      const deepLink = `mbetadera://track/${trackingCode}`;
      const webUrl = `https://mbetadera.app/track/${trackingCode}`;
      setQrValue(`${deepLink}?web=${webUrl}`);
    }
  }, [parcel]);

  const fetchParcelDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Use the RPC function to get parcel details with phone numbers
      const { data: parcelData, error } = await supabase
        .rpc('get_parcel_by_id', {
          p_parcel_id: id,
          p_user_id: user.id
        });

      if (error) {
        console.error('Error fetching parcel:', error);
        setError('Could not load parcel details.');
        setLoading(false);
        return;
      }

      if (!parcelData) {
        setError('Parcel not found.');
        setLoading(false);
        return;
      }

      // Set the parcel data directly from the RPC response
      setParcel(parcelData as Parcel);
      
      // Get first names from full names
      const getFirstName = (fullName: string | undefined) => {
        if (!fullName) return '';
        return fullName.split(' ')[0];
      };

      // Set sender and recipient profiles with phone numbers
      setSender({
        id: parcelData.sender_id,
        phone_number: parcelData.sender_phone,
        full_name: getFirstName(parcelData.sender?.full_name)
      });
      
      setRecipient({
        id: parcelData.receiver_id,
        phone_number: parcelData.receiver_phone,
        full_name: getFirstName(parcelData.receiver?.full_name)
      });

    } catch (error) {
      console.error('Error in fetchParcelDetails:', error);
      setError('Could not load parcel details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchParcelDetails();
    setRefreshing(false);
  }, []);

  const handleShare = async () => {
    if (!parcel?.tracking_code) return;
    
    try {
      setSharingInProgress(true);
      
      const trackingCode = parcel.tracking_code;
      const appDeepLink = `mbetadera://track/${trackingCode}`;
      const webFallback = `https://mbetadera.app/track/${trackingCode}`;
      const message = `Track my parcel with MBet-Adera!\nTracking ID: ${trackingCode}\nStatus: ${parcel?.status?.toUpperCase() || 'UNKNOWN'}\n\nScan the QR code or use this link: ${webFallback}`;
      
      if (Platform.OS === 'web') {
        try {
          if (navigator.share) {
            await navigator.share({
              title: 'Track My Parcel',
              text: message,
              url: webFallback
            });
          } else {
            await navigator.clipboard.writeText(message);
            Alert.alert('Copied', 'Tracking information copied to clipboard!');
          }
        } catch (error) {
          console.error('Web sharing error:', error);
          Alert.alert('Sharing Info', 'Tracking information copied to clipboard!');
        }
      } else {
        const qrImageUri = await captureQRCode();
        
        if (qrImageUri) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(qrImageUri, {
              mimeType: 'image/png',
              dialogTitle: 'Share Parcel Tracking',
              UTI: 'public.png'
            });
          } else {
            await Share.share({
              message: message,
              url: qrImageUri,
              title: 'Track My Parcel'
            });
          }
        } else {
          await Share.share({
            message: message,
            url: webFallback,
            title: 'Track My Parcel'
          });
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share tracking information');
    } finally {
      setSharingInProgress(false);
    }
  };

  const captureQRCode = async (): Promise<string | null> => {
    try {
      if (!qrRef.current) return null;
      
      const viewShot = qrRef.current as any;
      if (viewShot && typeof viewShot.capture === 'function') {
        const uri = await viewShot.capture();
        return uri;
      }
      return null;
    } catch (error) {
      console.error('Error capturing QR code:', error);
      return null;
    }
  };

  const handleTrack = () => {
    if (!parcel?.tracking_code) return;
    router.push(`/tracking/${parcel.tracking_code}`);
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'details' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('details')}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={activeTab === 'details' ? Colors.light.primary : '#757575'}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'details' && styles.activeTabButtonText
          ]}
        >
          Details
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'tracking' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('tracking')}
      >
        <Ionicons
          name="qr-code-outline"
          size={18}
          color={activeTab === 'tracking' ? Colors.light.primary : '#757575'}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'tracking' && styles.activeTabButtonText
          ]}
        >
          Tracking
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'timeline' && styles.activeTabButton
        ]}
        onPress={() => setActiveTab('timeline')}
      >
        <Ionicons
          name="time-outline"
          size={18}
          color={activeTab === 'timeline' ? Colors.light.primary : '#757575'}
        />
        <Text
          style={[
            styles.tabButtonText,
            activeTab === 'timeline' && styles.activeTabButtonText
          ]}
        >
          Timeline
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderQRCode = useCallback(() => {
    if (!parcel) return null;
    
    // Increase logo size slightly and make it proportional
    const logoSize = Platform.OS === 'web' ? 80 : 50;
    
    return (
      <View style={styles.qrCodeContainer}>
        <Text style={styles.qrCodeTitle}>Scan to Track</Text>
        <ViewShot ref={qrRef} style={styles.qrCodeWrapper}>
          <View style={styles.qrBackground}>
            <QRCode
              value={qrValue}
              size={200}
              backgroundColor="#FFFFFF"
              color="#000000"
              logo={require('../../assets/images/new-mbetadera-icon-1.png')}
              logoSize={logoSize}
              logoBackgroundColor="white"
              logoBorderRadius={10}
            />
          </View>
        </ViewShot>
        <Text style={styles.qrCodeSubtitle}>
          Share this QR code to let others track this parcel
        </Text>
        <Text style={styles.qrCodeTrackingCode}>
          Tracking Code: <Text style={styles.trackingCodeText}>{parcel.tracking_code}</Text>
        </Text>
      </View>
    );
  }, [parcel?.tracking_code, qrValue]);

  const renderPersonSection = (title: string, profile: Profile | null, contact: string | undefined) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        <MaterialIcons name="person" size={24} color={Colors.light.tint} />
        <View style={styles.sectionTextContainer}>
          <Text style={styles.sectionText}>{profile?.full_name || ''}</Text>
          {profile?.phone_number && (
            <TouchableOpacity 
              style={styles.phoneContainer}
              onPress={() => Linking.openURL(`tel:${profile.phone_number}`)}
            >
              <Ionicons name="call" size={20} color={Colors.light.tint} />
              <Text style={styles.phoneText}>{profile.phone_number}</Text>
            </TouchableOpacity>
          )}
          {contact && (
            <Text style={styles.sectionSubText}>Contact: {contact}</Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderAddressSection = (title: string, address: NullableAddress | null) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.addressContainer}>
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={20} color="#666" />
          <Text style={styles.addressText}>
            {address?.address_line || 'Address not available'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderDetailsTab = () => {
    if (!parcel) return null;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Information</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[parcel.status] || '#757575' }]}>
                <Text style={styles.statusBadgeText}>{parcel.status?.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Size</Text>
              <Text style={styles.detailValue}>{parcel.package_size || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{parcel.weight ? `${parcel.weight} kg` : 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Fragile</Text>
              <Text style={styles.detailValue}>{parcel.is_fragile ? 'Yes' : 'No'}</Text>
            </View>
            {parcel.package_description && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{parcel.package_description}</Text>
              </View>
            )}
            {parcel.notes && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Instructions</Text>
                <Text style={styles.detailValue}>{parcel.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {renderPersonSection('Sender', sender, parcel.pickup_contact)}
        {renderPersonSection('Recipient', recipient, parcel.dropoff_contact)}
        {renderAddressSection('Pickup Location', parcel.pickup_address)}
        {renderAddressSection('Dropoff Location', parcel.dropoff_address)}
      </View>
    );
  };

  const renderTrackingTab = () => {
    if (!parcel) return null;

    return (
      <View style={styles.tabContent}>
        {renderQRCode()}

        <TouchableOpacity
          style={[styles.trackButton, sharingInProgress && styles.disabledButton]}
          onPress={handleTrack}
          disabled={sharingInProgress}
        >
          <Ionicons name="map-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>View on Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shareButton, sharingInProgress && styles.disabledButton]}
          onPress={handleShare}
          disabled={sharingInProgress}
        >
          {sharingInProgress ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Share Tracking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderTimelineTab = () => {
    if (!parcel) return null;

    return (
      <View style={styles.tabContent}>
        <View style={styles.timelineContainer}>
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>Created</Text>
              <Text style={styles.timelineDate}>{formatDate(parcel.created_at)}</Text>
            </View>
          </View>

          {parcel.estimated_delivery && (
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>Estimated Delivery</Text>
                <Text style={styles.timelineDate}>{parcel.estimated_delivery}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!parcel) return null;

    return (
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleTrack}
        >
          <Ionicons name="map-outline" size={24} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Track on Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={handleShare}
          disabled={sharingInProgress}
        >
          {sharingInProgress ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Share</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          title: 'Parcel Details',
          headerShown: true,
          headerStyle: {
            backgroundColor: Colors.light.background,
          },
          headerTintColor: Colors.light.text,
          headerShadowVisible: false,
        }}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading parcel details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#D32F2F" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchParcelDetails}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : parcel ? (
        <>
          {renderTabBar()}

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.light.primary]}
                tintColor={Colors.light.primary}
              />
            }
          >
            {activeTab === 'details' && renderDetailsTab()}
            {activeTab === 'tracking' && renderTrackingTab()}
            {activeTab === 'timeline' && renderTimelineTab()}
          </ScrollView>

          {renderActionButtons()}
        </>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: Colors.light.primary + '15',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  activeTabButtonText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTextContainer: {
    flex: 1,
  },
  sectionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  sectionSubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  detailsContainer: {
    marginTop: 8,
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
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  qrCodeContainer: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
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
  qrCodeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333333',
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  qrBackground: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  qrCodeSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
  },
  qrCodeTrackingCode: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  trackingCodeText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  timelineContainer: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.primary,
    marginRight: 16,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timelineDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
  },
  secondaryButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  phoneText: {
    fontSize: 14,
    color: Colors.light.tint,
    marginLeft: 8,
    textDecorationLine: 'underline',
  },
}); 