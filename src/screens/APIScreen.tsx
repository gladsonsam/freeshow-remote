import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { io, Socket } from 'socket.io-client';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { ErrorLogger } from '../services/ErrorLogger';
import { useConnection, useSettings } from '../contexts';
import { getNavigationLayoutInfo } from '../utils/navigationUtils';
import ShowSwitcher from '../components/ShowSwitcher';
import { ShowOption } from '../types';
import ErrorModal from '../components/ErrorModal';
import { configService } from '../config/AppConfig';

interface APIScreenProps {
  route: {
    params?: {
      title?: string;
      showId?: string;
    };
  };
  navigation: any;
}

interface APIFeature {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route?: string;
  onPress?: () => void;
}

const APIScreen: React.FC<APIScreenProps> = ({ route, navigation }) => {
  const { state } = useConnection();
  const { settings } = useSettings();
  const { connectionHost, isConnected, currentShowPorts } = state;
  const { title = 'API Hub' } = route.params || {};
  const { shouldSkipSafeArea, isFloatingNav } = getNavigationLayoutInfo(settings?.navigationLayout);
  const SafeAreaWrapper = shouldSkipSafeArea ? View : SafeAreaView;

  // State management
  const [socketConnected, setSocketConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const hasShownErrorRef = useRef<boolean>(false);
  const connectionErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onRetry?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onRetry: undefined,
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Check if API is available
  const isApiAvailable = currentShowPorts?.api && currentShowPorts.api > 0;

  // Animate on mount
  useEffect(() => {
    if (isConnected && isApiAvailable) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isConnected, isApiAvailable]);

  // WebSocket connection management
  useEffect(() => {
    if (isConnected && connectionHost && isApiAvailable) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isConnected, connectionHost, isApiAvailable]);

  const connectWebSocket = async () => {
    if (!connectionHost || !isApiAvailable) return;

    try {
      hasShownErrorRef.current = false;
      ErrorLogger.info('Connecting to FreeShow WebSocket API', 'APIScreen');

      if (connectionErrorTimeoutRef.current) {
        clearTimeout(connectionErrorTimeoutRef.current);
      }

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socketUrl = `http://${connectionHost}:${currentShowPorts.api}`;
      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
        timeout: configService.getNetworkConfig().connectionTimeout,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current.on('connect', () => {
        ErrorLogger.info('FreeShow API connected successfully', 'APIScreen');
        setSocketConnected(true);

        if (connectionErrorTimeoutRef.current) {
          clearTimeout(connectionErrorTimeoutRef.current);
        }
        hasShownErrorRef.current = false;
      });

      socketRef.current.on('disconnect', (reason) => {
        ErrorLogger.info('FreeShow API disconnected', 'APIScreen', { reason });
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        ErrorLogger.error('WebSocket connection error', 'APIScreen', error);

        if (!hasShownErrorRef.current) {
          connectionErrorTimeoutRef.current = setTimeout(() => {
            if (!socketConnected && !hasShownErrorRef.current) {
              hasShownErrorRef.current = true;
              setErrorModal({
                visible: true,
                title: 'Connection Failed',
                message: `Cannot connect to FreeShow API:\n\n${error.message}`,
                onRetry: () => {
                  hasShownErrorRef.current = false;
                  setErrorModal({ visible: false, title: '', message: '' });
                  connectWebSocket();
                },
              });
            }
          }, 3000);
        }
      });
    } catch (error) {
      ErrorLogger.error('Failed to setup WebSocket connection', 'APIScreen', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const disconnectWebSocket = () => {
    if (connectionErrorTimeoutRef.current) {
      clearTimeout(connectionErrorTimeoutRef.current);
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketConnected(false);
    hasShownErrorRef.current = false;
  };

  const sendApiCommand = async (action: string, data: any = {}): Promise<void> => {
    if (!connectionHost || !socketRef.current || !socketRef.current.connected) {
      setErrorModal({
        visible: true,
        title: 'Error',
        message: 'Not connected to FreeShow API',
      });
      return;
    }

    try {
      setIsConnecting(true);
      const command = { action, ...data };
      ErrorLogger.debug('Sending API command', 'APIScreen', { command });
      socketRef.current.emit('data', JSON.stringify(command));
    } catch (error) {
      ErrorLogger.error('API command failed', 'APIScreen', error instanceof Error ? error : new Error(String(error)));
      setErrorModal({
        visible: true,
        title: 'Command Failed',
        message: `Failed to execute "${action}"`,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Define API features/sub-pages
  const apiFeatures: APIFeature[] = [
    {
      id: 'scripture',
      title: 'Scripture',
      description: 'Search and display Bible verses',
      icon: 'book',
      color: '#9b59b6',
      route: 'Scripture',
    },
    {
      id: 'quick-controls',
      title: 'Quick Controls',
      description: 'Slide & project navigation',
      icon: 'game-controller',
      color: '#3498db',
      onPress: () => {
        // Navigate to quick controls (inline on this screen for now)
      },
    },
    {
      id: 'shows',
      title: 'Shows',
      description: 'Browse and select shows',
      icon: 'albums',
      color: '#e74c3c',
      route: 'Shows',
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Custom API commands & testing',
      icon: 'code-slash',
      color: '#95a5a6',
      onPress: () => {
        // Navigate to advanced controls
      },
    },
  ];

  const handleShowSelect = (show: ShowOption) => {
    navigation.navigate('WebView', {
      title: show.title,
      url: `http://${connectionHost}:${show.port}`,
      showId: show.id,
    });
  };

  const handleFeaturePress = (feature: APIFeature) => {
    if (feature.route) {
      navigation.navigate(feature.route);
    } else if (feature.onPress) {
      feature.onPress();
    }
  };

  const handleQuickAction = (action: string) => {
    sendApiCommand(action);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <LinearGradient colors={FreeShowTheme.gradients.appBackground} style={styles.container}>
        <SafeAreaWrapper style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>API Hub</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.centerContainer}>
            <Ionicons name="wifi-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
            <Text style={styles.errorText}>Not connected to FreeShow</Text>
            <TouchableOpacity style={styles.connectButton} onPress={() => navigation.navigate('Connect')}>
              <Text style={styles.connectButtonText}>Go to Connect</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaWrapper>
      </LinearGradient>
    );
  }

  // API not available state
  if (!isApiAvailable) {
    return (
      <LinearGradient colors={FreeShowTheme.gradients.appBackground} style={styles.container}>
        <SafeAreaWrapper style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>

            {connectionHost ? (
              <ShowSwitcher
                currentTitle={title}
                currentShowId="api"
                connectionHost={connectionHost}
                showPorts={currentShowPorts || undefined}
                onShowSelect={handleShowSelect}
              />
            ) : (
              <Text style={styles.headerTitle}>API Hub</Text>
            )}

            <View style={styles.placeholder} />
          </View>

          <View style={styles.centerContainer}>
            <Ionicons name="settings-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
            <Text style={styles.errorText}>API Interface Not Available</Text>
            <Text style={styles.errorSubtext}>
              The API interface is disabled. Enable the API port in FreeShow and reconnect.
            </Text>
            <TouchableOpacity style={styles.connectButton} onPress={() => navigation.navigate('Connect')}>
              <Text style={styles.connectButtonText}>Reconnect with API</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaWrapper>
      </LinearGradient>
    );
  }

  // Main content
  return (
    <LinearGradient colors={FreeShowTheme.gradients.appBackground} style={styles.container}>
      <SafeAreaWrapper style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>

          {connectionHost ? (
            <ShowSwitcher
              currentTitle={title}
              currentShowId="api"
              connectionHost={connectionHost}
              showPorts={currentShowPorts || undefined}
              onShowSelect={handleShowSelect}
            />
          ) : (
            <Text style={styles.headerTitle}>API Hub</Text>
          )}

          <View style={styles.connectionStatus}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: socketConnected ? FreeShowTheme.colors.connected : FreeShowTheme.colors.disconnected },
              ]}
            />
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={isFloatingNav ? styles.scrollContentFloating : styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <LinearGradient
                  colors={['rgba(240, 0, 140, 0.2)', 'rgba(240, 0, 140, 0.05)']}
                  style={styles.heroIconGradient}
                >
                  <Ionicons name="rocket" size={32} color={FreeShowTheme.colors.secondary} />
                </LinearGradient>
              </View>
              <Text style={styles.heroTitle}>FreeShow API</Text>
              <Text style={styles.heroDescription}>
                Access powerful features to control and interact with FreeShow
              </Text>
            </View>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={[styles.quickActionsSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: '#f39c12' }]}
                onPress={() => handleQuickAction('previous_slide')}
                disabled={!socketConnected}
              >
                <Ionicons name="play-back" size={24} color="white" />
                <Text style={styles.quickActionText}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: '#27ae60' }]}
                onPress={() => handleQuickAction('next_slide')}
                disabled={!socketConnected}
              >
                <Ionicons name="play-forward" size={24} color="white" />
                <Text style={styles.quickActionText}>Next</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionButton, { backgroundColor: '#e74c3c' }]}
                onPress={() => handleQuickAction('clear_all')}
                disabled={!socketConnected}
              >
                <Ionicons name="close-circle" size={24} color="white" />
                <Text style={styles.quickActionText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Features Grid */}
          <Animated.View style={[styles.featuresSection, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>API Features</Text>
            <View style={styles.featuresGrid}>
              {apiFeatures.map((feature, index) => (
                <Animated.View
                  key={feature.id}
                  style={[
                    styles.featureCardWrapper,
                    {
                      opacity: fadeAnim,
                      transform: [
                        {
                          translateY: slideAnim.interpolate({
                            inputRange: [0, 30],
                            outputRange: [0, 30 + index * 10],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.featureCard}
                    onPress={() => handleFeaturePress(feature)}
                    activeOpacity={0.8}
                    disabled={!socketConnected}
                  >
                    <LinearGradient
                      colors={[feature.color + '15', feature.color + '05']}
                      style={styles.featureCardGradient}
                    >
                      <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                        <Ionicons name={feature.icon} size={28} color={feature.color} />
                      </View>
                      <Text style={styles.featureTitle}>{feature.title}</Text>
                      <Text style={styles.featureDescription}>{feature.description}</Text>
                      <View style={styles.featureArrow}>
                        <Ionicons name="arrow-forward" size={20} color={FreeShowTheme.colors.textSecondary} />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Error Modal */}
        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          message={errorModal.message}
          buttonText={errorModal.onRetry ? 'Retry' : 'OK'}
          onClose={() => {
            if (errorModal.onRetry) {
              errorModal.onRetry();
            } else {
              setErrorModal({ visible: false, title: '', message: '' });
            }
          }}
        />
      </SafeAreaWrapper>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: FreeShowTheme.borderRadius.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  headerTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  connectionStatus: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: FreeShowTheme.spacing.xxxl * 2,
  },
  scrollContentFloating: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingBottom: 140,
  },

  // Hero Section
  heroSection: {
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.xl,
  },
  heroContent: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.xl,
    padding: FreeShowTheme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: FreeShowTheme.spacing.md,
  },
  heroIconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary + '30',
    borderRadius: 32,
  },
  heroTitle: {
    fontSize: FreeShowTheme.fontSize.xxl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  heroDescription: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.md,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: FreeShowTheme.spacing.xs,
  },
  quickActionText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },

  // Features Grid
  featuresSection: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  featuresGrid: {
    gap: FreeShowTheme.spacing.md,
  },
  featureCardWrapper: {
    width: '100%',
  },
  featureCard: {
    borderRadius: FreeShowTheme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  featureCardGradient: {
    padding: FreeShowTheme.spacing.lg,
    minHeight: 120,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: FreeShowTheme.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.md,
  },
  featureTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.xs,
  },
  featureDescription: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 20,
  },
  featureArrow: {
    position: 'absolute',
    top: FreeShowTheme.spacing.lg,
    right: FreeShowTheme.spacing.lg,
  },

  // Error/Empty States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  errorText: {
    fontSize: FreeShowTheme.fontSize.lg,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.lg,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginTop: FreeShowTheme.spacing.xl,
  },
  connectButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
});

export default APIScreen;
