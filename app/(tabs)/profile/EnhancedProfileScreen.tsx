import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  useWindowDimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';

import { supabase } from '../../../src/services/supabase';
import Colors from '../../../constants/Colors';
import { walletService } from '../../../src/services/walletService';
import errorHandler from '../../../src/utils/errorHandler';

// Custom Components
import DashboardCard from '../../../components/profile/DashboardCard';
import SettingsListItem from '../../../components/profile/SettingsListItem';
import ProgressRing from '../../../components/profile/ProgressRing';

// Types
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  profile_image_url: string | null;
  created_at: string;
  updated_at?: string;
  user_role?: string;
  is_verified?: boolean;
}

interface DeliveryStats {
  total: number;
  completed: number;
  active: number;
  cancelled: number;
}

interface WalletInfo {
  balance: number;
  pending_balance: number;
  currency: string;
  recent_transactions: any[];
}

interface ParcelResponse {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  package_size: string;
  weight: number;
  is_fragile: boolean;
  sender: {
    full_name: string;
  } | null;
  receiver: {
    full_name: string;
  } | null;
}

interface Parcel {
  id: string;
  tracking_code: string;
  status: string;
  created_at: string;
  package_size: string;
  weight: number;
  is_fragile: boolean;
  sender: {
    full_name: string;
  } | null;
  receiver: {
    full_name: string;
  } | null;
}

export default function EnhancedProfileScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  
  // Animation values
  const scrollY = new Animated.Value(0);
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [200, 100],
    extrapolate: 'clamp',
  });
  
  // State variables
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({
    balance: 0,
    pending_balance: 0,
    currency: 'ETB',
    recent_transactions: [],
  });
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats>({
    total: 0,
    completed: 0,
    active: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState({
    darkMode: false,
    notifications: true,
    locationServices: true,
    biometricAuth: false,
  });
  
  // Load user data when component mounts
  useEffect(() => {
    loadUserData();
  }, []);
  
  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData();
      return () => {};
    }, [])
  );
  
  // Load all user data
  const loadUserData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUserProfile(),
        fetchWalletInfo(),
        fetchDeliveryStats(),
        fetchUserPreferences(),
      ]);
    } catch (error) {
      errorHandler.errorHandler.handleError(error, 'ProfileScreen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('No authenticated user found');
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        throw profileError;
      }
      
      if (profileData) {
        setProfile({
          id: profileData.id,
          email: profileData.email,
          full_name: profileData.full_name,
          phone_number: profileData.phone_number,
          profile_image_url: profileData.profile_picture_url,
          created_at: profileData.created_at,
          user_role: profileData.role,
          is_verified: profileData.verification_status?.email_verified || false,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  };
  
  // Fetch wallet information
  const fetchWalletInfo = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('No authenticated user found');
      }
      
      const { balance, error } = await walletService.getBalance();
      
      if (error) {
        throw error;
      }
      
      const { transactions, error: txError } = await walletService.getTransactionHistory();
      
      if (txError) {
        throw txError;
      }
      
      setWalletInfo({
        balance,
        pending_balance: transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + t.amount, 0),
        currency: 'ETB',
        recent_transactions: transactions.slice(0, 3),
      });
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      throw error;
    }
  };
  
  // Fetch delivery statistics
  const fetchDeliveryStats = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('No authenticated user found');
      }

      // First get the user's profile to ensure we have the correct ID
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        throw new Error('Profile not found');
      }

      // Get all parcels for this user
      const { data: parcels, error: parcelsError } = await supabase
        .from('parcels')
        .select('id, status')
        .eq('sender_id', profileData.id);

      if (parcelsError) {
        throw parcelsError;
      }

      // Calculate statistics
      const stats = {
        total: parcels?.length || 0,
        completed: parcels?.filter(p => p.status === 'delivered').length || 0,
        active: parcels?.filter(p => ['pending', 'accepted', 'picked_up', 'in_transit', 'out_for_delivery'].includes(p.status)).length || 0,
        cancelled: parcels?.filter(p => p.status === 'cancelled').length || 0,
      };

      setDeliveryStats(stats);
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
      errorHandler.errorHandler.handleError(error, 'DeliveryStats');
      // Set default stats on error
      setDeliveryStats({
        total: 0,
        completed: 0,
        active: 0,
        cancelled: 0,
      });
    }
  };
  
  // Fetch user preferences
  const fetchUserPreferences = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('No authenticated user found');
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        throw profileError;
      }
      
      if (profileData?.preferences) {
        setPreferences({
          darkMode: profileData.preferences.dark_mode || false,
          notifications: profileData.preferences.notifications || true,
          locationServices: profileData.preferences.location_services || true,
          biometricAuth: profileData.preferences.biometric_auth || false,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      throw error;
    }
  };
  
  // Handle preference toggles
  const handleTogglePreference = async (key: keyof typeof preferences) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('No authenticated user found');
      }
      
      const newPreferences = {
        ...preferences,
        [key]: !preferences[key],
      };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preferences: {
            dark_mode: newPreferences.darkMode,
            notifications: newPreferences.notifications,
            location_services: newPreferences.locationServices,
            biometric_auth: newPreferences.biometricAuth,
          }
        })
        .eq('id', user.id);
      
      if (updateError) {
        throw updateError;
      }
      
      setPreferences(newPreferences);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Error updating preferences:', error);
      errorHandler.errorHandler.handleError(error, 'PreferencesUpdate');
    }
  };
  
  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      
      // Only use Haptics on native platforms
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      router.replace('/auth/login');
    } catch (error) {
      errorHandler.errorHandler.handleError(error, 'Logout');
      setTimeout(() => router.replace('/auth/login'), 1000);
    } finally {
      setLoading(false);
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Unknown date';
    }
  };
  
  // Format parcel status for display
  const formatParcelStatus = (status: string): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Accepted';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // Get color for parcel status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#F59E0B'; // Amber
      case 'accepted': return '#3B82F6'; // Blue
      case 'picked_up': return '#8B5CF6'; // Purple
      case 'in_transit': return '#10B981'; // Green
      case 'delivered': return '#059669'; // Emerald
      case 'cancelled': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </SafeAreaView>
    );
  }
  
  // Render the profile screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={[Colors.light.primary, '#065373']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileImageContainer}>
              <Image
                source={profile?.profile_image_url 
                  ? { uri: profile.profile_image_url } 
                  : require('../../../assets/images/avatar 9.jpg')}
                style={styles.profileImage}
              />
              {profile?.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                </View>
              )}
            </View>
            
            <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
            <Text style={styles.profileEmail}>{profile?.email}</Text>
            
            <View style={styles.membershipRow}>
              <Text style={styles.memberSince}>
                Member since {formatDate(profile?.created_at || new Date().toISOString())}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>
                  {profile?.user_role?.toUpperCase() || 'CUSTOMER'}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/(tabs)/profile/edit')}
          >
            <Ionicons name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUserData();
            }}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
      >
        {/* Dashboard Cards */}
        <View style={styles.dashboardContainer}>
          <DashboardCard
            title="Wallet Balance"
            value={`ETB ${walletInfo.balance.toFixed(2)}`}
            icon={<Ionicons name="wallet" size={24} color={Colors.light.primary} />}
            onPress={() => router.push('/(tabs)/profile/wallet')}
            rightContent={
              walletInfo.pending_balance > 0 ? (
                <View style={styles.pendingBalanceBadge}>
                  <Text style={styles.pendingBalanceText}>
                    +ETB {walletInfo.pending_balance.toFixed(2)} pending
                  </Text>
                </View>
              ) : null
            }
          />
          
          <DashboardCard
            title="Active Deliveries"
            value={deliveryStats.active.toString()}
            icon={<MaterialCommunityIcons name="truck-delivery" size={24} color="#F59E0B" />}
            onPress={() => router.push('/orders')}
            accentColor="#F59E0B"
          />
          
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <View style={styles.statsHeader}>
                <Text style={styles.statsTitle}>Delivery Stats</Text>
                <TouchableOpacity onPress={() => router.push('/orders')}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.statsContent}>
                <View style={styles.progressRingContainer}>
                  <ProgressRing
                    radius={50}
                    strokeWidth={10}
                    progress={
                      deliveryStats.total > 0 
                        ? (deliveryStats.completed / deliveryStats.total) * 100 
                        : 0
                    }
                    color={Colors.light.success}
                  />
                  <View style={styles.progressRingInner}>
                    <Text style={styles.progressRingText}>
                      {deliveryStats.total > 0 
                        ? Math.round((deliveryStats.completed / deliveryStats.total) * 100) 
                        : 0}%
                    </Text>
                    <Text style={styles.progressRingLabel}>Complete</Text>
                  </View>
                </View>
                
                <View style={styles.statsDetails}>
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: Colors.light.success }]} />
                    <Text style={styles.statLabel}>Completed</Text>
                    <Text style={styles.statValue}>{deliveryStats.completed}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: Colors.light.warning }]} />
                    <Text style={styles.statLabel}>Active</Text>
                    <Text style={styles.statValue}>{deliveryStats.active}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: Colors.light.error }]} />
                    <Text style={styles.statLabel}>Cancelled</Text>
                    <Text style={styles.statValue}>{deliveryStats.cancelled}</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <View style={[styles.statDot, { backgroundColor: Colors.light.primary }]} />
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>{deliveryStats.total}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <SettingsListItem
            icon="person"
            label="Edit Profile"
            onPress={() => router.push('/(tabs)/profile/edit')}
            showChevron={true}
          />
          
          <SettingsListItem
            icon="wallet"
            label="Wallet"
            onPress={() => router.push('/(tabs)/profile/wallet')}
            showChevron={true}
            rightContent={
              <Text style={styles.walletBalanceBadge}>
                ETB {walletInfo.balance.toFixed(2)}
              </Text>
            }
          />
          
          <SettingsListItem
            icon="cube"
            label="My Deliveries"
            onPress={() => router.push('/orders')}
            showChevron={true}
            rightContent={
              deliveryStats.active > 0 ? (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{deliveryStats.active}</Text>
                </View>
              ) : null
            }
          />
          
          <SettingsListItem
            icon="notifications"
            label="Notifications"
            onPress={() => {}}
            showChevron={true}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <SettingsListItem
            icon="moon"
            label="Dark Mode"
            showToggle={true}
            toggleValue={preferences.darkMode}
            onToggleChange={() => handleTogglePreference('darkMode')}
          />
          
          <SettingsListItem
            icon="notifications"
            label="Push Notifications"
            showToggle={true}
            toggleValue={preferences.notifications}
            onToggleChange={() => handleTogglePreference('notifications')}
          />
          
          <SettingsListItem
            icon="location"
            label="Location Services"
            showToggle={true}
            toggleValue={preferences.locationServices}
            onToggleChange={() => handleTogglePreference('locationServices')}
          />
          
          <SettingsListItem
            icon="finger-print"
            label="Biometric Authentication"
            showToggle={true}
            toggleValue={preferences.biometricAuth}
            onToggleChange={() => handleTogglePreference('biometricAuth')}
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingsListItem
            icon="help-circle"
            label="Help & Support"
            onPress={() => {}}
            showChevron={true}
          />
          
          <SettingsListItem
            icon="information-circle"
            label="About MBet-Adera"
            onPress={() => {}}
            showChevron={true}
          />
          
          <SettingsListItem
            icon="document-text"
            label="Terms & Conditions"
            onPress={() => router.push('/(modals)/terms')}
            showChevron={true}
          />
          
          <SettingsListItem
            icon="shield-checkmark"
            label="Privacy Policy"
            onPress={() => {}}
            showChevron={true}
          />
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out" size={20} color="#fff" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  header: {
    overflow: 'hidden',
  },
  headerGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.light.success,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  membershipRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberSince: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    marginLeft: 10,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  editButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  contentContainer: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  dashboardContainer: {
    padding: 16,
  },
  statsContainer: {
    marginTop: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.light.primary,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressRingContainer: {
    position: 'relative',
    marginRight: 16,
  },
  progressRingInner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  progressRingLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  statsDetails: {
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: Colors.light.text,
  },
  walletBalanceBadge: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  badgeContainer: {
    backgroundColor: Colors.light.primary,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBalanceBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBalanceText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: Colors.light.error,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  versionText: {
    textAlign: 'center',
    marginTop: 16,
    color: Colors.light.textSecondary,
    fontSize: 12,
  },
}); 