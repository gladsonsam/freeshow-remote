import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts/ConnectionContext';

interface ConnectionBannerProps {
  onConnectPress?: () => void;
  forceExpanded?: boolean;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ 
  onConnectPress, 
  forceExpanded = false 
}) => {
  const { isConnected, connectionStatus, connectionHost, lastError } = useConnection();
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: 'checkmark-circle' as const,
          color: '#2ECC40',
          text: `Connected to ${connectionHost}`,
          backgroundColor: '#2ECC4020',
          borderColor: '#2ECC40',
          dotColor: '#2ECC40',
        };
      case 'connecting':
        return {
          icon: 'time' as const,
          color: '#FF851B',
          text: 'Connecting to FreeShow...',
          backgroundColor: '#FF851B20',
          borderColor: '#FF851B',
          dotColor: '#FF851B',
        };
      case 'error':
        return {
          icon: 'warning' as const,
          color: '#FF4136',
          text: lastError || 'Connection failed',
          backgroundColor: '#FF413620',
          borderColor: '#FF4136',
          dotColor: '#FF4136',
        };
      default:
        return {
          icon: 'wifi-outline' as const,
          color: FreeShowTheme.colors.primaryLighter,
          text: 'Not connected to FreeShow',
          backgroundColor: FreeShowTheme.colors.primaryLighter + '20',
          borderColor: FreeShowTheme.colors.primaryLighter,
          dotColor: FreeShowTheme.colors.primaryLighter,
        };
    }
  };

  const statusInfo = getStatusInfo();

  const toggleExpanded = () => {
    if (isConnected) {
      setIsExpanded(!isExpanded);
    } else if (onConnectPress) {
      onConnectPress();
    }
  };

  // Compact view - just a dot (only if connected and not forced to expand)
  if (!isExpanded && isConnected && !forceExpanded) {
    return (
      <TouchableOpacity
        style={styles.compactBanner}
        onPress={toggleExpanded}
        activeOpacity={0.7}
      >
        <View style={[styles.statusDot, { backgroundColor: statusInfo.dotColor }]} />
      </TouchableOpacity>
    );
  }

  // Expanded view or non-connected state
  return (
    <TouchableOpacity
      style={[
        styles.banner,
        {
          backgroundColor: statusInfo.backgroundColor,
          borderColor: statusInfo.borderColor,
        },
      ]}
      onPress={toggleExpanded}
      disabled={connectionStatus === 'connecting'}
      activeOpacity={0.7}
    >
      <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
      <Text style={[styles.bannerText, { color: statusInfo.color }]}>
        {statusInfo.text}
      </Text>
      {isConnected ? (
        <Ionicons 
          name={isExpanded ? "chevron-up" : "chevron-down"} 
          size={16} 
          color={statusInfo.color} 
        />
      ) : (
        onConnectPress && (
          <Ionicons name="chevron-forward" size={16} color={statusInfo.color} />
        )
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  compactBanner: {
    alignSelf: 'flex-end',
    marginBottom: FreeShowTheme.spacing.lg,
    marginRight: FreeShowTheme.spacing.md,
    padding: FreeShowTheme.spacing.xs,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  bannerText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontFamily: FreeShowTheme.fonts.system,
    flex: 1,
    marginLeft: FreeShowTheme.spacing.sm,
  },
});
