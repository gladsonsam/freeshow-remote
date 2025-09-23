import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Pressable,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';

interface ConnectingScreenProps {
  onCancel: () => void;
  connectionStatus: string;
  isFloatingNav?: boolean;
}

/**
 * Connecting Screen Component
 * Shows a clean, mature connecting state that matches the not connected screen design
 */
const ConnectingScreen: React.FC<ConnectingScreenProps> = ({ 
  onCancel, 
  connectionStatus, 
  isFloatingNav = false 
}) => {
  const insets = useSafeAreaInsets();


  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Establishing connection to FreeShow';
      case 'error':
        return 'Retrying connection to FreeShow';
      case 'disconnected':
        return 'Attempting to reconnect to FreeShow';
      default:
        return 'Connecting to FreeShow';
    }
  };

  // Simple animated WiFi icon - same as not connected but with subtle pulse
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnimation]);

  return (
    <LinearGradient
      colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Animated.View
        style={[
          styles.connectingContainer,
          isFloatingNav ? { paddingBottom: 120 } : { paddingBottom: 40 },
        ]}
      >
        {/* Icon container - matches not connected design exactly */}
        <View style={styles.connectingIcon}>
          <Animated.View style={{ opacity: pulseAnimation }}>
            <Ionicons name="wifi-outline" size={48} color={FreeShowTheme.colors.secondary} />
          </Animated.View>
        </View>

        <Text style={styles.connectingTitle}>Connecting</Text>
        <Text style={styles.connectingSubtitle}>
          {getStatusMessage()}
        </Text>

        {/* Cancel button - keeping the design you liked */}
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && styles.cancelButtonPressed
          ]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel connection attempt"
          accessibilityHint="Stop the current connection attempt"
        >
          <LinearGradient
            colors={['rgba(240, 0, 140, 0.1)', 'rgba(224, 0, 122, 0.1)']}
            style={styles.cancelButtonGradient}
          >
            <Ionicons name="close-outline" size={20} color={FreeShowTheme.colors.secondary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
  connectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  connectingIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: FreeShowTheme.colors.secondary + '22',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary + '44',
    position: 'relative',
  },
  connectingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  connectingSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  cancelButton: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary + '44',
  },
  cancelButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  cancelButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
  },
});

export default ConnectingScreen;
