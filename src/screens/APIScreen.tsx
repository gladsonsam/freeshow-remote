import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';

interface APIScreenProps {
  route: {
    params?: {
      title?: string;
      showId?: string;
    };
  };
  navigation: any;
}

interface SlideData {
  id: string;
  name: string;
  group?: string;
}

interface ShowData {
  id: string;
  name: string;
}

const APIScreen: React.FC<APIScreenProps> = ({ route, navigation }) => {
  const { state } = useConnection();
  const { connectionHost, isConnected } = state;
  const { title = 'API Controls' } = route.params || {};

  const [slides, setSlides] = useState<SlideData[]>([]);
  const [shows, setShows] = useState<ShowData[]>([]);
  const [currentSlide, setCurrentSlide] = useState<string | null>(null);
  const [currentShow, setCurrentShow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (isConnected && connectionHost) {
      connectWebSocket();
    } else {
      setIsLoading(false);
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isConnected, connectionHost]);

  const connectWebSocket = async () => {
    if (!connectionHost) return;

    try {
      setIsLoading(true);
      console.log('Connecting to FreeShow WebSocket API on port 5505...');
      
      // Disconnect existing socket if any
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      // Create new socket connection
      const socketUrl = `http://${connectionHost}:5505`;
      console.log('Socket URL:', socketUrl);
      
      socketRef.current = io(socketUrl, { 
        transports: ["websocket"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      // Set up socket event listeners
      socketRef.current.on('connect', () => {
        console.log('WebSocket connected to FreeShow API');
        setSocketConnected(true);
        fetchShows();
      });

      socketRef.current.on('disconnect', () => {
        console.log('WebSocket disconnected from FreeShow API');
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setSocketConnected(false);
        setIsLoading(false);
        Alert.alert(
          'FreeShow API Connection Failed',
          `Cannot connect to FreeShow WebSocket API:\n\n${error.message}\n\nPlease check:\n• FreeShow is running\n• WebSocket/REST API is enabled in FreeShow → Connections\n• Port 5505 is accessible\n• Restart FreeShow if needed`,
          [
            { text: 'Retry', onPress: connectWebSocket },
            { text: 'OK' }
          ]
        );
      });

      // Listen for API responses
      socketRef.current.on('data', (response) => {
        console.log('Received WebSocket response:', response);
        handleSocketResponse(response);
      });

    } catch (error) {
      console.error('Failed to setup WebSocket connection:', error);
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'WebSocket Setup Failed',
        `${errorMessage}\n\nMake sure FreeShow WebSocket API is enabled.`,
        [
          { text: 'Retry', onPress: connectWebSocket },
          { text: 'OK' }
        ]
      );
    }
  };

  const disconnectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketConnected(false);
  };

  const handleSocketResponse = (response: any) => {
    try {
      const data = typeof response === 'string' ? JSON.parse(response) : response;
      console.log('Parsed socket response:', data);
      
      // Handle different types of responses here if needed
      // For now, we'll handle show data in fetchShows
    } catch (error) {
      console.error('Error parsing socket response:', error);
    }
  };

  const fetchShows = async () => {
    if (!connectionHost || !socketRef.current || !socketConnected) {
      console.log('Cannot fetch shows: socket not connected');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching shows via WebSocket...');
      
      // Send get_shows command via WebSocket
      const command = { action: 'get_shows' };
      console.log('Sending command:', command);
      socketRef.current.emit('data', JSON.stringify(command));
      
      // Listen for the response (we'll handle this in a separate listener)
      const responsePromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for shows data'));
        }, 10000);

        const handleResponse = (response: any) => {
          clearTimeout(timeout);
          try {
            const data = typeof response === 'string' ? JSON.parse(response) : response;
            resolve(data);
          } catch (error) {
            reject(error);
          }
        };

        // Listen for the next data event
        socketRef.current?.once('data', handleResponse);
      });

      const showsData = await responsePromise;
      console.log('Received shows data:', showsData);
      
      const showsList: ShowData[] = [];
      const slidesList: SlideData[] = [];
      
      if (showsData && typeof showsData === 'object') {
        // Iterate through each show
        for (const [showId, showData] of Object.entries(showsData)) {
          if (showData && typeof showData === 'object') {
            const showName = (showData as any).name || showId;
            showsList.push({
              id: showId,
              name: showName,
            });

            // Extract slides from this show
            if ((showData as any).slides) {
              const slides = (showData as any).slides;
              
              // Iterate through slides in this show
              for (const [slideIndex, slideData] of Object.entries(slides)) {
                if (slideData && typeof slideData === 'object') {
                  slidesList.push({
                    id: `${showId}_${slideIndex}`,
                    name: (slideData as any).group || (slideData as any).text || `Slide ${parseInt(slideIndex) + 1}`,
                    group: showName,
                  });
                }
              }
            }
          }
        }
      }
      
      setShows(showsList);
      setSlides(slidesList);
      console.log(`Loaded ${showsList.length} shows and ${slidesList.length} slides`);
      
    } catch (error) {
      console.error('Failed to fetch shows:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'API Connection Error', 
        `Failed to get shows from FreeShow API:\n\n${errorMessage}\n\nMake sure:\n• FreeShow is running\n• WebSocket/REST API is enabled in FreeShow > Connections settings\n• WebSocket connection is stable`,
        [
          { text: 'Retry', onPress: fetchShows },
          { text: 'OK' }
        ]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendAPICommand = async (action: string, data: any = {}) => {
    if (!connectionHost || !socketRef.current || !socketConnected) {
      Alert.alert('Error', 'WebSocket not connected to FreeShow');
      return;
    }

    try {
      setIsConnecting(true);
      console.log('Sending WebSocket command:', action, 'with data:', data);
      
      // Send command via WebSocket
      const command = { action, ...data };
      socketRef.current.emit('data', JSON.stringify(command));
      
      // For most commands, we don't need to wait for a response
      // The command is fire-and-forget
      console.log('Command sent successfully');
      
      return { success: true };
    } catch (error) {
      console.error('WebSocket command failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Command Failed', 
        `Failed to execute "${action}":\n\n${errorMessage}\n\nCheck that FreeShow WebSocket API is connected.`
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSlideSelect = async (slideId: string) => {
    setCurrentSlide(slideId);
    // Parse the slideId to get showId and slide index
    const [showId, slideIndex] = slideId.split('_');
    await sendAPICommand('index_select_slide', { 
      showId: showId,
      index: parseInt(slideIndex) 
    });
  };

  const handleNextSlide = async () => {
    await sendAPICommand('next_slide', {});
  };

  const handlePreviousSlide = async () => {
    await sendAPICommand('previous_slide', {});
  };

  const handleClearOutput = async () => {
    await sendAPICommand('clear_all', {});
  };

  const handleClearBackground = async () => {
    await sendAPICommand('clear_background', {});
  };

  const handleClearSlide = async () => {
    await sendAPICommand('clear_slide', {});
  };

  const handleClearOverlays = async () => {
    await sendAPICommand('clear_overlays', {});
  };

  const handleShowSelect = async (showId: string) => {
    setCurrentShow(showId);
    await sendAPICommand('name_select_show', { value: shows.find(s => s.id === showId)?.name || showId });
  };

  const handleStartShow = async (showId: string) => {
    await sendAPICommand('start_show', { id: showId });
  };

  const handleNextProject = async () => {
    await sendAPICommand('next_project_item', {});
  };

  const handlePreviousProject = async () => {
    await sendAPICommand('previous_project_item', {});
  };

  const handleRandomSlide = async () => {
    await sendAPICommand('random_slide', {});
  };

  const handleRefresh = () => {
    if (socketConnected) {
      fetchShows();
    } else {
      connectWebSocket();
    }
  };

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="wifi-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
          <Text style={styles.errorText}>Not connected to FreeShow</Text>
          <TouchableOpacity 
            style={styles.reconnectButton}
            onPress={() => navigation.navigate('Connect')}
          >
            <Text style={styles.reconnectButtonText}>Go to Connect</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
          <Text style={styles.loadingText}>Loading slides...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {/* Debug Info */}
          <View style={styles.debugSection}>
            <Text style={styles.sectionTitle}>Connection Info</Text>
            <View style={styles.debugCard}>
              <Text style={styles.debugText}>Host: {connectionHost}</Text>
              <Text style={styles.debugText}>API Port: 5505 (WebSocket)</Text>
              <Text style={styles.debugText}>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
              <Text style={styles.debugText}>WebSocket: {socketConnected ? 'Connected' : 'Disconnected'}</Text>
              <Text style={styles.debugText}>API URL: ws://{connectionHost}:5505</Text>
            </View>
          </View>

          {/* Show Selection */}
          {shows.length > 0 && (
            <View style={styles.showSection}>
              <Text style={styles.sectionTitle}>Shows ({shows.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.showScrollView}>
                {shows.map((show) => (
                  <TouchableOpacity
                    key={show.id}
                    style={[
                      styles.showCard,
                      currentShow === show.id && styles.showCardActive
                    ]}
                    onPress={() => handleShowSelect(show.id)}
                    disabled={isConnecting}
                  >
                    <Text style={styles.showName}>{show.name}</Text>
                    <TouchableOpacity
                      style={styles.startShowButton}
                      onPress={() => handleStartShow(show.id)}
                      disabled={isConnecting}
                    >
                      <Ionicons name="play" size={16} color="white" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Project Navigation */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Project Navigation</Text>
            <View style={styles.controlRow}>
              <TouchableOpacity 
                style={[styles.controlButton, styles.projectButton]}
                onPress={handlePreviousProject}
                disabled={isConnecting}
              >
                <Ionicons name="chevron-back" size={24} color="white" />
                <Text style={styles.controlButtonText}>Prev Project</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.controlButton, styles.projectButton]}
                onPress={handleNextProject}
                disabled={isConnecting}
              >
                <Ionicons name="chevron-forward" size={24} color="white" />
                <Text style={styles.controlButtonText}>Next Project</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Slide Control Buttons */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Slide Controls</Text>
            <View style={styles.controlRow}>
              <TouchableOpacity 
                style={[styles.controlButton, styles.previousButton]}
                onPress={handlePreviousSlide}
                disabled={isConnecting}
              >
                <Ionicons name="play-back" size={24} color="white" />
                <Text style={styles.controlButtonText}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.controlButton, styles.nextButton]}
                onPress={handleNextSlide}
                disabled={isConnecting}
              >
                <Ionicons name="play-forward" size={24} color="white" />
                <Text style={styles.controlButtonText}>Next</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.controlButton, styles.randomButton]}
                onPress={handleRandomSlide}
                disabled={isConnecting}
              >
                <Ionicons name="shuffle" size={24} color="white" />
                <Text style={styles.controlButtonText}>Random</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clear Options */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Clear Options</Text>
            <View style={styles.controlGrid}>
              <TouchableOpacity 
                style={[styles.controlButton, styles.clearButton]}
                onPress={handleClearOutput}
                disabled={isConnecting}
              >
                <Ionicons name="close-circle" size={24} color="white" />
                <Text style={styles.controlButtonText}>Clear All</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.controlButton, styles.clearButton]}
                onPress={handleClearSlide}
                disabled={isConnecting}
              >
                <Ionicons name="document" size={24} color="white" />
                <Text style={styles.controlButtonText}>Clear Slide</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.controlButton, styles.clearButton]}
                onPress={handleClearBackground}
                disabled={isConnecting}
              >
                <Ionicons name="image" size={24} color="white" />
                <Text style={styles.controlButtonText}>Clear BG</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.controlButton, styles.clearButton]}
                onPress={handleClearOverlays}
                disabled={isConnecting}
              >
                <Ionicons name="layers" size={24} color="white" />
                <Text style={styles.controlButtonText}>Clear Overlays</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Slides List */}
          <View style={styles.slidesSection}>
            <Text style={styles.sectionTitle}>Slides ({slides.length})</Text>
            {slides.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-outline" size={48} color={FreeShowTheme.colors.textSecondary} />
                <Text style={styles.emptyStateText}>No slides available</Text>
                <Text style={styles.emptyStateSubtext}>Make sure FreeShow has a presentation loaded</Text>
              </View>
            ) : (
              slides.map((slide) => (
                <TouchableOpacity
                  key={slide.id}
                  style={[
                    styles.slideCard,
                    currentSlide === slide.id && styles.slideCardActive
                  ]}
                  onPress={() => handleSlideSelect(slide.id)}
                  disabled={isConnecting}
                >
                  <View style={styles.slideInfo}>
                    <Text style={styles.slideName}>{slide.name}</Text>
                    {slide.group && (
                      <Text style={styles.slideGroup}>{slide.group}</Text>
                    )}
                  </View>
                  <View style={styles.slideActions}>
                    {currentSlide === slide.id && (
                      <Ionicons name="checkmark-circle" size={20} color={FreeShowTheme.colors.secondary} />
                    )}
                    <Ionicons name="chevron-forward" size={16} color={FreeShowTheme.colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {isConnecting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={FreeShowTheme.colors.secondary} />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  backButton: {
    marginRight: FreeShowTheme.spacing.md,
  },
  title: {
    flex: 1,
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  refreshButton: {
    marginLeft: FreeShowTheme.spacing.md,
  },
  content: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
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
  loadingText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.md,
  },
  reconnectButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginTop: FreeShowTheme.spacing.xl,
  },
  reconnectButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  controlSection: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.md,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: FreeShowTheme.spacing.md,
  },
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: FreeShowTheme.spacing.md,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
  },
  previousButton: {
    backgroundColor: '#FF851B',
  },
  nextButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
  },
  randomButton: {
    backgroundColor: '#6c757d',
  },
  projectButton: {
    backgroundColor: '#007bff',
  },
  clearButton: {
    backgroundColor: '#a82727',
  },
  controlButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
  },
  slidesSection: {
    flex: 1,
  },
  slideCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  slideCardActive: {
    borderColor: FreeShowTheme.colors.secondary,
    backgroundColor: FreeShowTheme.colors.primaryLighter,
  },
  slideInfo: {
    flex: 1,
  },
  slideName: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.xs,
  },
  slideGroup: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
  },
  slideActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  emptyStateText: {
    fontSize: FreeShowTheme.fontSize.lg,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.md,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: FreeShowTheme.spacing.sm,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showSection: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  showScrollView: {
    paddingVertical: FreeShowTheme.spacing.sm,
  },
  showCard: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    marginRight: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    alignItems: 'center',
  },
  showCardActive: {
    borderColor: FreeShowTheme.colors.secondary,
    backgroundColor: FreeShowTheme.colors.primaryLighter,
  },
  showName: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.xs,
  },
  startShowButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.xs,
    paddingHorizontal: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.sm,
  },
  debugSection: {
    marginBottom: FreeShowTheme.spacing.xl,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  debugCard: {
    paddingVertical: FreeShowTheme.spacing.md,
  },
  debugText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.xs,
  },
});

export default APIScreen; 