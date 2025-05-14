import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

interface SettingsListItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  showChevron?: boolean;
  showToggle?: boolean;
  toggleValue?: boolean;
  onToggleChange?: () => void;
  rightContent?: ReactNode;
}

const SettingsListItem: React.FC<SettingsListItemProps> = ({
  icon,
  label,
  onPress,
  showChevron = false,
  showToggle = false,
  toggleValue = false,
  onToggleChange,
  rightContent,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !showToggle}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={20} color={Colors.light.primary} />
      </View>
      
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.rightContainer}>
        {rightContent}
        
        {showToggle && (
          <Switch
            value={toggleValue}
            onValueChange={onToggleChange}
            trackColor={{ false: '#ddd', true: `${Colors.light.primary}80` }}
            thumbColor={toggleValue ? Colors.light.primary : '#f4f3f4'}
            ios_backgroundColor="#ddd"
          />
        )}
        
        {showChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.textSecondary}
            style={styles.chevron}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${Colors.light.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 16,
    color: Colors.light.text,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chevron: {
    marginLeft: 8,
  },
});

export default SettingsListItem; 