import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface InterfaceHeaderProps {
  connectionName: string | null;
  connectionHost: string | null;
  onDisconnect: () => void;
}

/**
 * Header component for the interface screen
 * Displays connection status and disconnect button
 */
const InterfaceHeader: React.FC<InterfaceHeaderProps> = ({
  connectionName,
  connectionHost,
  onDisconnect,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const isTablet = screenWidth >= 768;

  return (
    <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 10 : 20 }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, isTablet && styles.titleTablet]}>FreeShow Remote</Text>
        </View>

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
      </View>

      {/* Connection Status Card */}
      <View style={styles.connectionCard}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.08)', 'rgba(168, 85, 247, 0.04)']}
          style={[styles.connectionCardGradient, isTablet && styles.connectionCardGradientTablet]}
        >
          <View style={styles.connectionInfo}>
            <View style={styles.connectionStatus}>
              <View style={styles.statusIndicator} />
              <Text style={[styles.connectionLabel, isTablet && styles.connectionLabelTablet]}>Connected to</Text>
            </View>
            <Text style={[styles.connectionName, isTablet && styles.connectionNameTablet, isTablet && styles.connectionNameTabletLarge]}>
              {connectionName || connectionHost || 'Unknown'}
            </Text>
          </View>
          <View style={styles.connectionIcon}>
            <Ionicons name="checkmark-circle" size={20} color="#06D6A0" />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 0,
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
    backgroundColor: '#06D6A0',
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
});

export default InterfaceHeader;
