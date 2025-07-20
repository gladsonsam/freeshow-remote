import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { freeShowService } from '../services/FreeShowService';
import { FreeShowShow, FreeShowOutput, FreeShowSlide } from '../types';
import { useConnection } from '../contexts/ConnectionContext';

interface ShowsScreenProps {
  navigation: any;
}

const { width: screenWidth } = Dimensions.get('window');
const slideWidth = (screenWidth - 60) / 3; // 3 slides per row with spacing

export default function ShowsScreen({ navigation }: ShowsScreenProps) {
  const [shows, setShows] = useState<FreeShowShow[]>([]);
  const [currentShow, setCurrentShow] = useState<FreeShowShow | null>(null);
  const [currentOutput, setCurrentOutput] = useState<FreeShowOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isConnected } = useConnection();

  useEffect(() => {
    loadData();
    setupEventListeners();

    // Set a timeout to stop loading if no response received
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, stopping loading state');
      setLoading(false);
    }, 3000);

    return () => {
      freeShowService.removeAllListeners();
      clearTimeout(loadingTimeout);
    };
  }, []);

  const setupEventListeners = () => {
    freeShowService.onShows((showsData: FreeShowShow[]) => {
      console.log('ShowsScreen - Received shows:', showsData);
      // Ensure we have an array, even if the API returns something unexpected
      const showsArray = Array.isArray(showsData) ? showsData : [];
      setShows(showsArray);
      setLoading(false);
    });

    freeShowService.onShow((showData: FreeShowShow) => {
      console.log('ShowsScreen - Received show:', showData);
      setCurrentShow(showData);
    });

    freeShowService.onOutput((outputData: FreeShowOutput) => {
      console.log('ShowsScreen - Received output:', outputData);
      setCurrentOutput(outputData);
    });
  };

  const loadData = () => {
    if (isConnected) {
      freeShowService.getShows();
      freeShowService.getCurrentOutput();
    } else {
      // Load mock data when not connected to FreeShow
      setShows([
        {
          id: '1',
          name: 'Sunday Morning Service',
          slides: [
            { id: '1', group: 'Verse 1', items: [] },
            { id: '2', group: 'Chorus', items: [] },
            { id: '3', group: 'Verse 2', items: [] },
            { id: '4', group: 'Bridge', items: [] }
          ]
        },
        {
          id: '2',
          name: 'Wednesday Night',
          slides: [
            { id: '1', group: 'Verse', items: [] },
            { id: '2', group: 'Chorus', items: [] }
          ]
        }
      ]);
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const selectShow = (show: FreeShowShow) => {
    freeShowService.selectShowByName(show.name);
    freeShowService.getShow(show.id);
  };

  const selectSlide = (index: number) => {
    if (currentShow) {
      freeShowService.selectSlideByIndex(index, currentShow.id);
    }
  };
  const getSlideColor = (slide: FreeShowSlide, index: number) => {
    // Use slide color if available, otherwise determine by content or position
    if (slide.color) {
      return slide.color;
    }

    // Try to determine slide type from content or group
    const group = slide.group?.toLowerCase() || '';
    if (group.includes('verse')) return FreeShowTheme.colors.secondary;
    if (group.includes('chorus')) return '#FF4136';
    if (group.includes('pre-chorus')) return '#B10DC9';
    if (group.includes('bridge')) return '#FF851B';
    if (group.includes('tag')) return '#39CCCC';
    
    // Fallback to alternating colors
    const colors = [FreeShowTheme.colors.secondary, '#FF4136', '#B10DC9', '#FF851B', '#39CCCC'];
    return colors[index % colors.length];
  };

  const renderShows = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
          <Text style={styles.loadingText}>Loading shows...</Text>
        </View>
      );
    }

    // Ensure shows is an array
    const showsArray = Array.isArray(shows) ? shows : [];

    if (showsArray.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="folder-open-outline" size={48} color={FreeShowTheme.colors.primaryLighter} />
          <Text style={styles.emptyText}>No shows available</Text>
        </View>
      );
    }

    return (
      <View style={styles.showsList}>
        {showsArray.map((show) => (
          <TouchableOpacity 
            key={show.id} 
            style={styles.showCard}
            onPress={() => selectShow(show)}
          >
            <View style={[styles.showPreview, { backgroundColor: FreeShowTheme.colors.primaryDarkest }]}>
              <View style={styles.slideGrid}>
                {Array.from({ length: Math.min(6, show.slides?.length || 0) }, (_, i) => (
                  <View 
                    key={i} 
                    style={[
                      styles.miniSlide,
                      { 
                        backgroundColor: i === (currentOutput?.slideIndex || 0) && currentShow?.id === show.id 
                          ? FreeShowTheme.colors.secondary 
                          : FreeShowTheme.colors.primaryLighter 
                      }
                    ]}
                  />
                ))}
              </View>
            </View>
            <View style={styles.showInfo}>
              <Text style={styles.showName} numberOfLines={2}>{show.name}</Text>
              <Text style={styles.showDetails}>
                {show.slides?.length || 0} slides
                {show.category && ` • ${show.category}`}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderCurrentShow = () => {
    if (!currentShow || !currentShow.slides || currentShow.slides.length === 0) {
      return null;
    }

    return (
      <View style={styles.currentShowSection}>
        <Text style={styles.sectionTitle}>Current Show - {currentShow.name}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slidesContainer}>
          {currentShow.slides.map((slide, index) => (
            <TouchableOpacity 
              key={slide.id} 
              style={styles.slideItem}
              onPress={() => selectSlide(index)}
            >
              <View style={[
                styles.slidePreview, 
                { 
                  borderColor: getSlideColor(slide, index),
                  backgroundColor: index === (currentOutput?.slideIndex || 0) 
                    ? getSlideColor(slide, index) + '33' 
                    : FreeShowTheme.colors.primaryDarkest 
                }
              ]}>
                <Text style={[styles.slideNumber, { color: getSlideColor(slide, index) }]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.slideTitle, { color: getSlideColor(slide, index) }]} numberOfLines={2}>
                {slide.group || `Slide ${index + 1}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[FreeShowTheme.colors.secondary]}
            tintColor={FreeShowTheme.colors.secondary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Shows</Text>
          <Text style={styles.subtitle}>Available presentations</Text>
        </View>

        {renderShows()}
        {renderCurrentShow()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: FreeShowTheme.spacing.xl,
  },
  header: {
    marginBottom: FreeShowTheme.spacing.xxxl,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.xxxl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
    marginBottom: FreeShowTheme.spacing.xs,
    fontFamily: FreeShowTheme.fonts.system,
  },
  subtitle: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99', // 60% opacity
    fontFamily: FreeShowTheme.fonts.system,
  },
  connectionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF851B20',
    padding: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    marginBottom: FreeShowTheme.spacing.lg,
    borderWidth: 1,
    borderColor: '#FF851B',
  },
  connectionText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: '#FF851B',
    marginLeft: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xxxl,
  },
  loadingText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.md,
    fontFamily: FreeShowTheme.fonts.system,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xxxl,
  },
  emptyText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
    marginTop: FreeShowTheme.spacing.md,
    fontFamily: FreeShowTheme.fonts.system,
  },
  showsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.xxxl,
  },
  showCard: {
    width: slideWidth,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    overflow: 'hidden',
  },
  showPreview: {
    height: 80,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    width: 30,
    height: 20,
  },
  miniSlide: {
    width: 4,
    height: 3,
    borderRadius: 1,
  },
  showInfo: {
    padding: FreeShowTheme.spacing.md,
  },
  showName: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.xs,
    fontFamily: FreeShowTheme.fonts.system,
  },
  showDetails: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + 'CC', // 80% opacity
    fontFamily: FreeShowTheme.fonts.system,
  },
  currentShowSection: {
    marginTop: FreeShowTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.lg,
    fontFamily: FreeShowTheme.fonts.system,
  },
  slidesContainer: {
    marginHorizontal: -FreeShowTheme.spacing.xl,
    paddingHorizontal: FreeShowTheme.spacing.xl,
  },
  slideItem: {
    alignItems: 'center',
    marginRight: FreeShowTheme.spacing.md,
  },
  slidePreview: {
    width: 60,
    height: 80,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderRadius: FreeShowTheme.borderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.xs,
  },
  slideNumber: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: 'bold',
    fontFamily: FreeShowTheme.fonts.system,
  },
  slideTitle: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '600',
    textAlign: 'center',
    width: 60,
    fontFamily: FreeShowTheme.fonts.system,
  },
});
