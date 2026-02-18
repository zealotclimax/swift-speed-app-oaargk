
import React from 'react';
import { Platform } from 'react-native';
import FloatingTabBar from '@/components/FloatingTabBar';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  if (Platform.OS === 'ios') {
    return null;
  }

  const tabs = [
    {
      name: 'Speed Tracker',
      route: '/(tabs)/(home)' as any,
      ios_icon_name: 'speedometer',
      android_material_icon_name: 'speed' as any,
    },
  ];

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(home)" />
      </Stack>
      <FloatingTabBar tabs={tabs} />
    </>
  );
}
