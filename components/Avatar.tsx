import { View, Image, Text, StyleSheet } from 'react-native';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: 'small' | 'medium' | 'large';
}

const SIZES = {
  small: 32,
  medium: 48,
  large: 80,
};

export function Avatar({ uri, name, size = 'medium' }: AvatarProps) {
  const dimension = SIZES[size];
  const fontSize = dimension / 2.5;

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={[styles.container, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: dimension, height: dimension, borderRadius: dimension / 2 }]} />
      ) : (
        <View style={[styles.fallback, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}>
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
