import React from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface HeaderProps {
  isConnected: boolean;
  connectionName: string | null;
  connectionHost: string | null;
  connectionPulse: Animated.Value;
}

const Header: React.FC<HeaderProps> = ({
  isConnected,
  connectionName,
  connectionHost,
  connectionPulse,
}) => {
  const getStatusDisplay = (): {
    color: string;
    text: string;
    icon: 'checkmark-circle' | 'time' | 'radio-button-off';
    bgColor: string;
  } => {
    if (isConnected) {
      return {
        color: FreeShowTheme.colors.connected,
        text: `Connected to ${connectionName || connectionHost || 'Unknown'}`,
        icon: 'checkmark-circle',
        bgColor: 'rgba(76, 175, 80, 0.15)',
      };
    } else {
      return {
        color: FreeShowTheme.colors.textSecondary,
        text: 'Not Connected',
        icon: 'radio-button-off',
        bgColor: 'rgba(102, 102, 102, 0.1)',
      };
    }
  };

  const status = getStatusDisplay();

  return (
    <View style={styles.header}>
      {/* Logo and Title Row */}
      <View style={styles.topRow}>
        <View style={[styles.logoContainer, isConnected && styles.logoConnected]}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="cover"
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>FreeShow Remote</Text>
          <Text style={styles.versionText}>v1.0.1</Text>
        </View>
      </View>

      {/* Status Badge */}
      <View style={[styles.statusContainer, { backgroundColor: status.bgColor }]}>
        <Animated.View style={[
          styles.statusIndicator,
          { transform: [{ scale: isConnected ? connectionPulse : 1 }] }
        ]}>
          <Ionicons name={status.icon} size={16} color={status.color} />
        </Animated.View>
        <Text style={[styles.statusText, { color: status.color }]}>
          {status.text}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.md,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  logoConnected: {
    borderColor: FreeShowTheme.colors.connected,
    shadowColor: FreeShowTheme.colors.connected,
  },
  logoImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
  },
  titleContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '500',
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusIndicator: {
    marginRight: FreeShowTheme.spacing.sm,
  },
  statusText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
  },
});

export default Header;