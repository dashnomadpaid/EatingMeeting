import { Tabs } from 'expo-router';
import { MapPin, Users, MessageCircle, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 50 + insets.bottom,
          paddingTop: 8,
        },
        animation: 'shift',
        ...(Platform.OS === 'ios' && {
          presentation: 'card',
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '맛집 탐색',
          tabBarIcon: ({ color }) => <MapPin color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '밥친구',
          tabBarIcon: ({ color }) => <Users color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '채팅',
          tabBarIcon: ({ color }) => <MessageCircle color={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color }) => <Settings color={color} size={26} />,
        }}
      />
    </Tabs>
  );
}
