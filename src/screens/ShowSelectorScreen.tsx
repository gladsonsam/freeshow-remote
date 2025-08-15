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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection, useSettings } from '../contexts';
import { ShowOption } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import ErrorModal from '../components/ErrorModal';

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

      {/* Disconnect Confirmation Modal */}
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
});

export default ShowSelectorScreen;
