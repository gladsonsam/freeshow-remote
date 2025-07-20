import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import RemoteScreen from './src/screens/RemoteScreen';
import ConnectScreen from './src/screens/ConnectScreen';
import ShowsScreen from './src/screens/ShowsScreen';
import { FreeShowTheme } from './src/theme/FreeShowTheme';
import { ConnectionProvider } from './src/contexts/ConnectionContext';

const Tab = createBottomTabNavigator();

// FreeShow-themed navigation theme
const FreeShowNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: FreeShowTheme.colors.secondary,
    background: FreeShowTheme.colors.primary,
    card: FreeShowTheme.colors.primaryDarker,
    text: FreeShowTheme.colors.text,
    border: FreeShowTheme.colors.primaryLighter,
    notification: FreeShowTheme.colors.secondary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ConnectionProvider>
        <NavigationContainer theme={FreeShowNavigationTheme}>
          <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName: keyof typeof Ionicons.glyphMap;

              if (route.name === 'Remote') {
                iconName = focused ? 'play-circle' : 'play-circle-outline';
              } else if (route.name === 'Shows') {
                iconName = focused ? 'documents' : 'documents-outline';
              } else if (route.name === 'Connect') {
                iconName = focused ? 'wifi' : 'wifi-outline';
              } else {
                iconName = 'help-circle-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: FreeShowTheme.colors.secondary,
            tabBarInactiveTintColor: FreeShowTheme.colors.text + '80', // 50% opacity
            tabBarStyle: {
              backgroundColor: FreeShowTheme.colors.primaryDarkest,
              borderTopColor: FreeShowTheme.colors.primaryLighter,
              borderTopWidth: 2,
            },
            headerShown: false,
            tabBarLabelStyle: {
              fontSize: 12,
              fontWeight: '600',
              fontFamily: FreeShowTheme.fonts.system,
            },
          })}
        >
          <Tab.Screen name="Remote" component={RemoteScreen} />
          <Tab.Screen name="Shows" component={ShowsScreen} />
          <Tab.Screen name="Connect" component={ConnectScreen} />
        </Tab.Navigator>
        <StatusBar style="light" />
        </NavigationContainer>
      </ConnectionProvider>
    </SafeAreaProvider>
  );
}