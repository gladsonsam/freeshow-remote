import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';

interface SidebarProps {
  navigation: any;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

interface NavigationItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  route: string;
}

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH_EXPANDED = Math.min(280, screenWidth * 0.7);
const SIDEBAR_WIDTH_COLLAPSED = 70; // Increased for better icon fit

export const Sidebar: React.FC<SidebarProps> = ({ navigation, currentRoute, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
  const [animatedWidth] = useState(new Animated.Value(SIDEBAR_WIDTH_COLLAPSED));
  const { state } = useConnection();
  const { isConnected, connectionStatus } = state;

  const navigationItems: NavigationItem[] = [
    {
      key: 'Interface',
      label: 'Interface',
      icon: 'apps-outline',
      iconFocused: 'apps',
      route: 'Interface',
    },
    {
      key: 'Connect',
      label: 'Connect',
      icon: 'wifi-outline',
      iconFocused: 'wifi',
      route: 'Connect',
    },
    {
      key: 'Settings',
      label: 'Settings',
      icon: 'settings-outline',
      iconFocused: 'settings',
      route: 'Settings',
    },
  ];

  const toggleSidebar = () => {
    const targetWidth = isExpanded ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
    
    Animated.timing(animatedWidth, {
      toValue: targetWidth,
      duration: 250,
      useNativeDriver: false,
    }).start();
    
    setIsExpanded(!isExpanded);
  };

  const handleNavigate = (route: string) => {
    onNavigate(route);
    
    // Auto-collapse on mobile when navigating (if screen is small)
    if (screenWidth < 600 && isExpanded) {
      setTimeout(() => toggleSidebar(), 150);
    }
  };

  const getConnectionColor = () => {
    if (currentRoute === 'Connect') {
      return FreeShowTheme.colors.secondary; // Purple when on Connect page
    } else if (isConnected) {
      return '#4CAF50'; // Green when connected
    } else if (connectionStatus === 'connecting') {
      return '#FF9800'; // Orange when connecting
    } else {
      return FreeShowTheme.colors.textSecondary; // Gray when disconnected
    }
  };

  const getItemColor = (item: NavigationItem) => {
    if (item.key === 'Connect') {
      return getConnectionColor();
    }
    return currentRoute === item.route ? FreeShowTheme.colors.secondary : FreeShowTheme.colors.textSecondary;
  };

  const getItemBackgroundColor = (item: NavigationItem) => {
    return currentRoute === item.route ? FreeShowTheme.colors.secondary + '15' : 'transparent';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'top', 'bottom']}>
      <Animated.View style={[styles.sidebar, { width: animatedWidth }]}>
        {/* Header with toggle button */}
        <View style={[styles.header, !isExpanded && styles.headerCollapsed]}>
          <TouchableOpacity 
            style={[styles.toggleButton]}
            onPress={toggleSidebar}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isExpanded ? "chevron-back" : "menu"} 
              size={24} 
              color={FreeShowTheme.colors.text} 
            />
          </TouchableOpacity>
          
          {isExpanded && (
            <Animated.View style={styles.headerText}>
              <Text style={styles.appName}>FreeShow</Text>
              <Text style={styles.appSubtitle}>Remote</Text>
            </Animated.View>
          )}
        </View>

        {/* Navigation Items */}
        <View style={[styles.navigation, !isExpanded && styles.navigationCollapsed]}>
          {navigationItems.map((item) => {
            const isActive = currentRoute === item.route;
            const itemColor = getItemColor(item);
            const backgroundColor = getItemBackgroundColor(item);
            
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.navItem, 
                  { backgroundColor },
                  !isExpanded && styles.navItemCollapsed
                ]}
                onPress={() => handleNavigate(item.route)}
                activeOpacity={0.7}
              >
                <View style={[styles.navItemIcon, !isExpanded && styles.navItemIconCollapsed]}>
                  <Ionicons
                    name={isActive ? item.iconFocused : item.icon}
                    size={24}
                    color={itemColor}
                  />
                </View>
                
                {isExpanded && (
                  <Animated.View style={styles.navItemText}>
                    <Text style={[styles.navItemLabel, { color: itemColor }]}>
                      {item.label}
                    </Text>
                  </Animated.View>
                )}
                
                {isActive && isExpanded && (
                  <View style={styles.activeIndicator} />
                )}
                
                {/* Minimal active indicator for collapsed state */}
                {isActive && !isExpanded && (
                  <View style={styles.activeIndicatorCollapsed} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Connection Status (when expanded) */}
        {isExpanded && (
          <View style={styles.statusSection}>
            <View style={styles.connectionStatus}>
              <View style={styles.statusIndicator}>
                <View 
                  style={[
                    styles.statusDot, 
                    { backgroundColor: getConnectionColor() }
                  ]} 
                />
                <Text style={styles.statusText}>
                  {isConnected ? 'Connected' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
  },
  sidebar: {
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRightWidth: 2,
    borderRightColor: FreeShowTheme.colors.primaryLighter,
    height: '100%',
    paddingVertical: FreeShowTheme.spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.xl,
    justifyContent: 'flex-start',
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: FreeShowTheme.borderRadius.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: FreeShowTheme.spacing.sm,
  },
  headerText: {
    marginLeft: FreeShowTheme.spacing.md,
    flex: 1,
  },
  appName: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: 2,
  },
  appSubtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  navigation: {
    flex: 1,
    paddingHorizontal: FreeShowTheme.spacing.sm,
  },
  navigationCollapsed: {
    paddingHorizontal: FreeShowTheme.spacing.xs,
    alignItems: 'center',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    marginBottom: FreeShowTheme.spacing.xs,
    position: 'relative',
  },
  navItemCollapsed: {
    paddingHorizontal: FreeShowTheme.spacing.xs,
    marginHorizontal: FreeShowTheme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    width: 54, // 70 - (4 * 4) for padding and margins
  },
  navItemIcon: {
    width: 40,
    alignItems: 'center',
  },
  navItemIconCollapsed: {
    width: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemText: {
    flex: 1,
    marginLeft: FreeShowTheme.spacing.md,
  },
  navItemLabel: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: FreeShowTheme.colors.secondary,
    borderRadius: 2,
  },
  activeIndicatorCollapsed: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: FreeShowTheme.colors.secondary,
    borderRadius: 2,
  },
  statusSection: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
  },
  connectionStatus: {
    padding: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: FreeShowTheme.spacing.sm,
  },
  statusText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
});