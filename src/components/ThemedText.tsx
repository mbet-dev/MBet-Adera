import React from 'react';
import { Text, TextProps, useColorScheme } from 'react-native';

type TextType = 'title' | 'link' | 'default' | 'defaultSemiBold';

interface ThemedTextProps extends TextProps {
  lightColor?: string;
  darkColor?: string;
  type?: TextType;
}

export function ThemedText(props: ThemedTextProps) {
  const { style, lightColor, darkColor, type = 'default', ...otherProps } = props;
  const colorScheme = useColorScheme();

  const color = colorScheme === 'dark' ? darkColor ?? '#fff' : lightColor ?? '#000';

  const typeStyles = {
    title: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    link: {
      color: '#2196F3',
      textDecorationLine: 'underline',
    },
    default: {},
    defaultSemiBold: {
      fontWeight: '600',
    },
  };

  return <Text style={[{ color }, typeStyles[type], style]} {...otherProps} />;
}
