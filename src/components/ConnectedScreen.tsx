import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useSettings } from '../contexts';
import { getNavigationLayoutInfo, getBottomPadding } from '../utils/navigationUtils';

interface ConnectedScreenProps {
  connectionName: string | null;
  connectionHost: string | null;
  currentShowPorts: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  } | null;
  onDisconnect: () => void;
  onShowQRCode: () => void;
  isFloatingNav?: boolean;
}

const ConnectedScreen: React.FC<ConnectedScreenProps> = ({
  connectionName,
  connectionHost,
  currentShowPorts,
  onDisconnect,
  onShowQRCode,
  isFloatingNav = false,
}) => {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { shouldSkipSafeArea, isFloatingNav: navIsFloating } = getNavigationLayoutInfo(settings?.navigationLayout);
  
  // Use prop value if provided, otherwise use detected value
  const effectiveIsFloatingNav = isFloatingNav || navIsFloating;

  const getActivePortsCount = () => {
    if (!currentShowPorts) return 0;
    return Object.entries(currentShowPorts)
      .filter(([name, port]) => {
        // Filter out non-port properties like hasEnabledInterfaces
        return name !== 'hasEnabledInterfaces' && 
               name !== 'validatedPorts' && 
               port && 
               port > 0 && 
               typeof port === 'number';
      }).length;
  };

  const getActivePortsList = () => {
    if (!currentShowPorts) return [];
    return Object.entries(currentShowPorts)
      .filter(([name, port]) => {
        // Filter out non-port properties like hasEnabledInterfaces
        return name !== 'hasEnabledInterfaces' && 
               name !== 'validatedPorts' && 
               port && 
               port > 0 && 
               typeof port === 'number';
      })
      .map(([name, port]) => ({ name, port }));
  };

  const ConnectionInfoCard = () => (
    <View style={styles.infoCard}>
      <LinearGradient
        colors={['rgba(76,175,80,0.12)', 'rgba(76,175,80,0.08)']}
        style={styles.infoCardGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={15} style={styles.infoCardBlur}>
            <View style={styles.infoCardContent}>
              <View style={styles.infoHeader}>
                <View style={styles.statusIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <Text style={styles.statusText}>Connected</Text>
                </View>
              </View>
              
              <View style={styles.connectionDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="wifi" size={20} color={FreeShowTheme.colors.secondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Server</Text>
                    <Text style={styles.detailValue}>
                      {connectionName || connectionHost || 'Unknown'}
                    </Text>
                  </View>
                </View>
                
                {connectionHost && (
                  <View style={styles.detailRow}>
                    <Ionicons name="globe-outline" size={20} color={FreeShowTheme.colors.secondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>IP Address</Text>
                      <Text style={styles.detailValue}>{connectionHost}</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Ionicons name="layers-outline" size={20} color={FreeShowTheme.colors.secondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Active Interfaces</Text>
                    <Text style={styles.detailValue}>
                      {getActivePortsCount()} of 5 enabled
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.infoCardContent, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
            <View style={styles.infoHeader}>
              <View style={styles.statusIndicator}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.statusText}>Connected</Text>
              </View>
            </View>
            
            <View style={styles.connectionDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="wifi" size={20} color={FreeShowTheme.colors.secondary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Server</Text>
                  <Text style={styles.detailValue}>
                    {connectionName || connectionHost || 'Unknown'}
                  </Text>
                </View>
              </View>
              
              {connectionHost && (
                <View style={styles.detailRow}>
                  <Ionicons name="globe-outline" size={20} color={FreeShowTheme.colors.secondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>IP Address</Text>
                    <Text style={styles.detailValue}>{connectionHost}</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.detailRow}>
                <Ionicons name="layers-outline" size={20} color={FreeShowTheme.colors.secondary} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Active Interfaces</Text>
                  <Text style={styles.detailValue}>
                    {getActivePortsCount()} of 5 enabled
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const PortsCard = () => (
    <View style={styles.portsCard}>
      <LinearGradient
        colors={['rgba(240,0,140,0.10)', 'rgba(240,0,140,0.05)']}
        style={styles.portsCardGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={15} style={styles.portsCardBlur}>
            <View style={styles.portsCardContent}>
              <View style={styles.portsHeader}>
                <Ionicons name="settings-outline" size={24} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.portsTitle}>Interface Ports</Text>
              </View>
              
              <View style={styles.portsGrid}>
                {getActivePortsList().map(({ name, port }) => {
                  if (!port || port <= 0 || isNaN(port)) return null;
                  return (
                    <View key={name} style={styles.portItem}>
                      <Text style={styles.portName}>{name}</Text>
                      <Text style={styles.portNumber}>{port}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.portsCardContent, { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
            <View style={styles.portsHeader}>
              <Ionicons name="settings-outline" size={24} color={FreeShowTheme.colors.secondary} />
              <Text style={styles.portsTitle}>Interface Ports</Text>
            </View>
            
            <View style={styles.portsGrid}>
              {getActivePortsList().map(({ name, port }) => {
                if (!port || port <= 0 || isNaN(port)) return null;
                return (
                  <View key={name} style={styles.portItem}>
                    <Text style={styles.portName}>{name}</Text>
                    <Text style={styles.portNumber}>{port}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  const ActionsCard = () => (
    <View style={styles.actionsCard}>
      <LinearGradient
        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
        style={styles.actionsCardGradient}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={15} style={styles.actionsCardBlur}>
            <View style={styles.actionsCardContent}>
              <Text style={styles.actionsTitle}>Quick Actions</Text>
              
              <View style={styles.actionButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.shareButton,
                    pressed && styles.actionButtonPressed
                  ]}
                  onPress={onShowQRCode}
                >
                  <LinearGradient
                    colors={['#2196F3', '#1976D2']}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="qr-code" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Share QR</Text>
                  </LinearGradient>
                </Pressable>
                
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.disconnectButton,
                    pressed && styles.actionButtonPressed
                  ]}
                  onPress={onDisconnect}
                >
                  <LinearGradient
                    colors={['#F44336', '#D32F2F']}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="log-out-outline" size={20} color="white" />
                    <Text style={styles.actionButtonText}>Disconnect</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.actionsCardContent, { backgroundColor: 'rgba(255,255,255,0.02)' }]}>
            <Text style={styles.actionsTitle}>Quick Actions</Text>
            
            <View style={styles.actionButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.shareButton,
                  pressed && styles.actionButtonPressed
                ]}
                onPress={onShowQRCode}
              >
                <LinearGradient
                  colors={['#2196F3', '#1976D2']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="qr-code" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Share QR</Text>
                </LinearGradient>
              </Pressable>
              
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.disconnectButton,
                  pressed && styles.actionButtonPressed
                ]}
                onPress={onDisconnect}
              >
                <LinearGradient
                  colors={['#F44336', '#D32F2F']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="log-out-outline" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Disconnect</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );

  return (
    <LinearGradient
      colors={['#0a0a0f', '#0d0d15', '#0f0f18']}
      style={[styles.container, !shouldSkipSafeArea && { paddingTop: insets.top }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: getBottomPadding(effectiveIsFloatingNav) }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={[styles.screenTitle, Dimensions.get('window').width >= 768 && styles.titleTablet]}>Connection Status</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardsContainer}>
          <ConnectionInfoCard />
          <PortsCard />
          <ActionsCard />
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
  },
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
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  titleTablet: {
    fontSize: 34,
  },
  screenSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  cardsContainer: {
    gap: FreeShowTheme.spacing.lg,
  },
  
  // Connection Info Card
  infoCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCardBlur: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoCardContent: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  infoHeader: {
    marginBottom: 20,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4CAF50',
  },
  connectionDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  
  // Ports Card
  portsCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsCardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(240,0,140,0.3)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsCardBlur: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsCardContent: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  portsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  portsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: FreeShowTheme.colors.secondary,
  },
  portsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  portItem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  portName: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  portNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  
  // Actions Card
  actionsCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionsCardGradient: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionsCardBlur: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionsCardContent: {
    padding: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  shareButton: {},
  disconnectButton: {},
});

export default ConnectedScreen;
