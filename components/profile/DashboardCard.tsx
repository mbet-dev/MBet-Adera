import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import Colors from '../../constants/Colors';

interface DashboardCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  onPress?: () => void;
  accentColor?: string;
  rightContent?: ReactNode;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  icon,
  onPress,
  accentColor = Colors.light.primary,
  rightContent,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.cardContent}>
        <View style={[styles.iconContainer, { backgroundColor: `${accentColor}10` }]}>
          {icon}
        </View>
        
        <View style={styles.cardTextContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
        </View>
        
        {rightContent && (
          <View style={styles.rightContent}>
            {rightContent}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  rightContent: {
    marginLeft: 8,
  },
});

export default DashboardCard; 