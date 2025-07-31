import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';
import { ShowOption } from '../types';

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
  const { isConnected, connectionHost, connectionName, currentShowPorts } = state;
  const { disconnect } = actions;
  
  const [dimensions, setDimensions] = useState(getResponsiveDimensions());

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
        description: 'Stage display for performers',
        port: showPorts.stage,
        icon: 'desktop',
        color: '#2ECC40',
      },
      {
        id: 'control',
        title: 'ControlShow',
        description: 'Full control interface for operators',
        port: showPorts.control,
        icon: 'settings',
        color: '#0074D9',
      },
      {
        id: 'output',
        title: 'OutputShow',
        description: 'Output display for screens and projectors',
        port: showPorts.output,
        icon: 'tv',
        color: '#FF851B',
      },
      {
        id: 'api',
        title: 'API Controls',
        description: 'Custom native API controls',
        port: showPorts.api,
        icon: 'code-slash',
        color: '#B10DC9',
      },
    ];
  };

  const showOptions = getShowOptions();

  const handleShowSelect = (show: ShowOption) => {
    if (!isConnected || !connectionHost) {
      Alert.alert('Error', 'Not connected to FreeShow');
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
          Alert.alert('Navigation Error', 'Unable to navigate to API interface');
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
          Alert.alert('Navigation Error', 'Unable to navigate to interface');
        }
      }
    } catch (navigationError) {
      console.error('[ShowSelectorScreen] Navigation error:', navigationError);
      Alert.alert('Navigation Error', 'Unable to navigate to the selected interface');
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect',
      'Are you sure you want to disconnect from FreeShow?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            disconnect();
            try {
              if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate('Connect');
              } else {
                console.warn('[ShowSelectorScreen] No valid navigation available for Connect');
              }
            } catch (navigationError) {
              console.error('[ShowSelectorScreen] Disconnect navigation error:', navigationError);
            }
          }
        },
      ]
    );
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
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitle}>
              <Text style={[
                styles.title,
                { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.xxxl : FreeShowTheme.fontSize.xxl }
              ]}>
                FreeShow Interfaces
              </Text>
              <Text style={[
                styles.subtitle,
                { fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.sm }
              ]}>
                Connected to {connectionName || connectionHost}
              </Text>
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
          {showOptions.map((show) => (
            <TouchableOpacity
              key={show.id}
              style={[
                styles.showCard, 
                { 
                  borderLeftColor: show.color,
                  padding: dimensions.isTablet ? FreeShowTheme.spacing.lg : 
                           (dimensions.isSmallScreen ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.md),
                  marginBottom: dimensions.isTablet ? FreeShowTheme.spacing.lg : 
                               (dimensions.isSmallScreen ? FreeShowTheme.spacing.sm : FreeShowTheme.spacing.md),
                  minHeight: dimensions.isTablet ? 88 : (dimensions.isSmallScreen ? 64 : 72),
                }
              ]}
              onPress={() => handleShowSelect(show)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer, 
                { 
                  backgroundColor: show.color + '20',
                  width: dimensions.isTablet ? 64 : 48,
                  height: dimensions.isTablet ? 64 : 48,
                }
              ]}>
                <Ionicons 
                  name={show.icon as any} 
                  size={dimensions.isTablet ? 36 : 28} 
                  color={show.color} 
                />
              </View>
              
              <View style={styles.showInfo}>
                <Text style={[
                  styles.showTitle,
                  {
                    fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.xl : 
                             (dimensions.isSmallScreen ? FreeShowTheme.fontSize.md : FreeShowTheme.fontSize.lg),
                    marginBottom: dimensions.isTablet ? 10 : 8,
                  }
                ]}>
                  {show.title}
                </Text>
                <Text style={[
                  styles.showDescription,
                  {
                    fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.md : 
                             (dimensions.isSmallScreen ? FreeShowTheme.fontSize.xs : FreeShowTheme.fontSize.sm),
                    lineHeight: dimensions.isTablet ? 20 : 16,
                    marginBottom: dimensions.isTablet ? 4 : 2,
                  }
                ]} numberOfLines={1}>
                  {show.description}
                </Text>
                <Text style={[
                  styles.showPort,
                  {
                    fontSize: dimensions.isTablet ? FreeShowTheme.fontSize.sm : FreeShowTheme.fontSize.xs,
                  }
                ]}>
                  Port: {show.port}
                </Text>
              </View>
              
              <View style={styles.chevron}>
                <Ionicons 
                  name="chevron-forward" 
                  size={dimensions.isTablet ? 24 : 20} 
                  color={FreeShowTheme.colors.text + '66'} 
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
  subtitle: {
    color: FreeShowTheme.colors.text + 'AA',
    fontFamily: FreeShowTheme.fonts.system,
    fontWeight: '500',
    // fontSize now handled dynamically
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
  showCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    borderLeftWidth: 4,
    gap: FreeShowTheme.spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
