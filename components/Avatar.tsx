import React from 'react';
import { View, StyleSheet, Image, ImageSourcePropType, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

export interface AvatarProps {
  size?: number;
  imageUrl?: string;
  name?: string;
  color?: string;
  source?: ImageSourcePropType;
  style?: StyleProp<ViewStyle> | StyleProp<ImageStyle>;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 40,
  imageUrl,
  name,
  color = '#4CAF50',
  source,
  style
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Support both source prop and imageUrl prop
  const imageSource = source || (imageUrl ? { uri: imageUrl } : undefined);

  if (imageSource) {
    return (
      <Image
        source={imageSource}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }

  if (name) {
    return (
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          style as StyleProp<ViewStyle>,
        ]}
      >
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
            },
          ]}
        >
          {getInitials(name)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style as StyleProp<ViewStyle>,
      ]}
    >
      <MaterialIcons name="person" size={size * 0.6} color="#FFFFFF" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
  },
  image: {
    backgroundColor: '#E0E0E0',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
}); 