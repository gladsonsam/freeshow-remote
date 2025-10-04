import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';

interface SongPresentationModalProps {
  visible: boolean;
  onClose: () => void;
  showDetails: any;
}

interface SlideData {
  id: string;
  group: string;
  lines: Array<{
    text: string;
    chords: Array<{ key: string; pos: number }>;
  }>;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const SongPresentationModal: React.FC<SongPresentationModalProps> = ({
  visible,
  onClose,
  showDetails,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Process slides when modal opens
  React.useEffect(() => {
    if (visible && showDetails?.slides && showDetails?.layouts) {
      const processedSlides = processSlides(showDetails.slides, showDetails.layouts);
      setSlides(processedSlides);
      setCurrentSlideIndex(0);
    }
  }, [visible, showDetails]);

  // Handle dimension changes for responsive design
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (visible && showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [visible, showControls, currentSlideIndex]);

  // Add keyboard navigation support
  useEffect(() => {
    if (!visible) return;

    const handleKeyPress = (event: any) => {
      switch (event.key) {
        case 'ArrowLeft':
          previousSlide();
          break;
        case 'ArrowRight':
          nextSlide();
          break;
        case 'Escape':
          onClose();
          break;
        case ' ':
        case 'Enter':
          setShowControls(!showControls);
          break;
      }
    };

    // Add event listener for web
    if (Platform.OS === 'web') {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [visible, currentSlideIndex, showControls, onClose]);

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const onGestureEvent = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    
    if (state === State.END) {
      if (translationX > 50) {
        // Swipe right - previous slide
        previousSlide();
      } else if (translationX < -50) {
        // Swipe left - next slide
        nextSlide();
      }
    }
  };

  const handleContentPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const screenWidth = dimensions.width;
    
    // If controls are visible, toggle them
    if (showControls) {
      setShowControls(false);
      return;
    }
    
    // If controls are hidden, use tap navigation
    if (locationX < screenWidth / 3) {
      // Left third - previous slide
      previousSlide();
    } else if (locationX > (screenWidth * 2) / 3) {
      // Right third - next slide
      nextSlide();
    } else {
      // Middle third - show controls
      setShowControls(true);
    }
  };

  const processSlides = (slidesData: any, layouts: any): SlideData[] => {
    if (!slidesData || !layouts) return [];

    // Get the default layout or first available layout
    const layoutKeys = Object.keys(layouts);
    const defaultLayout = layouts[layoutKeys[0]];
    
    if (!defaultLayout || !defaultLayout.slides) return [];

    const processedSlides: SlideData[] = [];

    // Process each slide in the layout order
    defaultLayout.slides.forEach((slideRef: any) => {
      const slideId = slideRef.id;
      const slide = slidesData[slideId];
      
      if (!slide) return;

      const slideData: SlideData = {
        id: slideId,
        group: slide.group || 'Unknown',
        lines: []
      };

      // Process each item in the slide
      if (slide.items && slide.items.length > 0) {
        slide.items.forEach((item: any) => {
          if (item.lines && item.lines.length > 0) {
            item.lines.forEach((line: any) => {
              if (line.text && line.text.length > 0) {
                const fullText = line.text.map((t: any) => t.value).join('');
                const chords = (line.chords || []).map((chord: any) => ({
                  key: chord.key,
                  pos: chord.pos
                }));

                slideData.lines.push({
                  text: fullText,
                  chords: chords
                });
              }
            });
          }
        });
      }

      if (slideData.lines.length > 0) {
        processedSlides.push(slideData);
      }
    });

    return processedSlides;
  };

  const nextSlide = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const previousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const renderSlide = (slide: SlideData) => {
    const isLandscape = dimensions.width > dimensions.height;
    const isTablet = Math.min(dimensions.width, dimensions.height) > 600;
    
    // Responsive font sizes
    const titleFontSize = isTablet ? (isLandscape ? 48 : 40) : (isLandscape ? 32 : 28);
    const lyricsFontSize = isTablet ? (isLandscape ? 36 : 32) : (isLandscape ? 24 : 20);
    const chordFontSize = isTablet ? (isLandscape ? 28 : 24) : (isLandscape ? 18 : 16);
    
    // Function to render a line with properly aligned chords
    const renderLineWithChords = (line: any, lineIndex: number) => {
      if (!line.chords || line.chords.length === 0) {
        // No chords, just render the text
        return (
          <View key={lineIndex} style={styles.lyricsLine}>
            <Text style={[styles.lyricsText, { fontSize: lyricsFontSize }]}>
              {line.text}
            </Text>
          </View>
        );
      }

      // Create a character-by-character breakdown for proper alignment
      const textChars = line.text.split('');
      const chordPositions = new Map();
      
      // Map chord positions
      line.chords.forEach((chord: any) => {
        chordPositions.set(chord.pos, chord.key);
      });

      return (
        <View key={lineIndex} style={styles.lyricsLine}>
          {/* Chords Line - positioned character by character */}
          <View style={styles.chordsLine}>
            {textChars.map((char: string, charIndex: number) => {
              const chord = chordPositions.get(charIndex);
              return chord ? (
                <Text
                  key={charIndex}
                  style={[
                    styles.chord,
                    { 
                      left: charIndex * (lyricsFontSize * 0.6), // More accurate character width
                      fontSize: chordFontSize
                    }
                  ]}
                >
                  {chord}
                </Text>
              ) : null;
            })}
          </View>
          
          {/* Text Line */}
          <Text style={[styles.lyricsText, { fontSize: lyricsFontSize }]}>
            {line.text}
          </Text>
        </View>
      );
    };
    
    return (
      <View style={styles.slideContainer}>
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { fontSize: titleFontSize }]}>
            {slide.group}
          </Text>
        </View>

        {/* Lyrics with Chords */}
        <View style={styles.lyricsContainer}>
          {slide.lines.map((line, lineIndex) => renderLineWithChords(line, lineIndex))}
        </View>

        {/* Slide Counter */}
        {showControls && (
          <View style={styles.slideCounter}>
            <Text style={styles.slideCounterText}>
              {currentSlideIndex + 1} / {slides.length}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!visible || slides.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar 
        hidden={!showControls} 
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={styles.container}>
        {/* Header - Only show when controls are visible */}
        {showControls && (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{showDetails?.name || 'Song Presentation'}</Text>
            <View style={styles.headerSpacer} />
          </View>
        )}

        {/* Main Content with Gestures */}
        <PanGestureHandler onHandlerStateChange={onGestureEvent}>
          <TouchableOpacity 
            style={styles.content} 
            onPress={handleContentPress}
            activeOpacity={1}
          >
            {renderSlide(slides[currentSlideIndex])}
          </TouchableOpacity>
        </PanGestureHandler>

        {/* Navigation Controls - Only show when controls are visible */}
        {showControls && (
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={[styles.navButton, currentSlideIndex === 0 && styles.navButtonDisabled]}
              onPress={previousSlide}
              disabled={currentSlideIndex === 0}
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={currentSlideIndex === 0 ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.text} 
              />
              <Text style={[styles.navButtonText, currentSlideIndex === 0 && styles.navButtonTextDisabled]}>
                Previous
              </Text>
            </TouchableOpacity>

            <View style={styles.slideIndicator}>
              {slides.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.slideDot,
                    index === currentSlideIndex && styles.slideDotActive
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.navButton, currentSlideIndex === slides.length - 1 && styles.navButtonDisabled]}
              onPress={nextSlide}
              disabled={currentSlideIndex === slides.length - 1}
            >
              <Text style={[styles.navButtonText, currentSlideIndex === slides.length - 1 && styles.navButtonTextDisabled]}>
                Next
              </Text>
              <Ionicons 
                name="chevron-forward" 
                size={24} 
                color={currentSlideIndex === slides.length - 1 ? FreeShowTheme.colors.textSecondary : FreeShowTheme.colors.text} 
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Account for status bar and notch
    paddingBottom: FreeShowTheme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeButton: {
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.xl,
    backgroundColor: '#000000',
  },
  slideContainer: {
    width: '100%',
    maxWidth: 1200,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '80%',
  },
  sectionHeader: {
    marginBottom: FreeShowTheme.spacing.xl,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  lyricsContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  lyricsLine: {
    marginBottom: FreeShowTheme.spacing.xl,
    position: 'relative',
    minHeight: 80,
    width: '100%',
    alignItems: 'center',
  },
  chordsLine: {
    height: 40,
    position: 'relative',
    marginBottom: FreeShowTheme.spacing.sm,
    width: '100%',
  },
  chord: {
    position: 'absolute',
    fontWeight: '700',
    color: '#FF6B35',
    top: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  lyricsText: {
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  slideCounter: {
    position: 'absolute',
    top: FreeShowTheme.spacing.lg,
    right: FreeShowTheme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  slideCounterText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  navButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  navButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
  slideIndicator: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
  },
  slideDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  slideDotActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
});
