import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Platform, Image } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { storage } from '../src/utils/storage';
import { WebLayout } from '../src/components/layout/WebLayout';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Calculate a responsive width that works well on both web and mobile
const getItemWidth = () => {
  if (Platform.OS === 'web') {
    // On web, use either the screen width or a maximum size
    return Math.min(SCREEN_WIDTH, 480);
  }
  return SCREEN_WIDTH;
};

const ITEM_WIDTH = getItemWidth();

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
    const position = x.value / ITEM_WIDTH;
    const scale = interpolate(
      position,
      [index - 1, index, index + 1],
      [0.8, 1, 0.8],
      'clamp'
    );

    const opacity = interpolate(
      position,
      [index - 1, index, index + 1],
      [0.5, 1, 0.5],
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
    <View style={[styles.itemContainer, { width: ITEM_WIDTH }]}>
      <Animated.View
        style={[styles.placeholder, { backgroundColor: item.color }, animatedStyle]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={getIconForIndex(index)} size={Platform.OS === 'web' ? 80 : 64} color="#fff" />
        </View>
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
      const newIndex = Math.round(event.contentOffset.x / ITEM_WIDTH);
      if (newIndex !== Math.round(x.value / ITEM_WIDTH)) {
        runOnJS(setCurrentIndex)(newIndex);
      }
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

  const goToSlide = React.useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    setCurrentIndex(index);
  }, []);

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
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          onMomentumScrollEnd={(event) => {
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
            setCurrentIndex(newIndex);
          }}
          style={styles.flatList}
          contentContainerStyle={styles.flatListContent}
          snapToInterval={ITEM_WIDTH} // Make sure it snaps to each slide
          decelerationRate="fast" // Improve snap behavior
        />

        <View style={styles.footer}>
          <View style={styles.pagination}>
            {ONBOARDING_DATA.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentIndex && styles.paginationDotActive,
                ]}
                onPress={() => goToSlide(index)}
                activeOpacity={0.7}
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
    maxWidth: Platform.OS === 'web' ? 480 : undefined, // Match WebLayout content max-width
    width: Platform.OS === 'web' ? '100%' : undefined,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    alignItems: 'center',
  },
  itemContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  placeholder: {
    width: Platform.OS === 'web' ? 200 : SCREEN_WIDTH * 0.6,
    height: Platform.OS === 'web' ? 200 : SCREEN_WIDTH * 0.6,
    borderRadius: Platform.OS === 'web' ? 100 : SCREEN_WIDTH * 0.3,
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center', 
  },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#4CAF50',
  },
  description: {
    fontSize: Platform.OS === 'web' ? 16 : 16,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 20,
    maxWidth: 400,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
    ...(Platform.OS === 'web' ? { 
      transitionProperty: 'all', 
      transitionDuration: '0.3s', 
      transitionTimingFunction: 'ease' 
    } : {}),
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
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  skipButton: {
    padding: 15,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  startButton: {
    width: '100%',
    maxWidth: 300,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
