import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';

export default function NotFoundScreen() {
  return (
    <View style={styles.wrapper}>
      <ScreenHeader title="페이지를 찾을 수 없습니다" />
      <View style={styles.container}>
        <Text style={styles.text}>페이지를 찾을 수 없습니다.</Text>
        <Link href="/" style={styles.link}>
          <Text>홈으로 이동하기</Text>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
});
