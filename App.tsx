import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import ConnectScreen from './src/screens/ConnectScreen';
import InterfaceScreen from './src/screens/InterfaceScreen';
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

// Create navigation ref at module level for use in layout components
const navigationRef = createNavigationContainerRef();

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
const InterfaceScreenComponent = (props: any) => (
  <ErrorBoundary onError={(error, errorInfo) => ErrorLogger.error('InterfaceScreen Error', 'App', error, { errorInfo })}>
    <InterfaceScreen {...props} />
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

// Helper function to get tab icon and color based on route and state
function getTabIcon(routeName: string, isFocused: boolean, isConnected: boolean, connectionStatus: string) {
  let iconName: keyof typeof Ionicons.glyphMap;
  let iconColor = isFocused ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.text + '80';

  if (routeName === 'Interface') {
    iconName = isFocused ? 'apps' : 'apps-outline';
  } else if (routeName === 'Connect') {
    iconName = isFocused ? 'wifi' : 'wifi-outline';
    // Dynamic color for Connect tab based on connection status
    if (isFocused) {
      iconColor = FreeShowTheme.colors.secondary; // Purple when focused (on Connect page)
    } else if (isConnected) {
      iconColor = '#4CAF50'; // Green when connected but not focused
    } else if (connectionStatus === 'connecting') {
      iconColor = '#FF9800'; // Orange when connecting
    } else {
      iconColor = FreeShowTheme.colors.text + '80'; // Gray when not focused and not connected
    }
  } else if (routeName === 'Settings') {
    iconName = isFocused ? 'settings' : 'settings-outline';
  } else {
    iconName = 'help-circle-outline';
  }

  return { iconName, iconColor };
}

// TypeScript interfaces for better type safety
interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

// Custom Tab Bar Component that handles safe area insets
function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { state: connectionState } = useConnection();
  const { isConnected, connectionStatus } = connectionState;

  return (
    <View style={{
      backgroundColor: FreeShowTheme.colors.primaryDarkest,
      borderTopColor: FreeShowTheme.colors.primaryLighter,
      borderTopWidth: 2,
      paddingBottom: Math.max(insets.bottom, 12), // Use system navigation bar height or minimum 12
      paddingTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 75,
    }}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined ? options.tabBarLabel : options.title !== undefined ? options.title : route.name;
        const isFocused = state.index === index;
        const { iconName, iconColor } = getTabIcon(route.name, isFocused, isConnected, connectionStatus);

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <TouchableOpacity
            key={route.name}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingVertical: 8,
            }}
          >
            <Ionicons name={iconName} size={24} color={iconColor} />
            <Text style={{
              color: iconColor,
              fontSize: 12,
              fontWeight: '600',
              fontFamily: FreeShowTheme.fonts.system,
              marginTop: 2,
            }}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Bottom Tab Navigator
function BottomTabsLayout() {
  const autoConnectExpected = useAutoConnectExpected();

  // Always call all hooks first
  const initialRouteName = React.useMemo(() => {
    return "Interface";
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
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Interface"
        component={InterfaceScreenComponent}
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
const EXTERNAL_ROUTES = ['WebView', 'APIScreen', 'ConnectionHistory', 'About', 'Main'];

// Sidebar Layout with content area
function SidebarLayout() {
  const autoConnectExpected = useAutoConnectExpected();
  
  // Always call all hooks first
  const initialRoute = React.useMemo(() => {
    return "Interface";
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

  // Helper function for type-safe navigation
  const navigateSafely = (routeName: string, params?: Record<string, any>) => {
    if (navigationRef.current?.navigate) {
      // Use type assertion to bypass strict typing for dynamic navigation
      (navigationRef.current.navigate as (routeName: string, params?: Record<string, any>) => void)(routeName, params);
    } else {
      console.warn(`[SidebarLayout] No valid main navigation available for: ${routeName}`);
    }
  };

  // Create a navigation object for sidebar screens
  const sidebarNavigation = React.useMemo(() => ({
    navigate: (routeName: string, params?: Record<string, any>) => {
      if (EXTERNAL_ROUTES.includes(routeName)) {
        // Use the main navigation for modal screens and external screens
        navigateSafely(routeName, params);
      } else if (SIDEBAR_ROUTES.includes(routeName)) {
        // Use sidebar navigation for main routes
        handleNavigate(routeName);
      } else {
        // Handle unknown routes gracefully
        console.warn(`[SidebarLayout] Unknown route: ${routeName}. Attempting to use main navigation.`);
        navigateSafely(routeName, params);
      }
    },
    addListener: (_event: string, _callback: () => void) => {
      // No-op listener in sidebar layout; screens remain mounted and manage their own state
      return () => {};
    },
    getParent: () => navigationRef.current || null,
  }), [handleNavigate]);

  const renderContent = React.useCallback(() => {
    switch (currentRoute) {
      case 'Interface':
        return <InterfaceScreenComponent navigation={sidebarNavigation} />;
      case 'Connect':
        return <ConnectScreenWrapped navigation={sidebarNavigation} />;
      case 'Settings':
        return <SettingsScreenWrapped navigation={sidebarNavigation} />;
      default:
        return <InterfaceScreenComponent navigation={sidebarNavigation} />;
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
        {/* Keep all main screens mounted to avoid header flicker when switching */}
        <View style={{ flex: 1, display: currentRoute === 'Interface' ? 'flex' : 'none' }}>
          <InterfaceScreenComponent navigation={sidebarNavigation} />
        </View>
        <View style={{ flex: 1, display: currentRoute === 'Connect' ? 'flex' : 'none' }}>
          <ConnectScreenWrapped navigation={sidebarNavigation} />
        </View>
        <View style={{ flex: 1, display: currentRoute === 'Settings' ? 'flex' : 'none' }}>
          <SettingsScreenWrapped navigation={sidebarNavigation} />
        </View>
      </View>
    </View>
  );
}

// Floating Navigation Layout
function FloatingNavLayout() {
  const autoConnectExpected = useAutoConnectExpected();
  const insets = useSafeAreaInsets();
  
  const initialRoute = React.useMemo(() => {
    return "Interface";
  }, [autoConnectExpected]);
  
  const [currentRoute, setCurrentRoute] = useState(initialRoute);
  
  React.useEffect(() => {
    if (autoConnectExpected !== null) {
      const newInitialRoute = autoConnectExpected ? "Interface" : "Connect";
      setCurrentRoute(newInitialRoute);
    }
  }, [autoConnectExpected]);

  const handleNavigate = React.useCallback((route: string) => {
    setCurrentRoute(route);
  }, []);

  // Helper function for type-safe navigation (local to FloatingNavLayout)
  const navigateSafelyFloating = (routeName: string, params?: Record<string, any>) => {
    if (navigationRef.current?.navigate) {
      // Use type assertion to bypass strict typing for dynamic navigation
      (navigationRef.current.navigate as (routeName: string, params?: Record<string, any>) => void)(routeName, params);
    } else {
      console.warn(`[FloatingNavLayout] No valid main navigation available for: ${routeName}`);
    }
  };

  // Create a navigation object for floating nav screens
  const floatingNavigation = React.useMemo(() => ({
    navigate: (routeName: string, params?: Record<string, any>) => {
      if (['Interface', 'Connect', 'Settings'].includes(routeName)) {
        handleNavigate(routeName);
      } else if (EXTERNAL_ROUTES.includes(routeName)) {
        // Handle external routes using main navigation
        navigateSafelyFloating(routeName, params);
      } else {
        // Handle other routes using main navigation
        navigateSafelyFloating(routeName, params);
      }
    },
    addListener: (_event: string, _callback: () => void) => {
      // No-op listener in floating layout; screens remain mounted and manage their own state
      return () => {};
    },
    getParent: () => navigationRef.current || null,
  }), [handleNavigate]);

  const renderContent = () => {
    // Keep all screens mounted; toggle visibility for smooth header/content
    return (
      <>
        <View style={{ flex: 1, display: currentRoute === 'Interface' ? 'flex' : 'none' }}>
          <InterfaceScreenComponent navigation={floatingNavigation} />
        </View>
        <View style={{ flex: 1, display: currentRoute === 'Connect' ? 'flex' : 'none' }}>
          <ConnectScreenWrapped navigation={floatingNavigation} />
        </View>
        <View style={{ flex: 1, display: currentRoute === 'Settings' ? 'flex' : 'none' }}>
          <SettingsScreenWrapped navigation={floatingNavigation} />
        </View>
      </>
    );
  };

  const getTabIcon = (routeName: string, isFocused: boolean) => {
    let iconName: keyof typeof Ionicons.glyphMap;
    const iconColor = isFocused ? '#A855F7' : 'rgba(255,255,255,0.7)';

    if (routeName === 'Interface') {
      iconName = isFocused ? 'apps' : 'apps-outline';
    } else if (routeName === 'Connect') {
      iconName = isFocused ? 'wifi' : 'wifi-outline';
    } else if (routeName === 'Settings') {
      iconName = isFocused ? 'settings' : 'settings-outline';
    } else {
      iconName = 'help-circle-outline';
    }

    return { iconName, iconColor };
  };

  if (autoConnectExpected === null) {
    return (
      <LinearGradient
        colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
      >
        <Text style={{ color: FreeShowTheme.colors.text }}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>
        
        {/* Universal Floating Navigation */}
        <View style={{
          position: 'absolute',
          left: 24,
          right: 24,
          bottom: insets.bottom + 24,
          height: 56,
          borderRadius: 28,
          overflow: 'hidden',
          // Enhanced shadow for better depth
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }}>
          {/* Background with blur effect */}
          <LinearGradient
            colors={['rgba(20, 20, 30, 0.95)', 'rgba(10, 10, 20, 0.98)']}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 6,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              // Inner glow effect
              shadowColor: '#A855F7',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
            }}
          >
            {['Interface', 'Connect', 'Settings'].map((route) => {
              const isFocused = currentRoute === route;
              const { iconName, iconColor } = getTabIcon(route, isFocused);
              
              return (
                <TouchableOpacity
                  key={route}
                  style={{
                    flex: 1,
                    height: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginHorizontal: 2,
                    borderRadius: 22,
                    gap: 6,
                    backgroundColor: isFocused 
                      ? 'rgba(168, 85, 247, 0.2)' 
                      : 'transparent',
                    // Active state styling
                    ...(isFocused && {
                      shadowColor: '#A855F7',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                    }),
                  }}
                  onPress={() => handleNavigate(route)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={iconName} 
                    size={isFocused ? 22 : 20} 
                    color={iconColor}
                    style={{
                      // remove glow on active icon
                    }}
                  />
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: iconColor,
                    letterSpacing: -0.2,
                  }}>
                    {route}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </LinearGradient>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Main layout component that chooses between sidebar, bottom tabs, or floating nav
function MainLayout() {
  const { settings } = useSettings();

  // Default to bottom bar if settings not loaded yet
  const navigationLayout: 'bottomBar' | 'sidebar' | 'floating' = settings?.navigationLayout || 'bottomBar';

  if (navigationLayout === 'sidebar') {
    return <SidebarLayout />;
  } else if (navigationLayout === 'floating') {
    return <FloatingNavLayout />;
  } else {
    return <BottomTabsLayout />;
  }
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
        <AppContextProvider navigation={navigationRef}>
          <NavigationContainer ref={navigationRef} theme={FreeShowNavigationTheme}>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                cardStyle: {
                  backgroundColor: FreeShowTheme.colors.primary,
                },
                cardStyleInterpolator: ({ current, layouts }) => ({
                  cardStyle: {
                    transform: [
                      {
                        translateX: current.progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [layouts.screen.width, 0],
                        }),
                      },
                    ],
                    opacity: current.progress.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 0.8, 1],
                    }),
                  },
                  overlayStyle: {
                    backgroundColor: 'transparent',
                  },
                }),
                transitionSpec: {
                  open: {
                    animation: 'timing',
                    config: {
                      duration: 200,
                      easing: require('react-native').Easing.out(require('react-native').Easing.exp),
                    },
                  },
                  close: {
                    animation: 'timing',
                    config: {
                      duration: 180,
                      easing: require('react-native').Easing.in(require('react-native').Easing.exp),
                    },
                  },
                },
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
                  presentation: 'card',
                  cardStyleInterpolator: ({ current, layouts }) => ({
                    cardStyle: {
                      transform: [
                        {
                          translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width, 0],
                          }),
                        },
                      ],
                      opacity: current.progress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.8, 1],
                      }),
                    },
                    overlayStyle: {
                      backgroundColor: 'transparent',
                    },
                  }),
                  transitionSpec: {
                    open: {
                      animation: 'timing',
                      config: {
                        duration: 100,
                        easing: require('react-native').Easing.inOut(require('react-native').Easing.linear),
                      },
                    },
                    close: {
                      animation: 'timing',
                      config: {
                        duration: 100,
                        easing: require('react-native').Easing.inOut(require('react-native').Easing.linear),
                      },
                    },
                  },
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
                  presentation: 'card',
                  cardStyleInterpolator: ({ current, layouts }) => ({
                    cardStyle: {
                      transform: [
                        {
                          translateX: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [layouts.screen.width, 0],
                          }),
                        },
                      ],
                      opacity: current.progress.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.8, 1],
                      }),
                    },
                    overlayStyle: {
                      backgroundColor: 'transparent',
                    },
                  }),
                  transitionSpec: {
                    open: {
                      animation: 'timing',
                      config: {
                        duration: 100,
                        easing: require('react-native').Easing.inOut(require('react-native').Easing.linear),
                      },
                    },
                    close: {
                      animation: 'timing',
                      config: {
                        duration: 100,
                        easing: require('react-native').Easing.inOut(require('react-native').Easing.linear),
                      },
                    },
                  },
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