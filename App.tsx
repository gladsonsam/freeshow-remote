import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import RemoteScreen from './src/screens/RemoteScreen';
import ConnectScreen from './src/screens/ConnectScreen';
import ShowsScreen from './src/screens/ShowsScreen';
import ShowSelectorScreen from './src/screens/ShowSelectorScreen';
import WebViewScreen from './src/screens/WebViewScreen';
import { FreeShowTheme } from './src/theme/FreeShowTheme';
import { ConnectionProvider, useConnection } from './src/contexts/ConnectionContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Create the main tab navigator
function MainTabs() {
  const { isConnected, connectionStatus } = useConnection();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          let iconColor = color;

          if (route.name === 'Interface') {
            iconName = focused ? 'apps' : 'apps-outline';
          } else if (route.name === 'Shows') {
            iconName = focused ? 'documents' : 'documents-outline';
          } else if (route.name === 'Connect') {
            iconName = focused ? 'wifi' : 'wifi-outline';
            // Dynamic color for Connect tab based on connection status
            if (focused) {
              iconColor = FreeShowTheme.colors.secondary; // Purple when focused (on Connect page)
            } else if (isConnected) {
              iconColor = '#4CAF50'; // Green when connected but not focused
            } else if (connectionStatus === 'connecting') {
              iconColor = '#FF9800'; // Orange when connecting  
            } else {
              iconColor = FreeShowTheme.colors.text + '80'; // Gray when not focused and not connected
            }
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={iconColor} />;
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
      <Tab.Screen 
        name="Interface" 
        component={ShowSelectorScreen}
        options={{ tabBarLabel: 'Interface' }}
      />
      <Tab.Screen name="Shows" component={ShowsScreen} />
      <Tab.Screen 
        name="Connect" 
        component={ConnectScreen}
        options={{
          tabBarLabel: 'Connect',
        }}
      />
    </Tab.Navigator>
  );
}

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
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: FreeShowTheme.colors.primary },
            }}
          >
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="WebView" 
              component={WebViewScreen}
              options={{
                presentation: 'modal',
                headerShown: false,
              }}
            />
          </Stack.Navigator>
          <StatusBar style="light" />
        </NavigationContainer>
      </ConnectionProvider>
    </SafeAreaProvider>
  );
}