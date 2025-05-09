import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  useWindowDimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/services/supabase';
import { router } from 'expo-router';

interface ParcelStats {
  active: number;
  delivered: number;
  total: number;
}

interface ParcelStatsDashboardProps {
  stats: ParcelStats;
  isLoading?: boolean;
  isWeb?: boolean;
}

export const ParcelStatsDashboard: React.FC<ParcelStatsDashboardProps> = ({ 
  stats, 
  isLoading = false,
  isWeb = Platform.OS === 'web'
}) => {
  const { width } = useWindowDimensions();
  const isWideScreen = width > 768;

  // Web specific dashboard with more details
  if (isWeb && isWideScreen) {
    return (
      <View style={styles.webDashboardContainer}>
        <View style={styles.webDashboardHeader}>
          <Text style={styles.webDashboardTitle}>Parcel Delivery Statistics</Text>
          <TouchableOpacity 
            style={styles.webViewAllButton}
            onPress={() => router.push('/(tabs)/orders')}
          >
            <Text style={styles.webViewAllText}>View All Parcels</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.webStatsContainer}>
          <View style={[styles.webStatCard, styles.activeCard]}>
            <View style={styles.webStatIconContainer}>
              <MaterialIcons name="inventory" size={32} color="#4CAF50" />
            </View>
            <View style={styles.webStatContent}>
              <Text style={styles.webStatValue}>{stats.active}</Text>
              <Text style={styles.webStatLabel}>Active Parcels</Text>
              <Text style={styles.webStatDescription}>Parcels in transit or pending pickup</Text>
            </View>
          </View>

          <View style={[styles.webStatCard, styles.deliveredCard]}>
            <View style={styles.webStatIconContainer}>
              <MaterialIcons name="done-all" size={32} color="#2196F3" />
            </View>
            <View style={styles.webStatContent}>
              <Text style={styles.webStatValue}>{stats.delivered}</Text>
              <Text style={styles.webStatLabel}>Delivered</Text>
              <Text style={styles.webStatDescription}>Successfully delivered parcels</Text>
            </View>
          </View>

          <View style={[styles.webStatCard, styles.totalCard]}>
            <View style={styles.webStatIconContainer}>
              <MaterialIcons name="summarize" size={32} color="#FFC107" />
            </View>
            <View style={styles.webStatContent}>
              <Text style={styles.webStatValue}>{stats.total}</Text>
              <Text style={styles.webStatLabel}>Total</Text>
              <Text style={styles.webStatDescription}>All your parcels</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Mobile version (also used on smaller web screens)
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statCard}>
        <MaterialIcons name="inventory" size={24} color="#4CAF50" />
        <Text style={styles.statValue}>{stats.active}</Text>
        <Text style={styles.statLabel}>Active</Text>
      </View>
      <View style={styles.statCard}>
        <MaterialIcons name="done-all" size={24} color="#2196F3" />
        <Text style={styles.statValue}>{stats.delivered}</Text>
        <Text style={styles.statLabel}>Delivered</Text>
      </View>
      <View style={styles.statCard}>
        <MaterialIcons name="summarize" size={24} color="#FFC107" />
        <Text style={styles.statValue}>{stats.total}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
    </View>
  );
};

// Hook to fetch parcel stats
export const useParcelStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = React.useState<ParcelStats>({
    active: 0,
    delivered: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchStats = React.useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_user_parcel_counts');
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setStats({
          total: data[0].total_count || 0,
          delivered: data[0].delivered_count || 0,
          active: data[0].active_count || 0
        });
      }
    } catch (err) {
      console.error('Error fetching parcel stats:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, isLoading, error, refetch: fetchStats };
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  statCard: {
    alignItems: 'center',
    width: '30%',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  // Web specific styles
  webDashboardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    marginBottom: 32,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      }
    }),
  },
  webDashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 16,
  },
  webDashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
  },
  webViewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  webViewAllText: {
    color: '#FFFFFF',
    marginRight: 8,
    fontWeight: '500',
  },
  webStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  webStatCard: {
    flexDirection: 'row',
    width: '31%',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  activeCard: {
    borderLeftColor: '#4CAF50',
  },
  deliveredCard: {
    borderLeftColor: '#2196F3',
  },
  totalCard: {
    borderLeftColor: '#FFC107',
  },
  webStatIconContainer: {
    marginRight: 16,
  },
  webStatContent: {
    flex: 1,
  },
  webStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
  },
  webStatLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666666',
  },
  webStatDescription: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
  },
}); 