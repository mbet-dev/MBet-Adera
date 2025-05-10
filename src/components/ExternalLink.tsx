import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, Linking } from 'react-native';
import { ThemedText } from './ThemedText';

interface ExternalLinkProps extends TouchableOpacityProps {
  href: string;
  children: React.ReactNode;
}

export function ExternalLink({ href, children, style, ...otherProps }: ExternalLinkProps) {
  const handlePress = React.useCallback(() => {
    Linking.openURL(href);
  }, [href]);

  return (
    <TouchableOpacity
      style={style}
      onPress={handlePress}
      {...otherProps}
    >
      {typeof children === 'string' ? (
        <ThemedText style={{ textDecorationLine: 'underline' }}>
          {children}
        </ThemedText>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
