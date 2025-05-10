import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Colors from '../../constants/Colors';
import { useRouter } from 'expo-router';

const COLORS = Colors.light; // Using light theme colors

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    height: Platform.OS === 'ios' ? 88 : 60,
    paddingBottom: Platform.OS === 'ios' ? 34 : 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    color: '#333333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

// Determine if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export default function TabLayout() {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Skip if not in browser or no user
    if (!isBrowser || !user) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const setupRealtime = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get initial unread count
        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('read', false);

        if (countError) throw countError;

        if (mounted) {
          setUnreadCount(count || 0);
        }

        // Only setup realtime subscription if not in web environment
        if (Platform.OS !== 'web') {
          const channel = supabase
            .channel('unread_messages')
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `recipient_id=eq.${user.id}`,
              },
              (payload) => {
                if (mounted) {
                  setUnreadCount((prev) => prev + 1);
                }
              }
            )
            .subscribe((status) => {
              if (status !== 'SUBSCRIBED') {
                console.warn('Realtime subscription status:', status);
              }
            });

          return () => {
            mounted = false;
            supabase.removeChannel(channel);
          };
        }
      } catch (err) {
        console.error('Error in realtime setup:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    const cleanup = setupRealtime();
    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [user, isBrowser]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#FF3B30' }}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#666666',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#333333',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create-order"
        options={{
          title: 'New Delivery',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="truck-plus" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color} />,
          headerShown: false, // Hide the header as we have a custom one in the enhanced view
        }}
        listeners={{
          tabPress: (e) => {
            // Override the tab press to redirect to the enhanced orders screen
            if (Platform.OS === 'web') {
              e.preventDefault();
              router.push('/(tabs)/orders/enhanced-orders' as any);
            }
          },
        }}
      />

      <Tabs.Screen
        name="orders/[id]"
        options={{
          title: 'Parcel Details',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list-alt" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <View>
              <Ionicons name="chatbubble-outline" size={size} color={color} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Account',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
