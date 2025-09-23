import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';

interface NotConnectedScreenProps {
  onNavigateToConnect: () => void;
  isFloatingNav?: boolean;
}

/**
 * Not Connected Screen Component
 * Shows when the app is not connected to FreeShow with option to connect
 */
const NotConnectedScreen: React.FC<NotConnectedScreenProps> = ({ 
  onNavigateToConnect, 
  isFloatingNav = false 
}) => {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View
        style={[
          styles.notConnectedContainer,
          isFloatingNav ? { paddingBottom: 120 } : { paddingBottom: 40 },
          {
            opacity: 1,
            transform: [{ translateY: 0 }],
          }
        ]}
      >
        <View style={styles.notConnectedIcon}>
          <Ionicons name="wifi-outline" size={48} color={FreeShowTheme.colors.secondary} />
        </View>

        <Text style={styles.notConnectedTitle}>Not Connected</Text>
        <Text style={styles.notConnectedSubtitle}>
          Connect to FreeShow to access interfaces
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.connectButton,
            pressed && styles.connectButtonPressed
          ]}
          onPress={onNavigateToConnect}
          accessibilityRole="button"
          accessibilityLabel="Connect to FreeShow server"
          accessibilityHint="Navigate to connection screen to set up a new connection"
        >
          <LinearGradient
            colors={['#F0008C', '#E0007A', '#D0006B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.connectButtonGradient}
          >
            <View style={styles.connectButtonInner}>
              <Ionicons name="wifi" size={22} color="white" />
              <Text style={styles.connectButtonText}>Connect to FreeShow</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  notConnectedIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: FreeShowTheme.colors.secondary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary + '44',
  },
  notConnectedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  notConnectedSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  connectButton: {
    borderRadius: 20,
    overflow: 'hidden',
    // Enhanced shadow for depth
    shadowColor: '#F0008C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    // Subtle border glow
    borderWidth: 1,
    borderColor: 'rgba(240, 0, 140, 0.3)',
  },
  connectButtonPressed: {
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  connectButtonGradient: {
    borderRadius: 20,
  },
  connectButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 18,
    gap: 12,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 0.5,
  },
});

export default NotConnectedScreen;
