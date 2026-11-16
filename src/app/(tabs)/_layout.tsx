import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors, useTheme } from '../../ThemeProvider';

export default function TabsLayout() {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: isDark
            ? 'rgba(28, 28, 30, 0.94)'
            : 'rgba(249, 249, 249, 0.94)',
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
          elevation: 0,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'images' : 'images-outline'}
              size={24}
              color={typeof color === 'string' ? color : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: 'Albums',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'albums' : 'albums-outline'}
              size={24}
              color={typeof color === 'string' ? color : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={24}
              color={typeof color === 'string' ? color : colors.tabBarInactive}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'settings-sharp' : 'settings-outline'}
              size={24}
              color={typeof color === 'string' ? color : colors.tabBarInactive}
            />
          ),
        }}
      />
    </Tabs>
  );
}
