import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface HeaderProps {
  isTablet: boolean;
  connectionName: string | null;
  connectionHost: string | null;
  onDisconnect: () => void;
  navigationLayout?: string;
}

const Header: React.FC<HeaderProps> = ({
  isTablet,
  connectionName,
  connectionHost,
  onDisconnect,
  navigationLayout,
}) => {
  return (
    <View style={[
      styles.header,
      {
        // Add appropriate padding based on device type and navigation layout
        paddingTop: isTablet 
          ? FreeShowTheme.spacing.md 
          : (navigationLayout === 'sidebar' ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.md),
      }
    ]}>
      <View style={styles.headerContent}>
        <View style={styles.headerTitle}>
          <Text style={[
            styles.title,
            { fontSize: isTablet ? FreeShowTheme.fontSize.xxxl : FreeShowTheme.fontSize.xxl }
          ]}>
            FreeShow Interfaces
          </Text>
          <View style={styles.connectionPill}>
            <View style={styles.statusDot} />
            <Text
              style={[
                styles.connectionText,
                { fontSize: isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm }
              ]}
              numberOfLines={1}
            >
              {connectionName || connectionHost}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.disconnectButton} onPress={onDisconnect}>
          <Ionicons 
            name="log-out-outline" 
            size={isTablet ? 26 : 22} 
            color={FreeShowTheme.colors.text + 'CC'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
    paddingBottom: FreeShowTheme.spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: FreeShowTheme.spacing.md,
  },
  connectionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF14',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FFFFFF22',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC40',
  },
  connectionText: {
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    maxWidth: '90%',
  },
  disconnectButton: {
    padding: FreeShowTheme.spacing.sm,
    marginTop: -FreeShowTheme.spacing.xs, // Align with title
  },
});

export default Header;