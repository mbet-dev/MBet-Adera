import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Colors from '../../constants/Colors';

interface ProgressRingProps {
  radius: number;
  strokeWidth: number;
  progress: number;
  color?: string;
  backgroundColor?: string;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  radius,
  strokeWidth,
  progress,
  color = Colors.light.primary,
  backgroundColor = '#E0E0E0',
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const size = radius * 2;
  const center = radius;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);
  
  useEffect(() => {
    // Animate the progress
    Animated.timing(animatedValue, {
      toValue: progress > 100 ? 100 : progress < 0 ? 0 : progress,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    
    // Update the animated progress value
    const listener = animatedValue.addListener(({ value }) => {
      setAnimatedProgress(value);
    });
    
    return () => {
      animatedValue.removeListener(listener);
    };
  }, [progress, animatedValue]);
  
  // Calculate the stroke dashoffset based on the progress
  const strokeDashoffset = circumference - (circumference * animatedProgress) / 100;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          {/* Background Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2}
            strokeWidth={strokeWidth}
            stroke={backgroundColor}
            fill="transparent"
          />
          
          {/* Progress Circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 2}
            strokeWidth={strokeWidth}
            stroke={color}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ProgressRing; 