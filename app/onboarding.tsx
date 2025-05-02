import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { storage } from '../src/utils/storage';
import { WebLayout } from '../src/components/layout/WebLayout';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingItem {
  title: string;
  description: string;
  color: string;
}

const ONBOARDING_DATA: OnboardingItem[] = [
  {
    title: 'Fast Delivery',
    description: 'Experience lightning-fast delivery services across Ethiopia',
    color: '#FF6B6B',
  },
  {
    title: 'Real-Time Tracking',
    description: 'Track your parcels in real-time with our advanced GPS system',
    color: '#4ECDC4',
  },
  {
    title: 'Secure Payments',
    description: 'Pay securely using YenePay, TeleBirr, or cash on delivery',
    color: '#45B7D1',
  },
  {
    title: 'Join MBet-Adera',
    description: 'Start your journey with us today!',
    color: '#96CEB4',
  },
];

const OnboardingItemComponent = React.memo(({ item, index, x }: { item: OnboardingItem; index: number; x: Animated.SharedValue<number> }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const position = x.value / SCREEN_WIDTH;
    const scale = interpolate(
      position,
      [-1, 0, 1, 2],
      [0.8, 1, 1, 0.8],
      'clamp'
    );

    const opacity = interpolate(
      position,
      [-1, 0, 1, 2],
      [0.5, 1, 1, 0.5],
      'clamp'
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const getIconForIndex = (idx: number) => {
    switch (idx) {
      case 0:
        return 'bicycle';
      case 1:
        return 'location';
      case 2:
        return 'card';
      default:
        return 'rocket';
    }
  };

  return (
    <View style={[styles.itemContainer, { width: SCREEN_WIDTH }]}>
      <Animated.View
        style={[styles.placeholder, { backgroundColor: item.color }, animatedStyle]}
      >
        <Ionicons name={getIconForIndex(index)} size={64} color="#fff" />
      </Animated.View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );
});

export default function OnboardingScreen() {
  const flatListRef = useAnimatedRef<Animated.FlatList<OnboardingItem>>();
  const x = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = React.useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      x.value = event.contentOffset.x;
    },
  });

  const onNextPress = React.useCallback(async () => {
    if (currentIndex < ONBOARDING_DATA.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      await storage.setItem('hasSeenOnboarding', 'true');
      router.replace('/auth/login');
    }
  }, [currentIndex]);

  const onSkipPress = React.useCallback(async () => {
    await storage.setItem('hasSeenOnboarding', 'true');
    router.replace('/auth/login');
  }, []);

  const renderItem = React.useCallback(({ item, index }: { item: OnboardingItem; index: number }) => (
    <OnboardingItemComponent item={item} index={index} x={x} />
  ), [x]);

  return (
    <WebLayout>
      <View style={styles.container}>
        <Animated.FlatList
          ref={flatListRef as any}
          data={ONBOARDING_DATA}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(newIndex);
          }}
        />

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {ONBOARDING_DATA.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles.buttons}>
            {currentIndex < ONBOARDING_DATA.length - 1 ? (
              <>
                <TouchableOpacity style={styles.skipButton} onPress={onSkipPress}>
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={onNextPress}>
                  <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.nextButton, styles.startButton]}
                onPress={onNextPress}
              >
                <Text style={styles.nextButtonText}>Get Started</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </WebLayout>
  );
}

const styles = StyleSheet.create<any>({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    maxWidth: Platform.OS === 'web' ? 800 : undefined,
    width: Platform.OS === 'web' ? '100%' : undefined,
    alignSelf: Platform.OS === 'web' ? 'center' : undefined,
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 40 : 20,
  },
  placeholder: {
    width: Platform.OS === 'web' ? 300 : SCREEN_WIDTH * 0.6,
    height: Platform.OS === 'web' ? 300 : SCREEN_WIDTH * 0.6,
    borderRadius: Platform.OS === 'web' ? 150 : SCREEN_WIDTH * 0.3,
    marginBottom: Platform.OS === 'web' ? 60 : 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#4CAF50',
  },
  description: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: Platform.OS === 'web' ? 40 : 20,
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: Platform.OS === 'web' ? 30 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 40 : 20,
    backgroundColor: '#fff',
    borderTopWidth: Platform.OS === 'web' ? StyleSheet.hairlineWidth : 0,
    borderTopColor: '#eee',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 30 : 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
    ...(Platform.OS === 'web' ? { transitionProperty: 'all', transitionDuration: '0.3s', transitionTimingFunction: 'ease' } : {}),
  },
  paginationDotActive: {
    backgroundColor: '#4CAF50',
    transform: [{ scale: 1.2 }],
    width: Platform.OS === 'web' ? 20 : 8,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: Platform.OS === 'web' ? 600 : undefined,
    alignSelf: 'center',
    width: '100%',
  },
  skipButton: {
    padding: 15,
  },
  skipButtonText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 25,
    minWidth: Platform.OS === 'web' ? 150 : 100,
    alignItems: 'center',
  },
  startButton: {
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 300 : undefined,
  },
  nextButtonText: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
