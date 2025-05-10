import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Dimensions,
  ViewStyle,
  ColorValue,
} from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 200;

interface ParallaxScrollViewProps {
  children: React.ReactNode;
  headerImage?: React.ReactNode;
  headerBackgroundColor?: {
    light: ColorValue;
    dark: ColorValue;
  };
  style?: ViewStyle;
}

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor = { light: '#fff', dark: '#000' },
  style,
}: ParallaxScrollViewProps) {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
      [HEADER_HEIGHT / 2, 0, -HEADER_HEIGHT / 3],
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
      [1.5, 1, 0.8],
      Extrapolate.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [0, HEADER_HEIGHT / 2],
      [1, 0],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor.light },
          headerStyle,
        ]}>
        {headerImage}
      </Animated.View>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}>
        {children}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  scrollContent: {
    paddingTop: HEADER_HEIGHT,
    minHeight: SCREEN_WIDTH + HEADER_HEIGHT,
  },
});
