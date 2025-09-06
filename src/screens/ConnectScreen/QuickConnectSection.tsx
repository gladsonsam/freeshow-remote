import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { DiscoveredFreeShowInstance } from '../../services/AutoDiscoveryService';
import { ConnectionHistory } from '../../repositories';
import { configService } from '../../config/AppConfig';
import ErrorModal from '../../components/ErrorModal';

interface QuickConnectSectionProps {
  history: ConnectionHistory[];
  discoveredServices: DiscoveredFreeShowInstance[];
  isDiscoveryAvailable: boolean;
  isScanActive: boolean;
  scanComplete: boolean;
  animatedScanProgress: Animated.Value;
  onScanPress: () => void;
  onDiscoveredConnect: (service: DiscoveredFreeShowInstance) => void;
  onHistoryConnect: (historyItem: ConnectionHistory) => void;
  onRemoveFromHistory: (itemId: string) => void;
  onEditNickname: (item: ConnectionHistory) => void;
  onClearAllHistory: () => void;
}

const QuickConnectSection: React.FC<QuickConnectSectionProps> = React.memo(({
  history,
  discoveredServices,
  isDiscoveryAvailable,
  isScanActive,
  scanComplete,
  animatedScanProgress,
  onScanPress,
  onDiscoveredConnect,
  onHistoryConnect,
  onRemoveFromHistory,
  onEditNickname,
  onClearAllHistory,
}) => {
  const _discoveryTimeout = configService.getNetworkConfig().discoveryTimeout;
  const isIpAddress = useCallback((str: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(str), []);

  // Check if running in Expo Go
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  // Modal state
  const [showExpoGoWarning, setShowExpoGoWarning] = useState(false);

  // Handle scan press with Expo Go check
  const handleScanPress = useCallback(() => {
    if (isExpoGo) {
      setShowExpoGoWarning(true);
      return;
    }
    onScanPress();
  }, [isExpoGo, onScanPress]);

  // Memoize computed values
  const recentHistory = useMemo(() => history.slice(0, 3), [history]);

  const hasDiscoveredServices = useMemo(() => discoveredServices.length > 0, [discoveredServices.length]);
  const hasHistory = useMemo(() => history.length > 0, [history.length]);

  return (
    <View style={styles.quickConnectCard}>
      <View style={styles.quickConnectHeader}>
        <View style={styles.quickConnectTitleContainer}>
          <Ionicons name="flash" size={20} color={FreeShowTheme.colors.secondary} />
          <Text style={styles.quickConnectTitle}>Quick Connect</Text>
        </View>
        <Text style={styles.quickConnectSubtitle}>Tap to connect instantly</Text>
      </View>
      
      <View style={styles.quickConnectContent}>
        {/* Auto Discovery */}
        {isDiscoveryAvailable && (
          <View style={styles.discoverySection}>
            <View style={styles.discoverySectionHeader}>
              <View style={styles.discoveryTitleRow}>
                <Ionicons name="scan" size={16} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.discoveryTitle}>Network Scan</Text>
              </View>
              <TouchableOpacity
                onPress={handleScanPress}
                style={[
                  styles.discoveryToggle,
                  isScanActive && styles.discoveryToggleActive,
                  { overflow: 'hidden', position: 'relative' },
                ]}
                accessibilityLabel={isScanActive ? "Stop network scan" : "Start network scan"}
                accessibilityHint={isScanActive ? "Stop scanning for FreeShow devices on the network" : "Scan the network for available FreeShow devices"}
              >
                {/* Progress fill overlay */}
                {isScanActive && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: animatedScanProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: FreeShowTheme.colors.secondary,
                      opacity: 0.3,
                      borderRadius: 20,
                      zIndex: 1,
                    }}
                  />
                )}
                {/* Icon and label */}
                <View style={styles.discoveryToggleContent}>
                  <Ionicons
                    name={isScanActive ? 'stop' : 'search'}
                    size={16}
                    color={isScanActive ? 'white' : FreeShowTheme.colors.secondary}
                  />
                  <Text
                    style={[
                      styles.discoveryToggleText,
                      isScanActive && styles.discoveryToggleTextActive,
                      styles.discoveryToggleTextMargin,
                    ]}
                  >
                    {isScanActive ? 'Scanning…' : 'Scan'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            {hasDiscoveredServices ? (
              <View style={styles.discoveredDevices}>
                {discoveredServices.map((service: DiscoveredFreeShowInstance, _index: number) => {
                  const showHost = service.host && !isIpAddress(service.host);
                  const hasServices = service.capabilities && service.capabilities.length > 0;
                  return (
                    <TouchableOpacity
                      key={service.ip}
                      style={[
                        styles.discoveredDevice,
                        !hasServices && styles.discoveredDeviceDisabled
                      ]}
                      onPress={() => onDiscoveredConnect(service)}
                      disabled={!hasServices}
                      accessibilityLabel={`Connect to ${service.name || service.ip}`}
                      accessibilityHint={hasServices ? "Tap to connect to this FreeShow device" : "This device has no available services"}
                    >
                      <View style={styles.discoveredDeviceIcon}>
                        <Ionicons 
                          name="desktop" 
                          size={18} 
                          color={!hasServices ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.secondary} 
                        />
                      </View>
                      <View style={styles.discoveredDeviceInfo}>
                        <Text style={[
                          styles.discoveredDeviceIP,
                          !hasServices && styles.discoveredDeviceTextDisabled
                        ]}>
                          {service.name || (showHost ? service.host : service.ip)}
                        </Text>
                        {showHost && (
                          <Text style={[
                            styles.discoveredDeviceStatus,
                            !hasServices && styles.discoveredDeviceTextDisabled
                          ]}>
                            {service.ip}
                          </Text>
                        )}
                        {/* Show capabilities */}
                        <View style={styles.capabilitiesContainer}>
                          {(!service.capabilities || service.capabilities.length === 0) ? (
                            <Text style={styles.capabilityBadgeDisabled}>No Services</Text>
                          ) : (
                            <View style={styles.capabilityBadgesRow}>
                              {service.ports?.remote && (
                                <Text style={styles.capabilityBadge}>Remote:{service.ports.remote}</Text>
                              )}
                              {service.ports?.stage && (
                                <Text style={styles.capabilityBadge}>Stage:{service.ports.stage}</Text>
                              )}
                              {service.ports?.control && (
                                <Text style={styles.capabilityBadge}>Control:{service.ports.control}</Text>
                              )}
                              {service.ports?.output && (
                                <Text style={styles.capabilityBadge}>Output:{service.ports.output}</Text>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={styles.discoveredDeviceAction}>
                        <Ionicons 
                          name={!hasServices ? "ban-outline" : "arrow-forward-circle"} 
                          size={24} 
                          color={!hasServices ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.secondary} 
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyDiscovery}>
                {scanComplete && !isScanActive ? (
                  <>
                    <Ionicons name="alert-circle-outline" size={24} color={FreeShowTheme.colors.textSecondary} />
                    <Text style={styles.emptyDiscoveryText}>No devices found</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="search-outline" size={24} color={FreeShowTheme.colors.textSecondary} />
                    <Text style={styles.emptyDiscoveryText}>Tap scan to find devices</Text>
                  </>
                )}
              </View>
            )}
          </View>
        )}

        {/* Recent Connections */}
        {hasHistory && (
          <View style={styles.recentSection}>
            <View style={styles.recentSectionHeader}>
              <View style={styles.recentTitleRow}>
                <Ionicons name="time" size={16} color={FreeShowTheme.colors.textSecondary} />
                <Text style={styles.recentTitle}>Recent Connections</Text>
              </View>
              <TouchableOpacity 
                onPress={onClearAllHistory}
                style={styles.clearAllButton}
              >
                <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                <Text style={styles.clearAllText}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.recentDevices}>
              {recentHistory.map((item: ConnectionHistory, _index: number) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentDevice}
                  onPress={() => onHistoryConnect(item)}
                  accessibilityLabel={`Connect to ${item.nickname || item.host}`}
                  accessibilityHint="Tap to reconnect to this previously used FreeShow device"
                >
                  <View style={styles.recentDeviceInfo}>
                    <Text style={styles.recentDeviceIP}>{item.nickname || item.host}</Text>
                    <Text style={styles.recentDeviceTime}>
                      {item.nickname && item.nickname !== item.host ? `${item.host} • ` : ''}{new Date(item.lastUsed).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.recentDeviceActions}>
                    <TouchableOpacity
                      style={styles.editConnectionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onEditNickname(item);
                      }}
                    >
                      <Ionicons name="create-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteConnectionButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onRemoveFromHistory(item.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Expo Go Warning Modal */}
      <ErrorModal
        visible={showExpoGoWarning}
        title="Network Discovery Not Available"
        message="Network scanning (Bonjour/Zeroconf) doesn't work in Expo Go."
        buttonText="Got it"
        onClose={() => setShowExpoGoWarning(false)}
        icon="information-circle"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  // Quick Connect Styles
  quickConnectCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary + '40',
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  quickConnectHeader: {
    backgroundColor: FreeShowTheme.colors.secondary + '10',
    padding: FreeShowTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.secondary + '20',
  },
  quickConnectTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  quickConnectTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '800',
    color: FreeShowTheme.colors.secondary,
    marginLeft: FreeShowTheme.spacing.sm,
    textShadowColor: FreeShowTheme.colors.secondary + '20',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickConnectSubtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '500',
  },
  quickConnectContent: {
    padding: FreeShowTheme.spacing.lg,
  },
  
  // Discovery Section
  discoverySection: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  discoverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.md,
  },
  discoveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discoveryTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  discoveryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: FreeShowTheme.borderRadius.lg,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary + '30',
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discoveryToggleActive: {
    backgroundColor: FreeShowTheme.colors.secondary,
    borderColor: FreeShowTheme.colors.secondary,
  },

  discoveryToggleText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
    marginLeft: FreeShowTheme.spacing.xs,
  },
  discoveryToggleTextActive: {
    color: 'white',
  },
  discoveryToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  discoveryToggleTextMargin: {
    marginLeft: 6,
  },
  discoveredDevices: {
    gap: FreeShowTheme.spacing.sm,
  },
  discoveredDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary + '15',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  discoveredDeviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  discoveredDeviceInfo: {
    flex: 1,
  },
  discoveredDeviceIP: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  discoveredDeviceStatus: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
  discoveredDeviceAction: {
    padding: FreeShowTheme.spacing.xs,
  },
  discoveredDeviceDisabled: {
    opacity: 0.5,
  },
  discoveredDeviceTextDisabled: {
    color: FreeShowTheme.colors.textSecondary,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  capabilityBadge: {
    fontSize: 10,
    color: FreeShowTheme.colors.secondary,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    overflow: 'hidden',
  },
  capabilityBadgeDisabled: {
    fontSize: 10,
    color: FreeShowTheme.colors.textSecondary,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    overflow: 'hidden',
  },
  capabilityBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.xs,
  },
  emptyDiscovery: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.xl,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  emptyDiscoveryText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    fontStyle: 'italic',
  },
  
  // Recent Connections Section
  recentSection: {
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
    paddingTop: FreeShowTheme.spacing.lg,
  },
  recentSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.md,
  },
  recentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
    marginLeft: FreeShowTheme.spacing.sm,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: FreeShowTheme.borderRadius.sm,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    paddingVertical: FreeShowTheme.spacing.xs,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  clearAllText: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.textSecondary,
    marginLeft: FreeShowTheme.spacing.xs,
    fontWeight: '500',
  },
  recentDevices: {
    gap: FreeShowTheme.spacing.sm,
  },
  recentDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  recentDeviceActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editConnectionButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  deleteConnectionButton: {
    padding: FreeShowTheme.spacing.sm,
    marginLeft: FreeShowTheme.spacing.xs,
  },
  recentDeviceInfo: {
    flex: 1,
  },
  recentDeviceIP: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '500',
    color: FreeShowTheme.colors.text,
  },
  recentDeviceTime: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
});

export default QuickConnectSection;