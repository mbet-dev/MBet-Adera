import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import Colors from '../constants/Colors';
import { useColorScheme } from 'react-native';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [open, setOpen] = useState(false);
  const rotate = useSharedValue(0);
  const height = useSharedValue(0);
  const colorScheme = useColorScheme() ?? 'light';
  const color = Colors[colorScheme].text;

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotate.value}deg` }],
  }));

  const handlePress = () => {
    setOpen(!open);
    rotate.value = withTiming(open ? 0 : 90, { duration: 150 });
    height.value = withTiming(open ? 0 : 1, { duration: 150 });
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.titleContainer}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <Animated.View style={arrowStyle}>
          <Ionicons name="chevron-forward" size={20} color={color} />
        </Animated.View>
      </Pressable>
      {open && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 8,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    backgroundColor: '#F9F9F9',
  },
});
