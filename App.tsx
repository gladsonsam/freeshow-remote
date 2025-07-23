import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ConnectScreen from './src/screens/ConnectScreen';
import ShowSelectorScreen from './src/screens/ShowSelectorScreen';
import WebViewScreen from './src/screens/WebViewScreen';
import { FreeShowTheme } from './src/theme/FreeShowTheme';
import { AppContextProvider, useConnection } from './src/contexts';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { ErrorLogger } from './src/services/ErrorLogger';
import { configService } from './src/config/AppConfig';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Create the main tab navigator
function MainTabs() {
  const { state } = useConnection();
  const { isConnected, connectionStatus } = state;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          let iconColor = color;

          if (route.name === 'Interface') {
            iconName = focused ? 'apps' : 'apps-outline';
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
          height: 75,
          paddingBottom: 12, // Increased bottom padding to push content up
          paddingTop: 4, // Reduced top padding
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: FreeShowTheme.fonts.system,
          marginTop: 2, // Reduced space between icon and label
          marginBottom: 0,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      })}
    >
      <Tab.Screen 
        name="Interface"
        options={{ tabBarLabel: 'Interface' }}
      >
        {(props) => (
          <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('ShowSelectorScreen Error', 'App', error, { errorInfo })}>
            <ShowSelectorScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
      <Tab.Screen 
        name="Connect"
        options={{
          tabBarLabel: 'Connect',
        }}
      >
        {(props) => (
          <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('ConnectScreen Error', 'App', error, { errorInfo })}>
            <ConnectScreen {...props} />
          </ErrorBoundary>
        )}
      </Tab.Screen>
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
  // Initialize configuration on app startup
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await configService.loadConfiguration();
        ErrorLogger.info('App configuration loaded successfully', 'App');
      } catch (error) {
        ErrorLogger.error('Failed to load app configuration', 'App', error instanceof Error ? error : new Error(String(error)));
      }
    };

    initializeApp();
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        ErrorLogger.fatal('App-level Error', 'App', error, new Error(JSON.stringify(errorInfo)));
        // In production, you might want to report this to a crash analytics service
      }}
    >
      <SafeAreaProvider>
        <AppContextProvider>
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
                options={{
                  presentation: 'modal',
                  headerShown: false,
                }}
              >
                {(props) => (
                  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('WebViewScreen Error', 'App', error, { errorInfo })}>
                    <WebViewScreen {...props} />
                  </ErrorBoundary>
                )}
              </Stack.Screen>
            </Stack.Navigator>
            <StatusBar 
              style="light" 
              backgroundColor="transparent"
              translucent={true}
            />
          </NavigationContainer>
        </AppContextProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}