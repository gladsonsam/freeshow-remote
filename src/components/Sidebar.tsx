import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';
import { configService } from '../config/AppConfig';
import { useIsTV } from '../hooks/useIsTV';
import { useTVEvent } from '../hooks/useTVEvent';

interface SidebarProps {
  navigation: any;
  currentRoute: string;
  onNavigate: (route: string) => void;
  isVisible: boolean;
  onClose: () => void;
}

interface NavigationItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  route: string;
}

// Shared navigation items used by both sidebar variants
const NAVIGATION_ITEMS: NavigationItem[] = [
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

// Normalize various TV event shapes to a canonical string action
const normalizeTVEvent = (evt: any): string | null => {
  if (!evt) return null;
  if (evt.eventType && typeof evt.eventType === 'string') return evt.eventType;
  if (evt.type && typeof evt.type === 'string') return evt.type;

  const code = evt.eventType ?? evt.keyCode ?? evt.keycode ?? evt;
  const num = typeof code === 'number' ? code : parseInt(code, 10);
  if (!isNaN(num)) {
    switch (num) {
      case 19:
        return 'up';
      case 20:
        return 'down';
      case 21:
        return 'left';
      case 22:
        return 'right';
      case 23:
        return 'select';
      case 66:
        return 'select';
      case 4:
        return 'back';
      case 82:
        return 'menu';
      default:
        return String(num);
    }
  }
  return null;
};

const { width: screenWidth } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(280, screenWidth * 0.75);

export const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  isVisible,
  onClose,
  navigation: _navigation,
  currentRoute,
}) => {
  const [slideAnim] = useState(new Animated.Value(-SIDEBAR_WIDTH));
  const [backdropOpacity] = useState(new Animated.Value(0));
  const { state } = useConnection();
  const { isConnected, connectionStatus } = state;
  const isTV = useIsTV();

  // Focus index for TV remote navigation
  const [focusedIndex, setFocusedIndex] = useState<number>(() => {
    const idx = NAVIGATION_ITEMS.findIndex(n => n.route === currentRoute);
    return idx >= 0 ? idx : 0;
  });
  const focusedIndexRef = useRef<number>(focusedIndex);
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  // use NAVIGATION_ITEMS

  // Animation effect when visibility changes
  useEffect(() => {
    if (isVisible) {
      // Slide in
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, backdropOpacity]);

  const handleNavigate = (route: string) => {
    onNavigate(route);
    // Close sidebar after navigation
    setTimeout(() => onClose(), configService.getNetworkConfig().sidebarCloseDelay);
  };

  const handleBackdropPress = () => {
    onClose();
  };

  // Sync focused index when current route changes
  useEffect(() => {
    const idx = NAVIGATION_ITEMS.findIndex(n => n.route === currentRoute);
    if (idx >= 0) setFocusedIndex(idx);
  }, [currentRoute]);

  // When overlay becomes visible, ensure the focused index matches current route
  useEffect(() => {
    if (isVisible) {
      const idx = NAVIGATION_ITEMS.findIndex(n => n.route === currentRoute);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [isVisible, currentRoute]);

  // TV remote event handling (only when running on TV)
  const normalizeTVEvent = (evt: any): string | null => {
    if (!evt) return null;
    // Common string shapes
    if (evt.eventType && typeof evt.eventType === 'string') return evt.eventType;
    if (evt.type && typeof evt.type === 'string') return evt.type;

    // Some platforms use numeric codes (Android KeyEvent): map common keyCodes
    const code = evt.eventType ?? evt.keyCode ?? evt.keycode ?? evt;
    const num = typeof code === 'number' ? code : parseInt(code, 10);
    if (!isNaN(num)) {
      switch (num) {
        case 19:
          return 'up'; // dpad up
        case 20:
          return 'down'; // dpad down
        case 21:
          return 'left';
        case 22:
          return 'right';
        case 23:
          return 'select'; // dpad center
        case 66:
          return 'select'; // enter
        case 4:
          return 'back';
        case 82:
          return 'menu';
        default:
          return String(num);
      }
    }
    return null;
  };

  useTVEvent((evt: any) => {
    if (!isVisible) return; // only when overlay visible
    const type = normalizeTVEvent(evt);
    const len = NAVIGATION_ITEMS.length;

    if (type === 'up') {
      setFocusedIndex(i => (i - 1 + len) % len);
    } else if (type === 'down') {
      setFocusedIndex(i => (i + 1) % len);
    } else if (type === 'select' || type === 'play' || type === 'selectPlay' || type === 'enter') {
      const item = NAVIGATION_ITEMS[focusedIndexRef.current];
      if (item) handleNavigate(item.route);
    } else if (type === 'menu' || type === 'back') {
      onClose();
    }
  }, isTV && isVisible);

  const getConnectionColor = () => {
    if (isConnected) {
      return '#4CAF50'; // Green when connected
    } else if (connectionStatus === 'connecting') {
      return '#FF9800'; // Orange when connecting
    } else {
      return FreeShowTheme.colors.textSecondary; // Gray when disconnected
    }
  };

  const getItemColor = (item: NavigationItem) => {
    // Always highlight the current page with purple, regardless of connection status
    if (currentRoute === item.route) {
      return FreeShowTheme.colors.secondary;
    }
    return FreeShowTheme.colors.textSecondary;
  };

  const getItemBackgroundColor = (item: NavigationItem) => {
    return currentRoute === item.route ? FreeShowTheme.colors.secondary + '15' : 'transparent';
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebarContainer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={['left', 'top', 'bottom']}>
          <View style={styles.sidebar}>
            {/* Header with close button */}
            <View style={styles.header}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
              </TouchableOpacity>

              <View style={styles.headerText}>
                <Text style={styles.appName}>FreeShow</Text>
                <Text style={styles.appSubtitle}>Remote</Text>
              </View>

              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={styles.logoImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>

            {/* Navigation Items */}
            <View style={styles.navigation}>
              {NAVIGATION_ITEMS.map((item, index) => {
                const isActive = currentRoute === item.route;
                const itemColor = getItemColor(item);
                const backgroundColor = getItemBackgroundColor(item);
                const isFocusedTV = isTV && focusedIndex === index;

                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.navItem, { backgroundColor }]}
                    onPress={() => handleNavigate(item.route)}
                    activeOpacity={0.7}
                    focusable={isTV}
                    hasTVPreferredFocus={isFocusedTV}
                    onFocus={() => {
                      if (isTV) setFocusedIndex(index);
                    }}
                  >
                    {isFocusedTV && <View style={styles.tvHighlight} pointerEvents="none" />}
                    <View style={styles.navItemIcon}>
                      <Ionicons
                        name={isActive ? item.iconFocused : item.icon}
                        size={24}
                        color={itemColor}
                      />
                    </View>

                    <View style={styles.navItemText}>
                      <Text style={[styles.navItemLabel, { color: itemColor }]}>{item.label}</Text>
                    </View>

                    {isActive && <View style={styles.activeIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Connection Status */}
            <View style={styles.statusSection}>
              <View style={styles.connectionStatus}>
                <View style={styles.statusIndicator}>
                  <View style={[styles.statusDot, { backgroundColor: getConnectionColor() }]} />
                  <Text style={styles.statusText}>
                    {isConnected
                      ? 'Connected'
                      : connectionStatus === 'connecting'
                        ? 'Connecting...'
                        : 'Disconnected'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
  },
  sidebar: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    paddingVertical: FreeShowTheme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.xl,
    justifyContent: 'flex-start',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: FreeShowTheme.borderRadius.lg,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: FreeShowTheme.spacing.md,
    flex: 1,
  },
  logoContainer: {
    marginLeft: FreeShowTheme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 28,
    height: 28,
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
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  tvFocusedItem: {
    backgroundColor: FreeShowTheme.colors.secondarySurface,
    transform: [{ scale: 1.02 } as any],
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
  },
  tvHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: FreeShowTheme.colors.secondarySurface,
    borderRadius: FreeShowTheme.borderRadius.lg,
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  navItemIcon: {
    width: 40,
    alignItems: 'center',
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

  statusSection: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
  },
  connectionStatus: {
    padding: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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

// Traditional sidebar for tablets/desktop (non-overlay)
interface SidebarTraditionalProps {
  navigation: any;
  currentRoute: string;
  onNavigate: (route: string) => void;
}

export const SidebarTraditional: React.FC<SidebarTraditionalProps> = ({
  navigation: _navigation,
  currentRoute,
  onNavigate,
}) => {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded on larger screens
  const [animatedWidth] = useState(new Animated.Value(SIDEBAR_WIDTH));
  const { state } = useConnection();
  const { isConnected, connectionStatus } = state;
  const isTV = useIsTV();

  // Focus index for TV remote navigation in traditional sidebar
  const [focusedIndex, setFocusedIndex] = useState<number>(() => {
    const idx = NAVIGATION_ITEMS.findIndex(n => n.route === currentRoute);
    return idx >= 0 ? idx : 0;
  });
  const focusedIndexRef = useRef<number>(focusedIndex);
  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  // use NAVIGATION_ITEMS

  const SIDEBAR_WIDTH_COLLAPSED = 70;

  const toggleSidebar = () => {
    const targetWidth = isExpanded ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH;

    Animated.timing(animatedWidth, {
      toValue: targetWidth,
      duration: 150,
      useNativeDriver: false,
    }).start();

    setIsExpanded(!isExpanded);
  };

  const handleNavigate = (route: string) => {
    onNavigate(route);
  };

  // Sync focused index when current route changes
  useEffect(() => {
    const idx = NAVIGATION_ITEMS.findIndex(n => n.route === currentRoute);
    if (idx >= 0) setFocusedIndex(idx);
  }, [currentRoute]);

  // TV remote event handling for traditional sidebar
  useTVEvent((evt: any) => {
    const type = normalizeTVEvent(evt);
    const len = NAVIGATION_ITEMS.length;

    if (type === 'up') {
      setFocusedIndex(i => (i - 1 + len) % len);
    } else if (type === 'down') {
      setFocusedIndex(i => (i + 1) % len);
    } else if (type === 'select' || type === 'play' || type === 'selectPlay' || type === 'enter') {
      const item = NAVIGATION_ITEMS[focusedIndexRef.current];
      if (item) handleNavigate(item.route);
    }
  }, isTV);

  const getConnectionColor = () => {
    if (isConnected) {
      return '#4CAF50'; // Green when connected
    } else if (connectionStatus === 'connecting') {
      return '#FF9800'; // Orange when connecting
    } else {
      return FreeShowTheme.colors.textSecondary; // Gray when disconnected
    }
  };

  const getItemColor = (item: NavigationItem) => {
    // Always highlight the current page with purple, regardless of connection status
    if (currentRoute === item.route) {
      return FreeShowTheme.colors.secondary;
    }
    return FreeShowTheme.colors.textSecondary;
  };

  const getItemBackgroundColor = (item: NavigationItem) => {
    return currentRoute === item.route ? FreeShowTheme.colors.secondary + '15' : 'transparent';
  };

  return (
    <SafeAreaView style={traditionalStyles.safeArea} edges={['left', 'top', 'bottom']}>
      <Animated.View style={[traditionalStyles.sidebar, { width: animatedWidth }]}>
        {/* Header with toggle button */}
        <View style={[traditionalStyles.header, !isExpanded && traditionalStyles.headerCollapsed]}>
          <TouchableOpacity
            style={traditionalStyles.toggleButton}
            onPress={toggleSidebar}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isExpanded ? 'chevron-back' : 'menu'}
              size={24}
              color={FreeShowTheme.colors.text}
            />
          </TouchableOpacity>

          {isExpanded && (
            <>
              <View style={traditionalStyles.headerText}>
                <Text style={traditionalStyles.appName}>FreeShow</Text>
                <Text style={traditionalStyles.appSubtitle}>Remote</Text>
              </View>

              <View style={traditionalStyles.logoContainer}>
                <View style={traditionalStyles.logoCircle}>
                  <Image
                    source={require('../../assets/icon.png')}
                    style={traditionalStyles.logoImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Navigation Items */}
        <View
          style={[
            traditionalStyles.navigation,
            !isExpanded && traditionalStyles.navigationCollapsed,
          ]}
        >
          {NAVIGATION_ITEMS.map((item, index) => {
            const isActive = currentRoute === item.route;
            const itemColor = getItemColor(item);
            const backgroundColor = getItemBackgroundColor(item);
            const isFocusedTV = isTV && focusedIndex === index;
            const focusedStyle = isFocusedTV ? traditionalStyles.tvFocusedItem : {};

            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  traditionalStyles.navItem,
                  { backgroundColor },
                  !isExpanded && traditionalStyles.navItemCollapsed,
                ]}
                onPress={() => handleNavigate(item.route)}
                activeOpacity={0.7}
                focusable={isTV}
                hasTVPreferredFocus={isFocusedTV}
                onFocus={() => {
                  if (isTV) setFocusedIndex(index);
                }}
              >
                {/* {isFocusedTV && <View style={traditionalStyles.tvHighlight} pointerEvents="none" />} */}
                <View
                  style={[
                    traditionalStyles.navItemIcon,
                    !isExpanded && traditionalStyles.navItemIconCollapsed,
                  ]}
                >
                  <Ionicons
                    name={isActive ? item.iconFocused : item.icon}
                    size={24}
                    color={itemColor}
                  />
                </View>

                {isExpanded && (
                  <View style={traditionalStyles.navItemText}>
                    <Text style={[traditionalStyles.navItemLabel, { color: itemColor }]}>
                      {item.label}
                    </Text>
                  </View>
                )}

                {isActive && isExpanded && <View style={traditionalStyles.activeIndicator} />}

                {isActive && !isExpanded && (
                  <View style={traditionalStyles.activeIndicatorCollapsed} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Connection Status (when expanded) */}
        {isExpanded && (
          <View style={traditionalStyles.statusSection}>
            <View style={traditionalStyles.connectionStatus}>
              <View style={traditionalStyles.statusIndicator}>
                <View
                  style={[traditionalStyles.statusDot, { backgroundColor: getConnectionColor() }]}
                />
                <Text style={traditionalStyles.statusText}>
                  {isConnected
                    ? 'Connected'
                    : connectionStatus === 'connecting'
                      ? 'Connecting...'
                      : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const traditionalStyles = StyleSheet.create({
  safeArea: {
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
  },
  sidebar: {
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
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
  headerCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: FreeShowTheme.spacing.sm,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: FreeShowTheme.borderRadius.lg,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: FreeShowTheme.spacing.md,
    flex: 1,
  },
  logoContainer: {
    marginLeft: FreeShowTheme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 26,
    height: 26,
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
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.xs,
    position: 'relative',
  },
  navItemCollapsed: {
    paddingHorizontal: FreeShowTheme.spacing.xs,
    marginHorizontal: FreeShowTheme.spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    width: 54,
  },
  tvFocusedItem: {
    backgroundColor: FreeShowTheme.colors.secondarySurface,
    transform: [{ scale: 1.02 } as any],
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 10,
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
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    fontSize: FreeShowTheme.fontSize.lg,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
});
