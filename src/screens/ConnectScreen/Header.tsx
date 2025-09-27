import React from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Platform, Dimensions } from 'react-native';
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
  } | null;
  onDisconnect?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  connectionName,
  connectionHost,
  connectionPulse: _connectionPulse,
  shouldAnimate: _shouldAnimate = true,
  connectionStatus = 'disconnected',
  currentShowPorts,
  onDisconnect,
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

  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;

  return (
    <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : 20 }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>FreeShow Remote</Text>
        </View>

        {onDisconnect && isConnected && (
          <Pressable
            style={({ pressed }) => [
              styles.profileButton,
              pressed && styles.profileButtonPressed
            ]}
            onPress={onDisconnect}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.profileButtonGradient}
            >
              <Ionicons name="log-out-outline" size={isTablet ? 20 : 18} color="white" />
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Connection Status Card */}
      <View style={styles.connectionCard}>
        <LinearGradient
          colors={
            connectionStatus === 'connected' || isConnected
              ? ['rgba(76, 175, 80, 0.08)', 'rgba(76, 175, 80, 0.04)']
              : connectionStatus === 'connecting'
              ? ['rgba(255, 152, 0, 0.08)', 'rgba(255, 152, 0, 0.04)']
              : connectionStatus === 'error'
              ? ['rgba(239, 83, 80, 0.08)', 'rgba(239, 83, 80, 0.04)']
              : ['rgba(102, 102, 102, 0.08)', 'rgba(102, 102, 102, 0.04)']
          }
          style={[styles.connectionCardGradient, isTablet && styles.connectionCardGradientTablet]}
        >
          <View style={styles.connectionInfo}>
            <View style={styles.connectionStatus}>
              <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
              <Text style={[styles.connectionLabel, isTablet && styles.connectionLabelTablet]}>
                {status.label}
              </Text>
            </View>
            {(connectionStatus === 'connected' || isConnected) && (
              <Text style={[styles.connectionName, isTablet && styles.connectionNameTablet, isTablet && styles.connectionNameTabletLarge]}>
                {connectionName || connectionHost || 'Connected'}
              </Text>
            )}
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
          <View style={styles.connectionIcon}>
            <Ionicons name={status.icon} size={20} color={status.color} />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 0, // Remove padding to inherit from parent container
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    letterSpacing: -0.5,
  },
  titleTablet: {
    fontSize: 34,
  },
  profileButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileButtonPressed: {
    transform: [{ scale: 0.95 }],
  },
  profileButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },

  // Connection Card
  connectionCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  connectionCardGradient: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.08)',
  },
  connectionCardGradientTablet: {
    padding: 18,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connectionLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  connectionLabelTablet: {
    fontSize: 16,
  },
  connectionName: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  connectionNameTablet: {
    fontSize: 22,
  },
  connectionNameTabletLarge: {
    fontSize: 26,
  },
  connectionIcon: {
    marginLeft: 16,
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