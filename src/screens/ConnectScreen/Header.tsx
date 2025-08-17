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
  } => {
    if (isConnected) {
      return {
        color: FreeShowTheme.colors.connected,
        text: `Connected to ${connectionName || connectionHost || 'Unknown'}`,
        icon: 'checkmark-circle',
      };
    } else {
      return {
        color: FreeShowTheme.colors.textSecondary,
        text: 'Not Connected',
        icon: 'radio-button-off',
      };
    }
  };

  const status = getStatusDisplay();

  return (
    <View style={styles.header}>
      <View style={styles.brandContainer}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoIcon, isConnected && styles.logoConnected]}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={styles.appTitle}>FreeShow Remote</Text>
      </View>
      
      <View style={styles.statusContainer}>
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
  // Header Styles
  header: {
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  logoContainer: {
    marginBottom: FreeShowTheme.spacing.md,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: FreeShowTheme.colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  logoConnected: {
    shadowColor: FreeShowTheme.colors.connected,
    borderColor: FreeShowTheme.colors.connected,
  },
  logoImage: {
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
  },
  appTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
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