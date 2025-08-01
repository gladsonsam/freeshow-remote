import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import ConnectScreen from './src/screens/ConnectScreen';
import ShowSelectorScreen from './src/screens/ShowSelectorScreen';
import WebViewScreen from './src/screens/WebViewScreen';
import APIScreen from './src/screens/APIScreen';

import SettingsScreen from './src/screens/SettingsScreen';
import ConnectionHistoryScreen from './src/screens/ConnectionHistoryScreen';
import AboutScreen from './src/screens/AboutScreen';
import { FreeShowTheme } from './src/theme/FreeShowTheme';
import { AppContextProvider, useConnection, useSettings } from './src/contexts';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Sidebar, SidebarTraditional } from './src/components/Sidebar';
import { ErrorLogger } from './src/services/ErrorLogger';
import { configService } from './src/config/AppConfig';
import { settingsRepository } from './src/repositories';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Hook to check if auto-connect should be attempted
const useAutoConnectExpected = () => {
  const [autoConnectExpected, setAutoConnectExpected] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAutoConnectConditions = async () => {
      try {
        const appSettings = await settingsRepository.getAppSettings();
        if (!appSettings.autoReconnect) {
          setAutoConnectExpected(false);
          return;
        }
        
        const lastConnection = await settingsRepository.getLastConnection();
        const shouldAutoConnect = !!(lastConnection && lastConnection.host);
        setAutoConnectExpected(shouldAutoConnect);
        
        ErrorLogger.info('[AutoConnectCheck] Conditions checked', 'App', {
          autoReconnect: appSettings.autoReconnect,
          hasLastConnection: !!lastConnection?.host,
          shouldAutoConnect
        });
      } catch (error) {
        ErrorLogger.error('[AutoConnectCheck] Error checking conditions', 'App', error instanceof Error ? error : new Error(String(error)));
        setAutoConnectExpected(false);
      }
    };

    checkAutoConnectConditions();
  }, []);

  return autoConnectExpected;
};

// Screen components wrapped with error boundaries
const InterfaceScreen = (props: any) => (
  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('ShowSelectorScreen Error', 'App', error, { errorInfo })}>
    <ShowSelectorScreen {...props} />
  </ErrorBoundary>
);

const ConnectScreenWrapped = (props: any) => (
  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('ConnectScreen Error', 'App', error, { errorInfo })}>
    <ConnectScreen {...props} />
  </ErrorBoundary>
);

const SettingsScreenWrapped = (props: any) => (
  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('SettingsScreen Error', 'App', error, { errorInfo })}>
    <SettingsScreen {...props} />
  </ErrorBoundary>
);

// Bottom Tab Navigator
function BottomTabsLayout() {
  const { state } = useConnection();
  const { isConnected, connectionStatus } = state;
  const autoConnectExpected = useAutoConnectExpected();
  
  // Always call all hooks first
  const initialRouteName = React.useMemo(() => {
    return autoConnectExpected ? "Interface" : "Connect";
  }, [autoConnectExpected]);

  React.useEffect(() => {
    if (autoConnectExpected !== null) {
      ErrorLogger.info(`[Navigation] Initial route determined: ${initialRouteName}`, 'App', {
        autoConnectExpected,
        initialRouteName
      });
    }
  }, [autoConnectExpected, initialRouteName]);

  // Show loading if not ready
  if (autoConnectExpected === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: FreeShowTheme.colors.primary }}>
        <Text style={{ color: FreeShowTheme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  return (
    <Tab.Navigator
      initialRouteName={initialRouteName}
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
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
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
        component={InterfaceScreen}
        options={{ tabBarLabel: 'Interface' }}
      />
      <Tab.Screen 
        name="Connect"
        component={ConnectScreenWrapped}
        options={{ tabBarLabel: 'Connect' }}
      />
      <Tab.Screen 
        name="Settings"
        component={SettingsScreenWrapped}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

// Define route types to prevent navigation issues
// 
// SIDEBAR_ROUTES: Routes that are handled within the sidebar navigation system
// These routes replace the main content area when using sidebar layout
const SIDEBAR_ROUTES = ['Interface', 'Connect', 'Settings'];

// EXTERNAL_ROUTES: Routes that should use the main navigation stack
// These are typically modal screens, overlays, or screens that exist outside the main app flow
// When adding new screens, add them here if they should be accessible from sidebar layout
const EXTERNAL_ROUTES = ['WebView', 'APIScreen', 'ConnectionHistory', 'About'];

// Sidebar Layout with content area
function SidebarLayout() {
  const { navigation: mainNavigation } = useConnection();
  const autoConnectExpected = useAutoConnectExpected();
  
  // Always call all hooks first
  const initialRoute = React.useMemo(() => {
    return autoConnectExpected ? "Interface" : "Connect";
  }, [autoConnectExpected]);
  
  const [currentRoute, setCurrentRoute] = useState(initialRoute);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  
  // Responsive breakpoint - use overlay on mobile, side-by-side on tablet
  const isMobile = screenWidth < 768;

  // Update current route when autoConnectExpected changes
  React.useEffect(() => {
    if (autoConnectExpected !== null) {
      const newInitialRoute = autoConnectExpected ? "Interface" : "Connect";
      setCurrentRoute(newInitialRoute);
      ErrorLogger.info(`[SidebarLayout] Initial route determined: ${newInitialRoute}`, 'App', {
        autoConnectExpected,
        initialRoute: newInitialRoute
      });
    }
  }, [autoConnectExpected]);

  // Listen for screen dimension changes
  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
      // Close sidebar when switching from mobile to tablet layout
      if (window.width >= 768 && sidebarVisible) {
        setSidebarVisible(false);
      }
    });

    return () => subscription?.remove();
  }, [sidebarVisible]);

  const handleNavigate = React.useCallback((route: string) => {
    setCurrentRoute(route);
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setSidebarVisible(!sidebarVisible);
  }, [sidebarVisible]);

  const closeSidebar = React.useCallback(() => {
    setSidebarVisible(false);
  }, []);

  // Create a navigation object for sidebar screens
  const sidebarNavigation = React.useMemo(() => ({
    navigate: (routeName: string, params?: any) => {
      if (EXTERNAL_ROUTES.includes(routeName)) {
        // Use the main navigation for modal screens and external screens
        if (mainNavigation && typeof mainNavigation.navigate === 'function') {
          mainNavigation.navigate(routeName, params);
        } else {
          console.warn(`[SidebarLayout] No valid main navigation available for external screen: ${routeName}`);
        }
      } else if (SIDEBAR_ROUTES.includes(routeName)) {
        // Use sidebar navigation for main routes
        handleNavigate(routeName);
      } else {
        // Handle unknown routes gracefully
        console.warn(`[SidebarLayout] Unknown route: ${routeName}. Attempting to use main navigation.`);
        if (mainNavigation && typeof mainNavigation.navigate === 'function') {
          mainNavigation.navigate(routeName, params);
        }
      }
    },
    getParent: () => mainNavigation || null,
  }), [handleNavigate, mainNavigation]);

  const renderContent = React.useCallback(() => {
    switch (currentRoute) {
      case 'Interface':
        return <InterfaceScreen navigation={sidebarNavigation} />;
      case 'Connect':
        return <ConnectScreenWrapped navigation={sidebarNavigation} />;
      case 'Settings':
        return <SettingsScreenWrapped navigation={sidebarNavigation} />;
      default:
        return <InterfaceScreen navigation={sidebarNavigation} />;
    }
  }, [currentRoute, sidebarNavigation]);

  // Show loading if not ready
  if (autoConnectExpected === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: FreeShowTheme.colors.primary }}>
        <Text style={{ color: FreeShowTheme.colors.text }}>Loading...</Text>
      </View>
    );
  }

  // Mobile layout with overlay sidebar
  if (isMobile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: FreeShowTheme.colors.primaryDarker }} edges={['top', 'left', 'right']}>
        {/* Header with hamburger menu */}
        <View style={{
          backgroundColor: FreeShowTheme.colors.primaryDarker,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: FreeShowTheme.spacing.md,
          paddingHorizontal: FreeShowTheme.spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: FreeShowTheme.colors.primaryLighter,
          minHeight: 64, // Ensure minimum height for proper touch targets
        }}>
          <TouchableOpacity 
            onPress={toggleSidebar}
            style={{
              width: 44,
              height: 44,
              borderRadius: FreeShowTheme.borderRadius.md,
              backgroundColor: FreeShowTheme.colors.primaryDarkest,
              borderWidth: 1,
              borderColor: FreeShowTheme.colors.primaryLighter,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          
          <View style={{ marginLeft: FreeShowTheme.spacing.md, flex: 1 }}>
            <Text style={{
              fontSize: FreeShowTheme.fontSize.lg,
              fontWeight: '700',
              color: FreeShowTheme.colors.text,
            }}>
              FreeShow Remote
            </Text>
          </View>
        </View>

        {/* Content area */}
        <View style={{ flex: 1, backgroundColor: FreeShowTheme.colors.primary }}>
          {renderContent()}
        </View>

        {/* Overlay Sidebar */}
        <Sidebar 
          navigation={null}
          currentRoute={currentRoute} 
          onNavigate={handleNavigate}
          isVisible={sidebarVisible}
          onClose={closeSidebar}
        />
      </SafeAreaView>
    );
  }

  // Tablet/Desktop layout with traditional side-by-side sidebar
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: FreeShowTheme.colors.primary }}>
      <SidebarTraditional 
        navigation={null}
        currentRoute={currentRoute} 
        onNavigate={handleNavigate} 
      />
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
    </View>
  );
}

// Main layout component that chooses between sidebar and bottom tabs
function MainLayout() {
  const { settings } = useSettings();
  const [previousLayout, setPreviousLayout] = useState<string | null>(null);
  
  // Default to bottom bar if settings not loaded yet
  const navigationLayout = settings?.navigationLayout || 'bottomBar';
  
  // Track layout changes for smooth transitions
  React.useEffect(() => {
    if (previousLayout && previousLayout !== navigationLayout) {
      ErrorLogger.info(`[MainLayout] Navigation layout changed from ${previousLayout} to ${navigationLayout}`, 'App');
    }
    setPreviousLayout(navigationLayout);
  }, [navigationLayout, previousLayout]);
  
  return navigationLayout === 'sidebar' ? <SidebarLayout /> : <BottomTabsLayout />;
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
  const navigationRef = useNavigationContainerRef();
  
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
        <AppContextProvider navigation={navigationRef}>
          <NavigationContainer ref={navigationRef} theme={FreeShowNavigationTheme}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                cardStyle: { backgroundColor: FreeShowTheme.colors.primary },
              }}
            >
              <Stack.Screen name="Main" component={MainLayout} />
              <Stack.Screen 
                name="WebView"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  gestureEnabled: true,
                  cardOverlayEnabled: true,
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateY: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.height, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              >
                {(props) => (
                  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('WebViewScreen Error', 'App', error, { errorInfo })}>
                    <WebViewScreen {...props} />
                  </ErrorBoundary>
                )}
              </Stack.Screen>
              <Stack.Screen 
                name="APIScreen"
                options={{
                  presentation: 'modal',
                  headerShown: false,
                  gestureEnabled: true,
                  cardOverlayEnabled: true,
                  cardStyleInterpolator: ({ current, layouts }) => {
                    return {
                      cardStyle: {
                        transform: [
                          {
                            translateY: current.progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [layouts.screen.height, 0],
                            }),
                          },
                        ],
                      },
                    };
                  },
                }}
              >
                {(props) => (
                  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('APIScreen Error', 'App', error, { errorInfo })}>
                    <APIScreen {...props} />
                  </ErrorBoundary>
                )}
              </Stack.Screen>

              <Stack.Screen 
                name="ConnectionHistory"
                options={{
                  headerShown: false,
                }}
              >
                {(props) => (
                  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('ConnectionHistoryScreen Error', 'App', error, { errorInfo })}>
                    <ConnectionHistoryScreen {...props} />
                  </ErrorBoundary>
                )}
              </Stack.Screen>

              <Stack.Screen 
                name="About"
                options={{
                  headerShown: false,
                }}
              >
                {(props) => (
                  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('AboutScreen Error', 'App', error, { errorInfo })}>
                    <AboutScreen {...props} />
                  </ErrorBoundary>
                )}
              </Stack.Screen>
            </Stack.Navigator>
            <StatusBar 
              style="light" 
              translucent={true}
            />
          </NavigationContainer>
        </AppContextProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}