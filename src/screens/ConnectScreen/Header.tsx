import React from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface HeaderProps {
  isConnected: boolean;
  connectionName: string | null;
  connectionHost: string | null;
  connectionPulse: Animated.Value;
  shouldAnimate?: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
  currentShowPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  };
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  connectionName,
  connectionHost,
  connectionPulse: _connectionPulse,
  shouldAnimate: _shouldAnimate = true,
  connectionStatus = 'disconnected',
  currentShowPorts,
}) => {
  const status = React.useMemo((): {
    color: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    bgColor: string;
    border: string;
    subtitle: string;
  } => {
    if (connectionStatus === 'connected' || isConnected) {
      return {
        color: '#4CAF50',
        label: 'Connected',
        icon: 'checkmark-circle',
        bgColor: 'rgba(76,175,80,0.12)',
        border: 'rgba(76,175,80,0.25)',
        subtitle: `Connected to ${connectionName || connectionHost || 'Unknown'}`,
      };
    }
    if (connectionStatus === 'connecting') {
      return {
        color: '#FF9800',
        label: 'Connecting…',
        icon: 'time',
        bgColor: 'rgba(255,152,0,0.12)',
        border: 'rgba(255,152,0,0.25)',
        subtitle: 'Attempting to connect',
      };
    }
    if (connectionStatus === 'error') {
      return {
        color: '#EF5350',
        label: 'Error',
        icon: 'warning',
        bgColor: 'rgba(239,83,80,0.12)',
        border: 'rgba(239,83,80,0.25)',
        subtitle: 'Not connected',
      };
    }
    return {
      color: FreeShowTheme.colors.textSecondary,
      label: 'Offline',
      icon: 'radio-button-off',
      bgColor: 'rgba(102,102,102,0.1)',
      border: 'rgba(255,255,255,0.12)',
      subtitle: 'Not connected',
    };
  }, [connectionStatus, isConnected, connectionName, connectionHost]);

  return (
    <LinearGradient
      colors={['rgba(20,20,30,0.95)', 'rgba(15,15,24,0.98)']}
      style={styles.card}
    >
      <View style={styles.left}>
        <View style={[styles.logoContainer, { borderColor: status.color }]}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>
      </View>
      <View style={styles.center}>
        <Text style={styles.appTitle}>FreeShow Remote</Text>
        <Text style={styles.subtitle}>
          {status.subtitle}
        </Text>
        {isConnected && currentShowPorts && (
          <View style={styles.portsContainer}>
            {Object.entries(currentShowPorts)
              .filter(([_, port]) => port > 0)
              .map(([name, port]) => (
                <View key={name} style={styles.portChip}>
                  <Text style={styles.portChipText}>
                    {name}: {port}
                  </Text>
                </View>
              ))}
          </View>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  left: {
    marginRight: FreeShowTheme.spacing.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  center: {
    flex: 1,
    minWidth: 0,
  },
  appTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 2,
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
  },
  portsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  portChip: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
  },
  portChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    textTransform: 'capitalize',
  },
});

export default Header;