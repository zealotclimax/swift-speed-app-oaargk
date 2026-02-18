
import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '@/styles/commonStyles';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'GPS Speed Tracker',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
