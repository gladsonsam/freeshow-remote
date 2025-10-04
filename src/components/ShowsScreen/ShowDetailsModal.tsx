import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { SongPresentationModal } from './SongPresentationModal';
import { EditShowModal } from './EditShowModal';

// Function to format song lyrics with chords
const formatSongLyrics = (slides: any, layouts: any) => {
  if (!slides || !layouts) return 'No lyrics available';

  // Get the default layout or first available layout
  const layoutKeys = Object.keys(layouts);
  const defaultLayout = layouts[layoutKeys[0]];
  
  if (!defaultLayout || !defaultLayout.slides) return 'No lyrics available';

  let formattedLyrics = '';

  // Process each slide in the layout order
  defaultLayout.slides.forEach((slideRef: any, index: number) => {
    const slideId = slideRef.id;
    const slide = slides[slideId];
    
    if (!slide) return;

    // Add section header (Verse, Chorus, Bridge, etc.)
    if (slide.group) {
      formattedLyrics += `[${slide.group}]\n`;
    }

    // Process each item in the slide
    if (slide.items && slide.items.length > 0) {
      slide.items.forEach((item: any) => {
        if (item.lines && item.lines.length > 0) {
          item.lines.forEach((line: any) => {
            if (line.text && line.text.length > 0) {
              let lineText = '';
              let currentPos = 0;

              // Sort chords by position
              const sortedChords = (line.chords || []).sort((a: any, b: any) => a.pos - b.pos);
              
              // Get the full text
              const fullText = line.text.map((t: any) => t.value).join('');
              
              // Insert chords at their positions
              sortedChords.forEach((chord: any) => {
                // Add text before chord
                if (chord.pos > currentPos) {
                  lineText += fullText.substring(currentPos, chord.pos);
                  currentPos = chord.pos;
                }
                
                // Add chord
                lineText += `[${chord.key}]`;
              });
              
              // Add remaining text
              if (currentPos < fullText.length) {
                lineText += fullText.substring(currentPos);
              }
              
              formattedLyrics += lineText + '\n';
            }
          });
        }
      });
    }

    // Add spacing between sections
    if (index < defaultLayout.slides.length - 1) {
      formattedLyrics += '\n';
    }
  });

  return formattedLyrics.trim();
};

interface ShowDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  showDetails: any;
  loading: boolean;
  onSetPlainText: (showId: string, value: string) => Promise<boolean>;
  onRefreshShow: (showId: string) => Promise<any>;
}

export const ShowDetailsModal: React.FC<ShowDetailsModalProps> = ({
  visible,
  onClose,
  showDetails,
  loading,
  onSetPlainText,
  onRefreshShow,
}) => {
  const [presentationVisible, setPresentationVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentShowDetails, setCurrentShowDetails] = useState(showDetails);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Update current show details when prop changes
  React.useEffect(() => {
    setCurrentShowDetails(showDetails);
  }, [showDetails]);

  // Handle refresh with local state update
  const handleRefresh = async () => {
    if (!showDetails?.id) return;
    
    setIsRefreshing(true);
    try {
      const refreshedData = await onRefreshShow(showDetails.id);
      if (refreshedData) {
        setCurrentShowDetails(refreshedData);
      }
    } catch (error) {
      console.error('Failed to refresh show details:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.modalBackButton}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Show Details</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.refreshButton, (loading || isRefreshing) && styles.refreshButtonDisabled]}
              onPress={handleRefresh}
              disabled={loading || isRefreshing}
            >
              {(loading || isRefreshing) ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="refresh" size={20} color="white" />
              )}
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditModalVisible(true)}
            >
              <Ionicons name="create" size={20} color="white" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            {currentShowDetails?.slides && (
              <TouchableOpacity
                style={styles.presentButton}
                onPress={() => setPresentationVisible(true)}
              >
                <Ionicons name="tv" size={20} color="white" />
                <Text style={styles.presentButtonText}>Present</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView style={styles.modalContent}>
          {loading ? (
            <View style={styles.loadingDetailsContainer}>
              <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
              <Text style={styles.loadingDetailsText}>Loading show details...</Text>
            </View>
          ) : currentShowDetails ? (
            <View style={styles.showDetailsContainer}>
              <View style={styles.showDetailsHeader}>
                <Ionicons name="albums" size={32} color={FreeShowTheme.colors.secondary} />
                <Text style={styles.showDetailsTitle}>{currentShowDetails.name || 'Untitled Show'}</Text>
              </View>
              
              {currentShowDetails.category && (
                <View style={styles.showDetailsSection}>
                  <Text style={styles.showDetailsSectionTitle}>Category</Text>
                  <Text style={styles.showDetailsSectionContent}>{currentShowDetails.category}</Text>
                </View>
              )}

              {/* Song Metadata */}
              {currentShowDetails.meta && (
                <View style={styles.showDetailsSection}>
                  <Text style={styles.showDetailsSectionTitle}>Song Information</Text>
                  <View style={styles.metadataContainer}>
                    {currentShowDetails.meta.author && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Author:</Text>
                        <Text style={styles.metadataValue}>{currentShowDetails.meta.author}</Text>
                      </View>
                    )}
                    {currentShowDetails.meta.artist && currentShowDetails.meta.artist !== currentShowDetails.meta.author && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Artist:</Text>
                        <Text style={styles.metadataValue}>{currentShowDetails.meta.artist}</Text>
                      </View>
                    )}
                    {currentShowDetails.meta.CCLI && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>CCLI:</Text>
                        <Text style={styles.metadataValue}>{currentShowDetails.meta.CCLI}</Text>
                      </View>
                    )}
                    {currentShowDetails.meta.copyright && (
                      <View style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>Copyright:</Text>
                        <Text style={styles.metadataValue}>{currentShowDetails.meta.copyright}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Song Lyrics with Chords */}
              {currentShowDetails.slides && (
                <View style={styles.showDetailsSection}>
                  <Text style={styles.showDetailsSectionTitle}>Song Lyrics</Text>
                  <ScrollView style={styles.lyricsContainer} nestedScrollEnabled>
                    <Text style={styles.lyricsText}>
                      {formatSongLyrics(currentShowDetails.slides, currentShowDetails.layouts)}
                    </Text>
                  </ScrollView>
                </View>
              )}

              {/* Timestamps */}
              {currentShowDetails.timestamps && (
                <View style={styles.showDetailsSection}>
                  <Text style={styles.showDetailsSectionTitle}>Timestamps</Text>
                  <View style={styles.timestampsContainer}>
                    <Text style={styles.timestampItem}>
                      Created: {new Date(currentShowDetails.timestamps.created).toLocaleString()}
                    </Text>
                    <Text style={styles.timestampItem}>
                      Modified: {new Date(currentShowDetails.timestamps.modified).toLocaleString()}
                    </Text>
                    {currentShowDetails.timestamps.used && (
                      <Text style={styles.timestampItem}>
                        Last Used: {new Date(currentShowDetails.timestamps.used).toLocaleString()}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noDetailsContainer}>
              <Ionicons name="alert-circle" size={48} color={FreeShowTheme.colors.textSecondary} />
              <Text style={styles.noDetailsTitle}>No Details Available</Text>
              <Text style={styles.noDetailsDescription}>
                Unable to load show details. Please try again.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Song Presentation Modal */}
      <SongPresentationModal
        visible={presentationVisible}
        onClose={() => setPresentationVisible(false)}
        showDetails={currentShowDetails}
      />

      {/* Edit Show Modal */}
      <EditShowModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        showDetails={currentShowDetails}
        onSave={onSetPlainText}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  modalBackButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  modalTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
  modalPlaceholder: {
    width: 40,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
    backgroundColor: FreeShowTheme.colors.connected,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  refreshButtonText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },
  refreshButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.textSecondary,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
    backgroundColor: FreeShowTheme.colors.primaryLighter,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  editButtonText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },
  presentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  presentButtonText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },
  modalContent: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
  loadingDetailsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  loadingDetailsText: {
    marginTop: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
  },
  showDetailsContainer: {
    padding: FreeShowTheme.spacing.lg,
  },
  showDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.xl,
    paddingBottom: FreeShowTheme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  showDetailsTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    flex: 1,
  },
  showDetailsSection: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  showDetailsSectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  showDetailsSectionContent: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    padding: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  metadataContainer: {
    gap: FreeShowTheme.spacing.sm,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  metadataLabel: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
    minWidth: 80,
  },
  metadataValue: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    flex: 1,
  },
  lyricsContainer: {
    maxHeight: 400,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  lyricsText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontFamily: 'monospace',
    padding: FreeShowTheme.spacing.md,
    lineHeight: 24,
  },
  timestampsContainer: {
    gap: FreeShowTheme.spacing.sm,
  },
  timestampItem: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    padding: FreeShowTheme.spacing.sm,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  rawDataContainer: {
    maxHeight: 300,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  rawDataText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontFamily: 'monospace',
    padding: FreeShowTheme.spacing.md,
  },
  noDetailsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  noDetailsTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  noDetailsDescription: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
