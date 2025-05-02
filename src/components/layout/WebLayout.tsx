import React from 'react';
import { View, StyleSheet, Platform, ViewStyle, StyleProp } from 'react-native';

interface WebLayoutProps {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollEnabled?: boolean;
}

export function WebLayout({ 
  children, 
  contentContainerStyle, 
  scrollEnabled = true 
}: WebLayoutProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.content,
          contentContainerStyle
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    minHeight: Platform.OS === 'web' ? '100%' : '100%',
    width: '100%',
    overscrollBehavior: 'none',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    marginHorizontal: 'auto',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    minHeight: Platform.OS === 'web' ? '100%' : '100%',
  },
});
