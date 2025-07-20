import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts/ConnectionContext';

interface ConnectionBannerProps {
  onConnectPress?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({ onConnectPress }) => {
  const { isConnected, connectionStatus, connectionHost, lastError } = useConnection();

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: 'checkmark-circle' as const,
          color: '#2ECC40',
          text: `Connected to ${connectionHost}`,
          backgroundColor: '#2ECC4020',
          borderColor: '#2ECC40',
        };
      case 'connecting':
        return {
          icon: 'time' as const,
          color: '#FF851B',
          text: 'Connecting to FreeShow...',
          backgroundColor: '#FF851B20',
          borderColor: '#FF851B',
        };
      case 'error':
        return {
          icon: 'warning' as const,
          color: '#FF4136',
          text: lastError || 'Connection failed',
          backgroundColor: '#FF413620',
          borderColor: '#FF4136',
        };
      default:
        return {
          icon: 'wifi-outline' as const,
          color: FreeShowTheme.colors.primaryLighter,
          text: 'Not connected to FreeShow',
          backgroundColor: FreeShowTheme.colors.primaryLighter + '20',
          borderColor: FreeShowTheme.colors.primaryLighter,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <TouchableOpacity
      style={[
        styles.banner,
        {
          backgroundColor: statusInfo.backgroundColor,
          borderColor: statusInfo.borderColor,
        },
      ]}
      onPress={onConnectPress}
      disabled={connectionStatus === 'connecting'}
    >
      <Ionicons name={statusInfo.icon} size={20} color={statusInfo.color} />
      <Text style={[styles.bannerText, { color: statusInfo.color }]}>
        {statusInfo.text}
      </Text>
      {!isConnected && onConnectPress && (
        <Ionicons name="chevron-forward" size={16} color={statusInfo.color} />
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
  bannerText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontFamily: FreeShowTheme.fonts.system,
    flex: 1,
    marginLeft: FreeShowTheme.spacing.sm,
  },
});
