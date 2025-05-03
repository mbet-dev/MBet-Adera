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
import { useAuth } from '@/context/AuthContext';
import { parcelService } from '@/services/parcelService';

// Import types from the parcel types file
import { Parcel, ParcelStatus, Profile } from '@/types/parcel';

// Status configuration for styling and messages
const statusConfig: Record<ParcelStatus, {
  label: string;
  description: string;
  icon: string;
  color: string;
  backgroundColor: string;
}> = {
  pending: {
    label: 'Pending',
    description: 'Your parcel is waiting to be confirmed.',
    icon: 'time-outline',
    color: '#FB8C00',
    backgroundColor: '#FFF3E0',
  },
  confirmed: {
    label: 'Confirmed',
    description: 'Your parcel has been confirmed and will be picked up soon.',
    icon: 'checkmark-circle-outline',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  picked_up: {
    label: 'Picked Up',
    description: 'Your parcel has been picked up and is on its way.',
    icon: 'archive-outline',
    color: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  in_transit: {
    label: 'In Transit',
    description: 'Your parcel is on its way to the destination.',
    icon: 'car-outline',
    color: '#7B1FA2',
    backgroundColor: '#F3E5F5',
  },
  delivered: {
    label: 'Delivered',
    description: 'Your parcel has been delivered successfully.',
    icon: 'checkmark-done-outline',
    color: '#388E3C',
    backgroundColor: '#E8F5E9',
  },
  cancelled: {
    label: 'Cancelled',
    description: 'This delivery has been cancelled.',
    icon: 'close-circle-outline',
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
};

const { width: windowWidth } = Dimensions.get('window');

export default function ParcelDetailsModal() {
  const params = useLocalSearchParams();
  const id = params.id as string;
  const { user } = useAuth();
  const qrRef = useRef<any>(null);
  
  const [loading, setLoading] = useState(true);
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [sender, setSender] = useState<Profile | null>(null);
  const [recipient, setRecipient] = useState<Profile | null>(null);
  const [sharingInProgress, setSharingInProgress] = useState(false);
  const [qrValue, setQrValue] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'tracking' | 'timeline'>('details');
  const [error, setError] = useState<string | null>(null);

  // Effect for loading the parcel
  useEffect(() => {
    if (!id || !user) {
      console.log("Missing required parameters:", { id, userId: user?.id });
      return;
    }
    
    console.log("Parcel ID from params:", id);
    fetchParcelDetails();
  }, [id, user]);

  // Setup QR code value
  useEffect(() => {
    if (parcel?.tracking_code) {
      const deepLink = `mbetadera://track/${parcel.tracking_code}`;
      const webUrl = `https://mbetadera.app/track/${parcel.tracking_code}`;
      setQrValue(`${deepLink}?web=${webUrl}`);
    }
  }, [parcel?.tracking_code]);

  const fetchParcelDetails = async () => {
    if (!user || !id) {
      console.log("Missing user or parcel ID");
      return;
    }
    
    console.log("Attempting to fetch parcel with ID:", id);
    console.log("User ID:", user?.id);
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch parcel details with correctly typed parameters
      const parcelData = await parcelService.getParcelById(id, user.id);
      
      if (!parcelData) {
        console.log("Parcel data not found for ID:", id);
        setError("Parcel not found or you do not have permission to view it");
        return;
      }
      
      console.log("Successfully fetched parcel:", parcelData.id);
      console.log("Parcel data:", JSON.stringify(parcelData, null, 2));
      
      setParcel(parcelData);
      
      // Fetch sender and recipient profiles if available
      if (parcelData.sender_id) {
        fetchProfile(parcelData.sender_id).then(setSender);
      }
      
      if (parcelData.receiver_id) {
        fetchProfile(parcelData.receiver_id).then(setRecipient);
      }
    } catch (error) {
      console.error('Error fetching parcel details:', error);
      setError('Could not load parcel details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async (profileId: string): Promise<Profile | null> => {
    if (!profileId) return null;
    
    try {
      console.log("Fetching profile for ID:", profileId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        throw error;
      }
      
      return data as Profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  // Function to capture QR code as an image
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

  // Function to handle sharing with QR code
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
        // Native sharing implementation
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
      Alert.alert('Sharing Failed', 'Could not share tracking information. Please try again.');
    } finally {
      setSharingInProgress(false);
    }
  };

  const handleCall = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('No Phone Number', 'No phone number available for this contact.');
    }
  };

  const handleTrack = () => {
    if (parcel) {
      router.push(`/track-map?id=${parcel.id}` as any);
    }
  };

  const handleChat = () => {
    if (parcel) {
      router.push({
        pathname: '/chat/[parcelId]',
        params: { parcelId: parcel.id }
      } as any);
    }
  };

  const handleCancel = async () => {
    if (!parcel) return;
    
    Alert.alert(
      'Cancel Delivery',
      'Are you sure you want to cancel this delivery?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await parcelService.updateParcelStatus(parcel.id, 'cancelled');
              await fetchParcelDetails();
              Alert.alert('Success', 'Delivery cancelled successfully');
            } catch (error) {
              console.error('Error cancelling delivery:', error);
              Alert.alert('Error', 'Could not cancel delivery. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'details' && styles.activeTabButton]}
        onPress={() => setActiveTab('details')}
      >
        <Ionicons
          name="information-circle-outline"
          size={20}
          color={activeTab === 'details' ? '#1976D2' : '#757575'}
        />
        <Text
          style={[styles.tabButtonText, activeTab === 'details' && styles.activeTabButtonText]}
        >
          Details
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'tracking' && styles.activeTabButton]}
        onPress={() => setActiveTab('tracking')}
      >
        <Ionicons
          name="locate-outline"
          size={20}
          color={activeTab === 'tracking' ? '#1976D2' : '#757575'}
        />
        <Text
          style={[styles.tabButtonText, activeTab === 'tracking' && styles.activeTabButtonText]}
        >
          Tracking
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tabButton, activeTab === 'timeline' && styles.activeTabButton]}
        onPress={() => setActiveTab('timeline')}
      >
        <Ionicons
          name="time-outline"
          size={20}
          color={activeTab === 'timeline' ? '#1976D2' : '#757575'}
        />
        <Text
          style={[styles.tabButtonText, activeTab === 'timeline' && styles.activeTabButtonText]}
        >
          Timeline
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderQRCode = useCallback(() => {
    if (!parcel?.tracking_code || !qrValue) return null;
    
    const logoSize = 60;
    
    return (
      <View style={styles.qrCodeContainer}>
        <Text style={styles.qrCodeTitle}>Scan to Track</Text>
        
        <ViewShot ref={qrRef} options={{ format: 'png', quality: 1 }} style={styles.qrCodeWrapper}>
          <View style={styles.qrBackground}>
            <QRCode
              value={qrValue}
              size={200}
              backgroundColor="#FFFFFF"
              color="#000000"
              logo={require('../../assets/images/logo2.png')}
              logoSize={logoSize}
              logoBackgroundColor="white"
              logoBorderRadius={10}
            />
          </View>
        </ViewShot>
        
        <Text style={styles.qrCodeSubtitle}>Share this QR code to let others track this parcel</Text>
        <Text style={styles.qrCodeTrackingCode}>
          Tracking Code: <Text style={styles.trackingCodeText}>{parcel.tracking_code}</Text>
        </Text>
      </View>
    );
  }, [parcel?.tracking_code, qrValue]);

  const renderPersonSection = (title: string, person: Profile | null, contact: any) => {
    const displayName = person?.full_name || contact?.name || 'N/A';
    const phoneNumber = person?.phone_number || contact?.phone || 'N/A';
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.personContainer}>
          <View style={styles.personDetails}>
            <View style={styles.personRow}>
              <Ionicons name="person" size={20} color="#666" />
              <Text style={styles.personName}>{displayName}</Text>
            </View>
            
            <View style={styles.personRow}>
              <Ionicons name="call" size={20} color="#666" />
              <Text style={styles.personPhone}>{phoneNumber}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(phoneNumber !== 'N/A' ? phoneNumber : undefined)}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
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

  const renderDetailsTab = () => {
    if (!parcel) return null;
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Details</Text>
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Size</Text>
              <Text style={styles.detailValue}>
                {parcel.package_size ? 
                  parcel.package_size.charAt(0).toUpperCase() + 
                  parcel.package_size.slice(1) : 'N/A'}
              </Text>
            </View>
            
            {parcel.weight && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Weight</Text>
                <Text style={styles.detailValue}>{parcel.weight} kg</Text>
              </View>
            )}
            
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
            
            {parcel.estimated_price && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated Price</Text>
                <Text style={styles.detailValue}>{formatCurrency(parcel.estimated_price)}</Text>
              </View>
            )}
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created</Text>
              <Text style={styles.detailValue}>{formatDate(parcel.created_at)}</Text>
            </View>
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
              <Text style={styles.buttonText}>Share Tracking Details</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderTimelineTab = () => {
    if (!parcel) return null;
    
    const statuses: ParcelStatus[] = ['pending', 'confirmed', 'picked_up', 'in_transit', 'delivered'];
    const currentStatusIndex = statuses.indexOf(parcel.status as ParcelStatus);
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.timelineContainer}>
          {statuses.map((status, index) => {
            const isCompleted = index <= currentStatusIndex && parcel.status !== 'cancelled';
            const isActive = index === currentStatusIndex && parcel.status !== 'cancelled';
            const statusInfo = statusConfig[status];
            
            return (
              <View key={status} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View 
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.completedDot,
                      isActive && styles.activeDot
                    ]}
                  >
                    {isCompleted && (
                      <Ionicons
                        name={isActive ? statusInfo.icon as any : "checkmark" as any}
                        size={16}
                        color="#FFFFFF"
                      />
                    )}
                  </View>
                  
                  {index < statuses.length - 1 && (
                    <View 
                      style={[
                        styles.timelineLine,
                        index < currentStatusIndex && styles.completedLine
                      ]} 
                    />
                  )}
                </View>
                
                <View style={styles.timelineContent}>
                  <Text 
                    style={[
                      styles.timelineTitle,
                      isActive && styles.activeTimelineTitle,
                      isCompleted && !isActive && styles.completedTimelineTitle
                    ]}
                  >
                    {statusInfo.label}
                  </Text>
                  
                  <Text style={styles.timelineDescription}>
                    {statusInfo.description}
                  </Text>
                  
                  {isActive && (
                    <View style={[styles.timelineStatusBadge, { backgroundColor: statusInfo.backgroundColor }]}>
                      <Text style={[styles.timelineStatusText, { color: statusInfo.color }]}>
                        Current Status
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
          
          {parcel.status === 'cancelled' && (
            <View style={styles.cancelledContainer}>
              <View style={styles.cancelledBadge}>
                <Ionicons name="close-circle" size={24} color="#D32F2F" />
                <Text style={styles.cancelledText}>Delivery Cancelled</Text>
              </View>
              <Text style={styles.cancelledDescription}>
                This delivery has been cancelled and will not be processed further.
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderActionButtons = () => {
    if (!parcel) return null;
    
    return (
      <View style={styles.actionsContainer}>
        {parcel.status !== 'cancelled' && parcel.status !== 'delivered' && (
          <>
            <TouchableOpacity style={styles.actionButton} onPress={handleChat}>
              <Ionicons name="chatbubble" size={24} color="#FFFFFF" />
              <Text style={styles.actionText}>Chat</Text>
            </TouchableOpacity>
            
            {parcel.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Ionicons name="close-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  // Main render function
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Parcel Details',
          headerShown: true,
          presentation: 'modal',
          headerTitleStyle: {
            fontWeight: '600',
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <SafeAreaView style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading parcel details...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#D32F2F" />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchParcelDetails}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : parcel ? (
          <>
            {/* Parcel Header Section */}
            <LinearGradient
              colors={['#1976D2', '#42A5F5']}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerContent}>
                <View style={styles.trackingInfo}>
                  <Text style={styles.trackingLabel}>TRACKING NUMBER</Text>
                  <Text style={styles.trackingCode}>{parcel.tracking_code}</Text>
                  <Text style={styles.date}>
                    Created on {formatDate(parcel.created_at)}
                  </Text>
                </View>
                
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: statusConfig[parcel.status as ParcelStatus]?.backgroundColor || '#F5F5F5' }
                ]}>
                  <Ionicons 
                    name={statusConfig[parcel.status as ParcelStatus]?.icon as any || 'help-circle-outline'} 
                    size={16} 
                    color={statusConfig[parcel.status as ParcelStatus]?.color || '#757575'} 
                  />
                  <Text style={[
                    styles.statusText,
                    { color: statusConfig[parcel.status as ParcelStatus]?.color || '#757575' }
                  ]}>
                    {statusConfig[parcel.status as ParcelStatus]?.label || parcel.status?.toUpperCase()}
                  </Text>
                </View>
              </View>
            </LinearGradient>
            
            {/* Tab Bar */}
            {renderTabBar()}
            
            {/* Tab Content */}
            <ScrollView 
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'details' && renderDetailsTab()}
              {activeTab === 'tracking' && renderTrackingTab()}
              {activeTab === 'timeline' && renderTimelineTab()}
            </ScrollView>
            
            {/* Action Buttons */}
            {renderActionButtons()}
          </>
        ) : (
          <View style={styles.notFoundContainer}>
            <MaterialCommunityIcons name="package-variant" size={64} color="#757575" />
            <Text style={styles.notFoundTitle}>Parcel Not Found</Text>
            <Text style={styles.notFoundText}>
              We couldn't find this parcel. It may have been deleted or you don't have access to view it.
            </Text>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  trackingInfo: {
    flex: 1,
  },
  trackingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  trackingCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#1976D2',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 6,
  },
  activeTabButtonText: {
    color: '#1976D2',
    fontWeight: '600',
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
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
  personContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  personDetails: {
    flex: 1,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  personName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginLeft: 8,
  },
  personPhone: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  qrBackground: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeSubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  qrCodeTrackingCode: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },
  trackingCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#9E9E9E',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 24,
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
  timelineContainer: {
    paddingVertical: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  completedDot: {
    backgroundColor: '#4CAF50',
  },
  activeDot: {
    backgroundColor: '#1976D2',
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    left: 11,
    width: 2,
    height: '100%',
    backgroundColor: '#E0E0E0',
    zIndex: 0,
  },
  completedLine: {
    backgroundColor: '#4CAF50',
  },
  timelineContent: {
    marginLeft: 16,
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activeTimelineTitle: {
    color: '#1976D2',
  },
  completedTimelineTitle: {
    color: '#4CAF50',
  },
  timelineDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timelineStatusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  timelineStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cancelledContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelledText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginLeft: 8,
  },
  cancelledDescription: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  errorTitle: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  notFoundTitle: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  notFoundText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
}); 