import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';

interface AvatarProps {
  size?: number;
  imageUrl?: string;
  name?: string;
  color?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  size = 40,
  imageUrl,
  name,
  color = '#4CAF50'
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
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