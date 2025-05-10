import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  TouchableOpacity, 
  Image, 
  Switch, 
  Platform, 
  ActivityIndicator, 
  Button 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { supabase } from '../../../src/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebLayout } from '../../../src/components/layout/WebLayout';
import Colors from '../../../constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';

type UserProfile = {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  profile_image_url: string | null;
  wallet_balance: number;
  created_at: string;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { 
          throw profileError;
        } 
        
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        if (walletError && walletError.code !== 'PGRST116') { 
          throw walletError;
        } 

        if (profileData) {
          setProfile(profileData as UserProfile);
        } else {
          setProfile({
            id: user.id,
            email: user.email || '',
            full_name: 'User', 
            phone_number: '',
            profile_image_url: null,
            wallet_balance: 0, 
            created_at: new Date().toISOString(),
          });
        }

        setBalance(walletData?.balance ?? 0);

      }
    } catch (error) {
      console.error('Error fetching profile or wallet:', error);
      setProfile(null); 
      setBalance(0); 
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem('user');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  const data = [
    {
      key: 'header',
      render: () => (
        <View style={styles.header}>
          <Image
            source={profile?.profile_image_url ? { uri: profile.profile_image_url } : require('../../../assets/images/avatar 9.jpg')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <Text style={styles.role}>Customer</Text>
        </View>
      ),
    },
    {
      key: 'account',
      render: () => (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Link href="/(tabs)/profile/wallet" asChild>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="wallet" size={24} color={Colors.light.primary} />
                <Text style={styles.menuItemText}>Wallet</Text>
              </View>
              <View style={styles.menuItemRight}>
                <Text style={styles.walletBalance}>ETB {(balance ?? 0).toFixed(2)}</Text>  
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </View>
            </TouchableOpacity>
          </Link>
          
          <Link href="/orders" asChild>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="cube" size={24} color={Colors.light.primary} />
                <Text style={styles.menuItemText}>My Orders</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          </Link>
          
          <Link href="/(tabs)/profile/edit" asChild>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Ionicons name="person" size={24} color={Colors.light.primary} />
                <Text style={styles.menuItemText}>Edit Profile</Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          </Link>
        </View>
      ),
    },
    {
      key: 'preferences',
      render: () => (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="moon" size={24} color={Colors.light.primary} />
              <Text style={styles.menuItemText}>Dark Mode</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#767577', true: Colors.light.primary }}
              thumbColor={darkMode ? '#fff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications" size={24} color={Colors.light.primary} />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#767577', true: Colors.light.primary }}
              thumbColor={notifications ? '#fff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="location" size={24} color={Colors.light.primary} />
              <Text style={styles.menuItemText}>Location Services</Text>
            </View>
            <Switch
              value={locationServices}
              onValueChange={setLocationServices}
              trackColor={{ false: '#767577', true: Colors.light.primary }}
              thumbColor={locationServices ? '#fff' : '#f4f3f4'}
            />
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/(modals)/terms')}
          >
            <MaterialIcons name="description" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>Terms & Conditions</Text>
            <MaterialIcons name="chevron-right" size={24} color="#999999" />
          </TouchableOpacity>
        </View>
      ),
    },
    {
      key: 'logout',
      render: () => (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <WebLayout>
      <View style={[styles.container, Platform.OS === 'web' && styles.webContainer]}>
        <FlatList
          data={data}
          renderItem={({ item }) => item.render()}
          keyExtractor={item => item.key}
          showsVerticalScrollIndicator={Platform.OS !== 'web'}
          contentContainerStyle={styles.contentContainer}
        />
      </View>
    </WebLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webContainer: {
    height: Platform.OS === 'web' ? '100%' : undefined,
    overflow: Platform.OS === 'web' ? 'scroll' : undefined,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  role: {
    fontSize: 14,
    color: Colors.light.success,
    fontWeight: '500',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 10,
  },
  walletBalance: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  logoutButton: {
    margin: 20,
    padding: 15,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  walletBalancePlaceholder: {
    fontSize: 16,
    marginBottom: 15,
    color: '#6c757d',
  },
});