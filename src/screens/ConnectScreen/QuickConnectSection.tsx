import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { DiscoveredFreeShowInstance } from '../../services/AutoDiscoveryService';
import { ConnectionHistory } from '../../repositories';
import { configService } from '../../config/AppConfig';

interface QuickConnectSectionProps {
  history: ConnectionHistory[];
  discoveredServices: DiscoveredFreeShowInstance[];
  isDiscoveryAvailable: boolean;
  isDiscovering: boolean;
  isScanActive: boolean;
  scanProgress: number;
  scanComplete: boolean;
  animatedScanProgress: Animated.Value;
  onScanPress: () => void;
  onDiscoveredConnect: (service: DiscoveredFreeShowInstance) => void;
  onHistoryConnect: (historyItem: ConnectionHistory) => void;
  onRemoveFromHistory: (itemId: string) => void;
  onEditNickname: (item: ConnectionHistory) => void;
  onClearAllHistory: () => void;
}

const QuickConnectSection: React.FC<QuickConnectSectionProps> = ({
  history,
  discoveredServices,
  isDiscoveryAvailable,
  isDiscovering: _isDiscovering,
  isScanActive,
  scanProgress: _scanProgress,
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
  const isIpAddress = (str: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(str);

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
                onPress={onScanPress}
                style={[
                  styles.discoveryToggle,
                  isScanActive && styles.discoveryToggleActive,
                  { overflow: 'hidden', position: 'relative' },
                ]}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2 }}>
                  <Ionicons
                    name={isScanActive ? 'stop' : 'search'}
                    size={16}
                    color={isScanActive ? 'white' : FreeShowTheme.colors.secondary}
                  />
                  <Text
                    style={[
                      styles.discoveryToggleText,
                      isScanActive && styles.discoveryToggleTextActive,
                      { marginLeft: 6 },
                    ]}
                  >
                    {isScanActive ? 'Scanning…' : 'Scan'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            {discoveredServices.length > 0 ? (
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
                            <>
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
                            </>
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
        {history.length > 0 && (
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
              {history.slice(0, 3).map((item: ConnectionHistory, _index: number) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.recentDevice}
                  onPress={() => onHistoryConnect(item)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  // Quick Connect Styles
  quickConnectCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.secondary + '30',
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  quickConnectHeader: {
    backgroundColor: FreeShowTheme.colors.secondary + '15',
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
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginLeft: FreeShowTheme.spacing.sm,
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
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.xl,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary,
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
  discoveredDevices: {
    gap: FreeShowTheme.spacing.sm,
  },
  discoveredDevice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discoveredDeviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
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
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  capabilityBadgeDisabled: {
    fontSize: 10,
    color: FreeShowTheme.colors.textSecondary,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
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
    backgroundColor: FreeShowTheme.colors.primary,
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
    backgroundColor: FreeShowTheme.colors.primary + '80',
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '60',
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