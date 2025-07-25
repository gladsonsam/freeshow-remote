import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isConnected && connectionHost) {
      testAPIConnection();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, connectionHost]);

  const testAPIConnection = async () => {
    if (!connectionHost) return;

    try {
      setIsLoading(true);
      // First test if the API endpoint is accessible
      const testUrl = `http://${connectionHost}:5505`;
      console.log('Testing API connection to:', testUrl);
      
      const testResponse = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      console.log('API Test response status:', testResponse.status);
      
      if (testResponse.status === 404) {
        throw new Error('FreeShow API not found. Make sure WebSocket/REST API is enabled in FreeShow > Connections settings.');
      }
      
      if (!testResponse.ok && testResponse.status !== 400) {
        // 400 might be expected if we don't send proper parameters
        throw new Error(`API server returned ${testResponse.status}: ${testResponse.statusText}`);
      }
      
      // If we get here, the API endpoint exists, now try to fetch shows
      await fetchShows();
      
    } catch (error) {
      console.error('API connection test failed:', error);
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'FreeShow API Connection Failed', 
        `Cannot connect to FreeShow API:\n\n${errorMessage}\n\nPlease check:\n• FreeShow is running\n• Go to FreeShow > Connections\n• Enable "WebSocket/REST API"\n• Restart FreeShow if needed`,
        [
          { text: 'Retry', onPress: testAPIConnection },
          { text: 'OK' }
        ]
      );
    }
  };

  const fetchShows = async () => {
    if (!connectionHost) return;

    try {
      setIsLoading(true);
      // Try the correct FreeShow API endpoint format
      // According to the docs, it should be: http://localhost:5505?action=ACTION_ID&data=JSON
      const url = `http://${connectionHost}:5505?action=get_shows&data={}`;
      console.log('Fetching shows from:', url);
      
      const showsResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', showsResponse.status);
      console.log('Response headers:', showsResponse.headers);
      
      if (!showsResponse.ok) {
        throw new Error(`HTTP ${showsResponse.status}: ${showsResponse.statusText}`);
      }
      
      const responseText = await showsResponse.text();
      console.log('Raw response:', responseText.substring(0, 200) + '...');
      
      let showsData;
      try {
        showsData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response was:', responseText);
        throw new Error('Invalid JSON response from FreeShow API. Make sure WebSocket/REST API is enabled in FreeShow Connections settings.');
      }
      
      const showsList: ShowData[] = [];
      const slidesList: SlideData[] = [];
      
      console.log('Shows data:', showsData);
      
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
        `Failed to connect to FreeShow API:\n\n${errorMessage}\n\nMake sure:\n• FreeShow is running\n• WebSocket/REST API is enabled in FreeShow > Connections settings\n• Port 5505 is accessible`,
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
    if (!connectionHost) {
      Alert.alert('Error', 'Not connected to FreeShow');
      return;
    }

    try {
      setIsConnecting(true);
      // Using FreeShow's HTTP API format: ?action=ACTION_ID&data=JSON
      const url = `http://${connectionHost}:5505?action=${action}&data=${encodeURIComponent(JSON.stringify(data))}`;
      console.log('Sending API command:', action, 'to:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('API Response:', responseText);
      
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.warn('Could not parse API response as JSON:', responseText);
        result = { success: true }; // Assume success if no JSON response
      }
      
      return result;
    } catch (error) {
      console.error('API command failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        'Command Failed', 
        `Failed to execute "${action}":\n\n${errorMessage}\n\nCheck that FreeShow API is enabled and accessible.`
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
    testAPIConnection();
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
              <Text style={styles.debugText}>API Port: 5505</Text>
              <Text style={styles.debugText}>Status: {isConnected ? 'Connected' : 'Disconnected'}</Text>
              <Text style={styles.debugText}>API URL: http://{connectionHost}:5505</Text>
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