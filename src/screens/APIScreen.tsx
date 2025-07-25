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

const APIScreen: React.FC<APIScreenProps> = ({ route, navigation }) => {
  const { state } = useConnection();
  const { connectionHost, isConnected } = state;
  const { title = 'API Controls' } = route.params || {};

  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (isConnected && connectionHost) {
      fetchSlides();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, connectionHost]);

  const fetchSlides = async () => {
    if (!connectionHost) return;

    try {
      setIsLoading(true);
      // Using FreeShow API to get slides data
      const response = await fetch(`http://${connectionHost}:5505/api/get`);
      const data = await response.json();
      
      // Extract slides from the API response
      // This is a basic implementation - adjust based on actual FreeShow API structure
      const slidesList: SlideData[] = [];
      if (data.shows && typeof data.shows === 'object') {
        Object.entries(data.shows).forEach(([showId, showData]: [string, any]) => {
          if (showData.slides) {
            Object.entries(showData.slides).forEach(([slideId, slideData]: [string, any]) => {
              slidesList.push({
                id: slideId,
                name: slideData.name || `Slide ${slideId}`,
                group: showData.name || showId,
              });
            });
          }
        });
      }
      
      setSlides(slidesList);
    } catch (error) {
      console.error('Failed to fetch slides:', error);
      Alert.alert('Error', 'Failed to load slides from FreeShow API');
    } finally {
      setIsLoading(false);
    }
  };

  const sendAPICommand = async (command: string, data?: any) => {
    if (!connectionHost) {
      Alert.alert('Error', 'Not connected to FreeShow');
      return;
    }

    try {
      setIsConnecting(true);
      const response = await fetch(`http://${connectionHost}:5505/api/${command}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data || {}),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API command failed:', error);
      Alert.alert('Error', `Failed to execute command: ${command}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSlideSelect = async (slideId: string) => {
    setCurrentSlide(slideId);
    await sendAPICommand('goto', { slide: slideId });
  };

  const handleNextSlide = async () => {
    await sendAPICommand('next');
  };

  const handlePreviousSlide = async () => {
    await sendAPICommand('previous');
  };

  const handleClearOutput = async () => {
    await sendAPICommand('clear');
  };

  const handleRefresh = () => {
    fetchSlides();
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
          {/* Control Buttons */}
          <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Presentation Controls</Text>
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
                style={[styles.controlButton, styles.clearButton]}
                onPress={handleClearOutput}
                disabled={isConnecting}
              >
                <Ionicons name="close-circle" size={24} color="white" />
                <Text style={styles.controlButtonText}>Clear</Text>
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
});

export default APIScreen; 