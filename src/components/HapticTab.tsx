import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

interface HapticTabProps {
  label: string;
  onPress: () => void;
  isActive?: boolean;
}

export default function HapticTab({ label, onPress, isActive }: HapticTabProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.tab, isActive && styles.activeTab]}
      onPress={handlePress}
    >
      <Text style={[styles.label, isActive && styles.activeLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tab: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  label: {
    color: '#666',
  },
  activeLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
