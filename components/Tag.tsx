import { View, Text, StyleSheet } from 'react-native';

interface TagProps {
  label: string;
  type?: 'diet' | 'budget' | 'category';
}

const TAG_COLORS = {
  diet: { bg: '#E8F5E9', text: '#2E7D32' },
  budget: { bg: '#FFF3E0', text: '#E65100' },
  category: { bg: '#E3F2FD', text: '#1565C0' },
};

export function Tag({ label, type = 'category' }: TagProps) {
  const colors = TAG_COLORS[type];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
});
