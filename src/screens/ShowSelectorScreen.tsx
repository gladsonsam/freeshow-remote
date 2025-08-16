import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  AppState,
  AppStateStatus,
  Pressable,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection, useSettings } from '../contexts';
import { ShowOption } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorModal from '../components/ErrorModal';
import { WebView } from 'react-native-webview';

// Responsive sizing utility
const getResponsiveDimensions = () => {
  const windowDimensions = Dimensions.get('window');
  const screenDimensions = Dimensions.get('screen');
  
  // Use screen dimensions as fallback if window dimensions are invalid (0x0)
  const effectiveWidth = windowDimensions.width > 0 ? windowDimensions.width : screenDimensions.width;
  const effectiveHeight = windowDimensions.height > 0 ? windowDimensions.height : screenDimensions.height;
  
  // Use both window and screen dimensions for more reliable tablet detection
  const windowSize = Math.min(effectiveWidth, effectiveHeight);
  const screenSize = Math.min(screenDimensions.width, screenDimensions.height);
  
  // A device is considered a tablet if the smallest dimension is > 600
  // Use screen dimensions as fallback if window dimensions seem unreliable
  const isTablet = windowSize > 600 || (windowSize < 300 && screenSize > 600);
  const isLandscape = effectiveWidth > effectiveHeight;
  
  // Log for debugging tablet detection issues (less verbose now)
  console.log('[ShowSelectorScreen] Dimensions:', {
    effective: { width: effectiveWidth, height: effectiveHeight },
    isTablet,
    windowSize,
    screenSize
  });
  
  return {
    isTablet,
    isLandscape,
    screenWidth: effectiveWidth,
    screenHeight: effectiveHeight,
    isSmallScreen: effectiveHeight < 700,
  };
};

interface ShowSelectorScreenProps {
  navigation: any;
}

const ShowSelectorScreen: React.FC<ShowSelectorScreenProps> = ({ navigation }) => {
  const { state, actions } = useConnection();
  const { settings } = useSettings();
  const { isConnected, connectionHost, connectionName, currentShowPorts } = state;
  const { disconnect } = actions;
  
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  const [compactPopup, setCompactPopup] = useState<{ visible: boolean; show: ShowOption | null }>({ visible: false, show: null });
  const [previewModal, setPreviewModal] = useState<{ visible: boolean; url: string; title: string; description?: string; showId?: string; port?: number }>({ visible: false, url: '', title: '', description: '', showId: undefined, port: undefined });
  const [previewLoading, setPreviewLoading] = useState(false);

  // Force refresh dimensions when component mounts (helps with navigation from other screens)
  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      console.log('[ShowSelectorScreen] Component mounted, refreshing dimensions');
      setDimensions(getResponsiveDimensions());
    }, 50);

    return () => clearTimeout(refreshTimer);
  }, []);

  // Update dimensions when orientation changes or app state changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      setDimensions(getResponsiveDimensions());
    });

    return () => subscription?.remove();
  }, []);

  // Refresh dimensions when app comes to foreground (fixes tablet layout on soft launch)
  useEffect(() => {
    let previousAppState = AppState.currentState;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log(`[ShowSelectorScreen] App state changed from ${previousAppState} to ${nextAppState}`);
      
      // If app is coming to foreground, refresh dimensions
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[ShowSelectorScreen] App came to foreground, refreshing dimensions');
        
        // Small delay to ensure screen is properly rendered
        setTimeout(() => {
          const newDimensions = getResponsiveDimensions();
          setDimensions(newDimensions);
        }, 100);
      }
      previousAppState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const getShowOptions = () => {
    const defaultPorts = {
      remote: 5510,
      stage: 5511,
      control: 5512,
      output: 5513,
      api: 5505,
    };

    // Use current show ports if available, otherwise fall back to defaults
    const showPorts = currentShowPorts || defaultPorts;

    return [
      {
        id: 'remote',
        title: 'RemoteShow',
        description: 'Control slides and presentations',
        port: showPorts.remote,
        icon: 'play-circle',
        color: '#f0008c',
      },
      {
        id: 'stage',
        title: 'StageShow',
        description: 'Display for people on stage',
        port: showPorts.stage,
        icon: 'desktop',
        color: '#2ECC40',
      },
      {
        id: 'control',
        title: 'ControlShow',
        description: 'Control interface for operators',
        port: showPorts.control,
        icon: 'settings',
        color: '#0074D9',
      },
      {
        id: 'output',
        title: 'OutputShow',
        description: 'Output display for screens',
        port: showPorts.output,
        icon: 'tv',
        color: '#FF851B',
      },
      {
        id: 'api',
        title: 'API Controls',
        description: 'Native API controls',
        port: showPorts.api,
        icon: 'code-slash',
        color: '#B10DC9',
      },
    ];
  };

  const showOptions = getShowOptions();
  const isGrid = dimensions.isTablet || (dimensions.isLandscape && dimensions.screenWidth >= 800);

  const handleShowSelect = (show: ShowOption) => {
    if (!isConnected || !connectionHost) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Not connected to FreeShow'
      });
      return;
    }

    try {
      if (show.id === 'api') {
        // Navigate to APIScreen for API interface
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('APIScreen', {
            title: show.title,
            showId: show.id,
          });
        } else if (navigation && typeof navigation.navigate === 'function') {
          // Fallback for custom navigation (sidebar)
          navigation.navigate('APIScreen', {
            title: show.title,
            showId: show.id,
          });
        } else {
          console.warn('[ShowSelectorScreen] No valid navigation available for API interface');
          setErrorModal({
            visible: true,
            title: 'Navigation Error',
            message: 'Unable to navigate to API interface'
          });
        }
      } else {
        // Navigate to WebView for other interfaces
        const url = `http://${connectionHost}:${show.port}`;
        
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('WebView', {
            url,
            title: show.title,
            showId: show.id,
          });
        } else if (navigation && typeof navigation.navigate === 'function') {
          // Fallback for custom navigation (sidebar)
          navigation.navigate('WebView', {
            url,
            title: show.title,
            showId: show.id,
          });
        } else {
          console.warn('[ShowSelectorScreen] No valid navigation available for WebView');
          setErrorModal({
            visible: true,
            title: 'Navigation Error',
            message: 'Unable to navigate to interface'
          });
        }
      }
    } catch (navigationError) {
      console.error('[ShowSelectorScreen] Navigation error:', navigationError);
      setErrorModal({
        visible: true,
        title: 'Navigation Error',
        message: 'Unable to navigate to the selected interface'
      });
    }
  };

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = () => {
    disconnect();
    setShowDisconnectConfirm(false);
    try {
      if (navigation && typeof navigation.navigate === 'function') {
        navigation.navigate('Connect');
      } else {
        console.warn('[ShowSelectorScreen] No valid navigation available for Connect');
      }
    } catch (navigationError) {
      console.error('[ShowSelectorScreen] Disconnect navigation error:', navigationError);
    }
  };

  const cancelDisconnect = () => {
    setShowDisconnectConfirm(false);
  };

  const openCompactPopup = (show: ShowOption) => {
    setCompactPopup({ visible: true, show });
  };

  const closeCompactPopup = () => {
    setCompactPopup({ visible: false, show: null });
  };

  const copyToClipboard = async (show: ShowOption) => {
    if (!connectionHost) {
      setErrorModal({ visible: true, title: 'Error', message: 'No connection host available' });
      return;
    }

    try {
      const url = `http://${connectionHost}:${show.port}`;
      await Clipboard.setStringAsync(url);
      setErrorModal({ visible: true, title: 'Copied', message: 'URL copied to clipboard' });
    } catch (error) {
      setErrorModal({ visible: true, title: 'Error', message: 'Failed to copy URL to clipboard' });
    }
  };

  const openInBrowser = async (show: ShowOption) => {
    if (!connectionHost) {
      setErrorModal({ visible: true, title: 'Error', message: 'No connection host available' });
      return;
    }

    try {
      const url = `http://${connectionHost}:${show.port}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        closeCompactPopup();
      } else {
        setErrorModal({ visible: true, title: 'Error', message: 'Cannot open URL in browser' });
      }
    } catch (error) {
      setErrorModal({ visible: true, title: 'Error', message: 'Failed to open URL in browser' });
    }
  };

  const openPreview = (show: ShowOption) => {
    if (!connectionHost) {
      setErrorModal({ visible: true, title: 'Error', message: 'No connection host available for preview' });
      return;
    }

    const url = `http://${connectionHost}:${show.port}`;
    setPreviewModal({ visible: true, url, title: show.title, description: show.description, showId: show.id, port: show.port });
    setPreviewLoading(true);
  };

  const openFullView = () => {
    const { url, title, showId } = previewModal;
    // Close preview first
    closePreview();

    try {
      if (showId === 'api') {
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('APIScreen', { title, showId });
        } else if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('APIScreen', { title, showId });
        }
      } else {
        if (navigation && typeof navigation.getParent === 'function' && navigation.getParent()) {
          navigation.getParent().navigate('WebView', { url, title, showId });
        } else if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('WebView', { url, title, showId });
        }
      }
    } catch (err) {
      console.error('[ShowSelectorScreen] openFullView navigation error:', err);
      setErrorModal({ visible: true, title: 'Navigation Error', message: 'Unable to open full view' });
    }
  };

  const closePreview = () => {
    setPreviewModal({ visible: false, url: '', title: '' });
    setPreviewLoading(false);
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notConnectedContainer}>
          <Ionicons name="cloud-offline" size={64} color={FreeShowTheme.colors.text + '66'} />
          <Text style={styles.notConnectedTitle}>Not Connected</Text>
          <Text style={styles.notConnectedText}>
            Please connect to FreeShow first to access the show interfaces.
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => {
              try {
                if (navigation && typeof navigation.navigate === 'function') {
                  navigation.navigate('Connect');
                } else {
                  console.warn('[ShowSelectorScreen] No valid navigation available for Connect');
                }
              } catch (navigationError) {
                console.error('[ShowSelectorScreen] Connect navigation error:', navigationError);
              }
            }}
          >
            <Ionicons name="wifi" size={20} color="white" />
            <Text style={styles.buttonText}>Go to Connect</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={[
          styles.header,
          {
            // Add appropriate padding based on device type and navigation layout
            paddingTop: dimensions.isTablet 
              ? FreeShowTheme.spacing.md 
              : (settings?.navigationLayout === 'sidebar' ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.md),
          }
        ]}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitle}>
              <Text style={[
                styles.title,
                { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.xxxl : FreeShowTheme.fontSize.xxl }
              ]}>
                FreeShow Interfaces
              </Text>
              <View style={styles.connectionPill}>
                <View style={styles.statusDot} />
                <Text
                  style={[
                    styles.connectionText,
                    { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm }
                  ]}
                  numberOfLines={1}
                >
                  {connectionName || connectionHost}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Ionicons 
                name="log-out-outline" 
                size={dimensions.isTablet ? 26 : 22} 
                color={FreeShowTheme.colors.text + 'CC'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[
          styles.showList,
          {
            paddingHorizontal: dimensions.isTablet ? FreeShowTheme.spacing.xl : FreeShowTheme.spacing.lg,
            paddingTop: dimensions.isTablet ? FreeShowTheme.spacing.md : FreeShowTheme.spacing.sm,
          }
        ]}>
          <Text style={[
            styles.sectionTitle,
            { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.lg : FreeShowTheme.fontSize.md }
          ]}>
            Choose an interface:
          </Text>
          <View style={[isGrid ? styles.cardsGrid : styles.cardsColumn]}>
            {showOptions.map((show, index) => (
              <View
                key={show.id}
                style={[
                  styles.cardWrapper,
                  isGrid && {
                    width: '48%',
                    marginRight: index % 2 === 0 ? FreeShowTheme.spacing.md : 0,
                  },
                  {
                    marginBottom: dimensions.isTablet
                      ? FreeShowTheme.spacing.lg
                      : dimensions.isSmallScreen
                      ? FreeShowTheme.spacing.sm
                      : FreeShowTheme.spacing.md,
                  },
                ]}
              >
                <Pressable
                  onPress={() => handleShowSelect(show)}
                  onLongPress={() => openCompactPopup(show)}
                  delayLongPress={300}
                  android_ripple={{ color: show.color + '22' }}
                  accessibilityRole="button"
                  accessibilityLabel={`${show.title}. ${show.description}`}
                  style={({ pressed }) => ([
                    styles.pressableCard,
                    pressed && { transform: [{ scale: 0.98 }], opacity: 0.98 },
                  ])}
                >
                      <LinearGradient
                    colors={[
                      FreeShowTheme.colors.primaryDarker,
                      FreeShowTheme.colors.primaryDarker + 'F2',
                      show.color + '18',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.showCard,
                      styles.cardShadow,
                      {
                        borderLeftColor: show.color,
                        padding: dimensions.isTablet
                          ? FreeShowTheme.spacing.xxl
                          : dimensions.isSmallScreen
                          ? FreeShowTheme.spacing.md
                          : FreeShowTheme.spacing.lg,
                        minHeight: dimensions.isTablet ? 120 : dimensions.isSmallScreen ? 84 : 100,
                      },
                    ]}
                  >
                    <View style={[
                      styles.iconContainer,
                      {
                        backgroundColor: show.color + '20',
                        width: dimensions.isTablet ? 72 : 56,
                        height: dimensions.isTablet ? 72 : 56,
                      }
                    ]}>
                      <Ionicons
                        name={show.icon as any}
                        size={dimensions.isTablet ? 40 : 32}
                        color={show.color}
                      />
                    </View>

                    <View style={styles.showInfo}>
                      <Text style={[
                        styles.showTitle,
                        {
                          fontSize: dimensions.isTablet
                            ? FreeShowTheme.fontSize.xl
                            : (dimensions.isSmallScreen ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.lg),
                          marginBottom: dimensions.isTablet ? 8 : 6,
                        }
                      ]} numberOfLines={1}>
                        {show.title}
                      </Text>
                      <Text style={[
                        styles.showDescription,
                        {
                          fontSize: dimensions.isTablet
                            ? FreeShowTheme.fontSize.md
                            : (dimensions.isSmallScreen ? FreeShowTheme.fontSize.xs : FreeShowTheme.fontSize.sm),
                          lineHeight: dimensions.isTablet ? 20 : 16,
                          marginBottom: dimensions.isTablet ? 6 : 4,
                        }
                      ]} numberOfLines={1}>
                        {show.description}
                      </Text>
                    </View>
                    </LinearGradient>
                  </Pressable>
                </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Compact Popup Modal (long-press) */}
      <Modal
        visible={compactPopup.visible}
        animationType="slide"
        onRequestClose={closeCompactPopup}
        transparent={true}
      >
        <View style={styles.compactBackdrop}>
          <TouchableOpacity style={styles.compactBackdropTouchable} activeOpacity={1} onPress={closeCompactPopup} />
          <View style={styles.compactPopupContainer}>
            <View style={styles.compactHandle} />
            
            {/* Header with icon and title */}
            <View style={styles.compactHeader}>
              <View style={[styles.compactIconContainer, { backgroundColor: (compactPopup.show?.color || '#333') + '15' }]}>
                <Ionicons
                  name={(compactPopup.show?.icon as any) || 'apps'}
                  size={28}
                  color={compactPopup.show?.color || '#333'}
                />
              </View>
              <View style={styles.compactTitleContainer}>
                <Text style={styles.compactTitle}>{compactPopup.show?.title}</Text>
                <Text style={styles.compactSubtitle}>{compactPopup.show?.description}</Text>
              </View>
            </View>

            {/* IP Address with status dot */}
            <View style={styles.compactIpContainer}>
              <View style={styles.compactIpRow}>
                <View style={styles.compactStatusDot} />
                <Text style={styles.compactIpText}>
                  {connectionHost}:{compactPopup.show?.port}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.compactClipboardButton}
                onPress={() => compactPopup.show && copyToClipboard(compactPopup.show)}
                accessibilityRole="button"
                accessibilityLabel="Copy URL to clipboard"
              >
                <Ionicons name="copy-outline" size={18} color={FreeShowTheme.colors.text + 'BB'} />
              </TouchableOpacity>
            </View>

            {/* Action buttons */}
            <View style={styles.compactActions}>
              <TouchableOpacity 
                style={[styles.compactActionButton, styles.compactOpenButton]}
                onPress={() => {
                  if (compactPopup.show) {
                    closeCompactPopup();
                    handleShowSelect(compactPopup.show);
                  }
                }}
                accessibilityRole="button"
              >
                <Ionicons name="play-circle" size={20} color="white" style={styles.compactButtonIcon} />
                <Text style={styles.compactActionButtonText}>Open</Text>
              </TouchableOpacity>
              {compactPopup.show?.id !== 'api' && (
                <TouchableOpacity 
                  style={[styles.compactActionButton, styles.compactBrowserButton]}
                  onPress={() => compactPopup.show && openInBrowser(compactPopup.show)}
                  accessibilityRole="button"
                >
                  <Ionicons name="globe-outline" size={20} color={FreeShowTheme.colors.text + 'CC'} style={styles.compactButtonIcon} />
                  <Text style={[styles.compactActionButtonText, styles.compactBrowserButtonText]}>Open in Browser</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Disconnect Confirmation Modal */}
      {/* Preview Modal (long-press) */}
      <Modal
        visible={previewModal.visible}
        animationType="slide"
        onRequestClose={closePreview}
        transparent={true}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={closePreview} />
          <View style={styles.previewCard}>
            <View style={styles.previewHandle} />
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>{previewModal.title}</Text>
              <TouchableOpacity onPress={closePreview} style={styles.previewClose} accessibilityRole="button">
                <Ionicons name="close" size={22} color={FreeShowTheme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.previewTopRow}>
              <Text style={styles.previewUrl} numberOfLines={1}>{previewModal.url}</Text>
              <TouchableOpacity style={styles.openFullButton} onPress={openFullView} accessibilityRole="button">
                <Text style={styles.openFullButtonText}>Open Full View</Text>
              </TouchableOpacity>
            </View>
            {previewModal.description ? (
              <Text style={styles.previewDescription} numberOfLines={2}>{previewModal.description}</Text>
            ) : null}
            <View style={styles.previewWebview}>
              {previewLoading && (
                <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -18, marginTop: -18 }} />
              )}
              <WebView
                source={{ uri: previewModal.url }}
                onLoadEnd={() => setPreviewLoading(false)}
                startInLoadingState
              />
            </View>
          </View>
        </View>
      </Modal>
      <ConfirmationModal
        visible={showDisconnectConfirm}
        title="Disconnect"
        message="Are you sure you want to disconnect from FreeShow?"
        confirmText="Disconnect"
        cancelText="Cancel"
        confirmStyle="destructive"
        icon="log-out-outline"
        onConfirm={confirmDisconnect}
        onCancel={cancelDisconnect}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal({visible: false, title: '', message: ''})}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
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
    marginBottom: FreeShowTheme.spacing.xs,
    // fontSize now handled dynamically
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
  sectionTitle: {
    fontWeight: '600',
    color: FreeShowTheme.colors.text + 'CC',
    marginBottom: FreeShowTheme.spacing.md,
    paddingHorizontal: 2, // Align with card content
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize now handled dynamically
  },
  showList: {
    flex: 1,
    // paddingHorizontal and paddingTop now handled dynamically
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardsColumn: {
    flexDirection: 'column',
  },
  cardWrapper: {
    width: '100%',
  },
  showCardContainer: {
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderLeftWidth: 4,
    gap: FreeShowTheme.spacing.md,
    overflow: 'hidden', // Ensure gradient fills the entire card
  },
  pressableCard: {
    borderRadius: FreeShowTheme.borderRadius.lg,
    overflow: 'hidden',
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconContainer: {
    borderRadius: FreeShowTheme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showInfo: {
    flex: 1,
  },
  showTitle: {
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize, marginBottom now handled dynamically
  },
  showDescription: {
    color: FreeShowTheme.colors.text + 'BB',
    fontFamily: FreeShowTheme.fonts.system,
    // fontSize, lineHeight, marginBottom now handled dynamically
  },
  showPort: {
    color: FreeShowTheme.colors.text + 'AA',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    letterSpacing: 0.5,
    // fontSize now handled dynamically
  },
  // port-related styles removed (no visible port numbers)
  chevron: {
    opacity: 0.6,
  },
  notConnectedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: FreeShowTheme.spacing.xl,
    paddingTop: FreeShowTheme.spacing.xxl, // Reduce top padding to shift content up slightly
  },
  notConnectedTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.md, // Increase spacing
    fontFamily: FreeShowTheme.fonts.system,
    textAlign: 'center',
  },
  notConnectedText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + 'BB',
    textAlign: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
    fontFamily: FreeShowTheme.fonts.system,
    lineHeight: 22, // Add line height for better readability
    paddingHorizontal: FreeShowTheme.spacing.md, // Add horizontal padding
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.xl, // Increase horizontal padding
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '700', // Increase font weight
    fontFamily: FreeShowTheme.fonts.system,
  },
  // Preview modal styles
  previewContainer: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
    paddingBottom: FreeShowTheme.spacing.sm,
  },
  previewTitle: {
    color: FreeShowTheme.colors.text,
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewClose: {
    padding: FreeShowTheme.spacing.sm,
  },
  previewUrl: {
    color: FreeShowTheme.colors.text + 'AA',
    flex: 1,
    marginRight: FreeShowTheme.spacing.md,
    paddingBottom: FreeShowTheme.spacing.xs,
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewDescription: {
    color: FreeShowTheme.colors.text + 'BB',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  openFullButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.xs,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
  },
  openFullButtonText: {
    color: 'white',
    fontWeight: '700',
    fontFamily: FreeShowTheme.fonts.system,
  },
  previewWebview: {
    flex: 1,
    margin: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
  },
  previewCard: {
    height: '50%',
    backgroundColor: FreeShowTheme.colors.primary,
    borderTopLeftRadius: FreeShowTheme.borderRadius.xl || 24,
    borderTopRightRadius: FreeShowTheme.borderRadius.xl || 24,
    overflow: 'hidden',
  },
  previewHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF33',
    alignSelf: 'center',
    marginVertical: FreeShowTheme.spacing.sm,
  },
  // Compact popup styles
  compactBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  compactBackdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  compactPopupContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderTopLeftRadius: FreeShowTheme.borderRadius.xl || 24,
    borderTopRightRadius: FreeShowTheme.borderRadius.xl || 24,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  compactHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: FreeShowTheme.colors.text + '30',
    alignSelf: 'center',
    marginTop: FreeShowTheme.spacing.sm,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  compactIconContainer: {
    width: 52,
    height: 52,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  compactTitleContainer: {
    flex: 1,
  },
  compactTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'AA',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
  },
  compactIpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.text + '08',
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '10',
  },
  compactIpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2ECC40',
    marginRight: FreeShowTheme.spacing.sm,
  },
  compactIpText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text + 'CC',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '600',
    flex: 1,
  },
  compactClipboardButton: {
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.sm,
    backgroundColor: FreeShowTheme.colors.text + '08',
  },
  compactActions: {
    flexDirection: 'column',
    gap: FreeShowTheme.spacing.sm,
  },
  compactActionButton: {
    width: '100%',
    paddingVertical: FreeShowTheme.spacing.lg,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  compactButtonIcon: {
    marginRight: FreeShowTheme.spacing.sm,
  },
  compactOpenButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  compactBrowserButton: {
    backgroundColor: FreeShowTheme.colors.text + '08',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.text + '20',
  },
  compactActionButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
    color: 'white',
  },
  compactBrowserButtonText: {
    color: FreeShowTheme.colors.text + 'DD',
  },
});

export default ShowSelectorScreen;
