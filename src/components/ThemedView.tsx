import React from 'react';
import { View, ViewProps, useColorScheme } from 'react-native';

interface ThemedViewProps extends ViewProps {
  lightColor?: string;
  darkColor?: string;
}

export function ThemedView(props: ThemedViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const colorScheme = useColorScheme();

  const backgroundColor = colorScheme === 'dark' ? darkColor ?? '#000' : lightColor ?? '#fff';

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
