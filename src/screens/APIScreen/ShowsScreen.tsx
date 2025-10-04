import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { useConnection, useSettings } from '../../contexts';
import { useShowsAPI } from '../../hooks/useShowsAPI';
import { useToast } from '../../hooks/useToast';
import { useShowSearch } from '../../hooks/useShowSearch';
import { SearchBar } from '../../components/ShowsScreen/SearchBar';
import { ShowCard } from '../../components/ShowsScreen/ShowCard';
import { ShowDetailsModal } from '../../components/ShowsScreen/ShowDetailsModal';
import { Toast } from '../../components/ShowsScreen/Toast';

interface ShowsScreenProps {
  navigation: any;
}

const ShowsScreen: React.FC<ShowsScreenProps> = ({ navigation }) => {
  const { state } = useConnection();
  const { settings } = useSettings();

  // State management
  const [showsLoaded, setShowsLoaded] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [showDetailsModalVisible, setShowDetailsModalVisible] = useState(false);
  const [selectedShow, setSelectedShow] = useState<any>(null);
  const [showDetails, setShowDetails] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    visible: boolean;
    current: number;
    total: number;
    currentShow: string;
    cancelled: boolean;
  }>({
    visible: false,
    current: 0,
    total: 0,
    currentShow: '',
    cancelled: false,
  });

  // Form state
  const [createForm, setCreateForm] = useState({ name: '', category: '' });
  const [editForm, setEditForm] = useState({ name: '', category: '' });

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const downloadCancelledRef = useRef(false);

  // Custom hooks
  const {
    shows,
    setShows,
    loading,
    socketConnected,
    loadingShowDetails,
    connectToAPI,
    disconnectFromAPI,
    loadShowsFromStorage,
    saveShowsToStorage,
    loadShows,
    loadShowDetails,
    deleteAllShows,
    resyncShows,
    setPlainText,
  } = useShowsAPI(state.connectionHost || '', state.currentShowPorts);

  const { toastVisible, toastMessage, toastOpacity, showToast } = useToast();
  const { searchTerm, setSearchTerm, filteredShows, clearSearch } = useShowSearch(shows);

  // Effects
  useEffect(() => {
    if (state.isConnected && state.connectionHost) {
      connectToAPI();
    }

    return () => {
      disconnectFromAPI();
    };
  }, [state.isConnected, state.connectionHost, connectToAPI, disconnectFromAPI]);

  useEffect(() => {
    loadShowsFromStorage().then(() => {
      setShowsLoaded(true);
    });
  }, [loadShowsFromStorage]);

  useEffect(() => {
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
  }, []);

  // Event handlers
  const handleLoadShows = async () => {
    const success = await loadShows();
    if (success) {
      showToast(`✅ Loaded ${shows.length} shows`);
    } else {
      showToast('❌ Failed to load shows from FreeShow');
    }
  };

  const handleCreateShow = async () => {
    if (!createForm.name.trim()) return;

    const newShow = {
      id: Date.now().toString(),
      name: createForm.name,
      category: createForm.category || '',
      timestamps: {
        created: Date.now(),
        modified: Date.now(),
        used: null,
      },
      quickAccess: {},
    };

    const updatedShows = [...shows, newShow];
    setShows(updatedShows);
    await saveShowsToStorage(updatedShows);
    setCreateForm({ name: '', category: '' });
    setCreateModalVisible(false);
    showToast('✅ Show created successfully');
  };

  const handleEditShow = async () => {
    if (!selectedShow || !editForm.name.trim()) return;

    const updatedShows = shows.map(show =>
      show.id === selectedShow.id
        ? {
            ...show,
            name: editForm.name,
            category: editForm.category || '',
            timestamps: {
              ...show.timestamps,
              modified: Date.now(),
            },
          }
        : show
    );

    setShows(updatedShows);
    await saveShowsToStorage(updatedShows);
    setEditForm({ name: '', category: '' });
    setEditModalVisible(false);
    setSelectedShow(null);
    showToast('✅ Show updated successfully');
  };

  const handleDeleteShow = async (showId: string) => {
    const updatedShows = shows.filter(show => show.id !== showId);
    setShows(updatedShows);
    await saveShowsToStorage(updatedShows);
    showToast('🗑️ Show deleted');
  };

  const handleDeleteAllShows = async () => {
    await deleteAllShows();
    showToast('🗑️ All shows deleted');
  };

  const handleResyncShows = async () => {
    showToast('🔄 Resyncing shows...');
    const success = await resyncShows();
    if (success) {
      showToast(`✅ Resynced ${shows.length} shows`);
    } else {
      showToast('❌ Failed to resync shows');
    }
  };

  const handleDownloadAll = async () => {
    // First, get the list of shows
    const success = await loadShows();
    if (!success) {
      showToast('❌ Failed to download shows list');
      return;
    }

    // Reset cancellation flag
    downloadCancelledRef.current = false;

    // Get the current shows list
    const showsToDownload = [...shows]; // Create a copy to avoid stale closure

    // Initialize progress
    setDownloadProgress({
      visible: true,
      current: 0,
      total: showsToDownload.length,
      currentShow: '',
      cancelled: false,
    });

    let downloadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < showsToDownload.length; i++) {
      // Check if cancelled using ref
      if (downloadCancelledRef.current) {
        break;
      }

      const show = showsToDownload[i];
      
      // Update progress
      setDownloadProgress(prev => ({
        ...prev,
        current: i + 1,
        currentShow: show.name || 'Untitled Show',
      }));

      try {
        const details = await loadShowDetails(show.id);
        if (details) {
          downloadedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        console.error(`Failed to download details for show ${show.id}:`, error);
      }
    }

    // Hide progress
    setDownloadProgress(prev => ({ ...prev, visible: false }));

    // Show final results
    if (downloadCancelledRef.current) {
      showToast(`⏹️ Download cancelled. ${downloadedCount} shows downloaded.`);
    } else if (failedCount === 0) {
      showToast(`✅ Downloaded ${downloadedCount} shows with full content`);
    } else {
      showToast(`✅ Downloaded ${downloadedCount} shows, ${failedCount} failed`);
    }
  };

  const handleCancelDownload = () => {
    downloadCancelledRef.current = true;
    setDownloadProgress(prev => ({ ...prev, cancelled: true }));
  };

  const handleShowPress = async (showId: string) => {
    // First check if we already have the details loaded locally
    const localShow = shows.find(show => show.id === showId);
    
    console.log('Show details loaded:', localShow?.detailsLoaded, 'for show:', localShow?.name);
    
    if (localShow && localShow.detailsLoaded) {
      // We have the details locally, open immediately
      setShowDetails(localShow);
      setShowDetailsModalVisible(true);
      showToast('✅ Show opened from cache');
      return;
    }

    // Details not loaded locally, fetch from API
    showToast('📥 Loading show details...');
    const details = await loadShowDetails(showId);
    if (details) {
      setShowDetails(details);
      setShowDetailsModalVisible(true);
      showToast('✅ Show details loaded from API');
    } else {
      showToast('❌ Failed to load show details');
    }
  };

  const openEditModal = (show: any) => {
    setSelectedShow(show);
    setEditForm({
      name: show.name || '',
      category: show.category || ''
    });
    setEditModalVisible(true);
  };

  const renderShowItem = ({ item }: { item: any }) => (
    <ShowCard
      show={item}
      onPress={() => handleShowPress(item.id)}
      onEdit={() => openEditModal(item)}
      onDelete={() => handleDeleteShow(item.id)}
      fadeAnim={fadeAnim}
      slideAnim={slideAnim}
    />
  );

  const renderEmptySearch = () => (
    <View style={styles.emptySearchContainer}>
      <Ionicons name="search" size={48} color={FreeShowTheme.colors.textSecondary} />
      <Text style={styles.emptySearchTitle}>No shows found</Text>
      <Text style={styles.emptySearchDescription}>
        No shows match "{searchTerm}". Try a different search term.
      </Text>
      <TouchableOpacity
        style={styles.clearSearchButtonLarge}
        onPress={clearSearch}
      >
        <Text style={styles.clearSearchButtonText}>Clear Search</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={FreeShowTheme.gradients.appBackground} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="albums" size={24} color={FreeShowTheme.colors.secondary} />
            <Text style={styles.headerTitle}>Shows</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerActionButton, !showsLoaded && styles.headerActionButtonDisabled]}
              onPress={handleDeleteAllShows}
            >
              <Ionicons name="trash" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionButton, !socketConnected && styles.headerActionButtonDisabled]}
              onPress={handleResyncShows}
              disabled={!socketConnected}
            >
              <Ionicons name="refresh" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.downloadButton, !socketConnected && styles.downloadButtonDisabled]}
              onPress={handleDownloadAll}
              disabled={!socketConnected || loading}
            >
              <Ionicons name="download" size={16} color="white" />
              <Text style={styles.downloadButtonText}>Download All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, !socketConnected && styles.createButtonDisabled]}
              onPress={() => setCreateModalVisible(true)}
              disabled={!socketConnected}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>New</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showsLoaded && shows.length > 0 && (
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onClearSearch={clearSearch}
            showCount={shows.length}
          />
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
            <Text style={styles.loadingText}>Loading shows...</Text>
          </View>
        ) : !showsLoaded || shows.length === 0 ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.emptyContainer}>
              <Ionicons name="albums-outline" size={64} color={FreeShowTheme.colors.textSecondary} />
              <Text style={styles.emptyTitle}>Shows Management</Text>
              <Text style={styles.emptyDescription}>
                Connect to FreeShow and load your presentations to manage them here
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionButton, { backgroundColor: FreeShowTheme.colors.secondary }]}
                onPress={handleLoadShows}
                disabled={!socketConnected}
              >
                <Ionicons name="download" size={20} color="white" />
                <Text style={styles.emptyActionButtonText}>Get Shows</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyActionButton, { backgroundColor: FreeShowTheme.colors.primaryDarker }]}
                onPress={() => setCreateModalVisible(true)}
              >
                <Ionicons name="add-circle" size={20} color={FreeShowTheme.colors.secondary} />
                <Text style={[styles.emptyActionButtonText, { color: FreeShowTheme.colors.secondary }]}>Create New</Text>
              </TouchableOpacity>
              {showsLoaded && shows.length > 0 && (
                <>
                  <TouchableOpacity
                    style={[styles.emptyActionButton, { backgroundColor: FreeShowTheme.colors.disconnected }]}
                    onPress={handleDeleteAllShows}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.emptyActionButtonText}>Delete All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.emptyActionButton, { backgroundColor: FreeShowTheme.colors.connected }]}
                    onPress={handleResyncShows}
                    disabled={!socketConnected}
                  >
                    <Ionicons name="refresh" size={20} color="white" />
                    <Text style={styles.emptyActionButtonText}>Resync</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>
        ) : (
          <FlatList
            style={styles.content}
            data={filteredShows}
            renderItem={renderShowItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.showSeparator} />}
            ListEmptyComponent={searchTerm ? renderEmptySearch : null}
            contentContainerStyle={styles.flatListContent}
          />
        )}

        {/* Toast Notification */}
        <Toast
          visible={toastVisible}
          message={toastMessage}
          opacity={toastOpacity}
        />

        {/* Download Progress Modal */}
        {downloadProgress.visible && (
          <View style={styles.progressModal}>
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Downloading Shows</Text>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelDownload}
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.progressContent}>
                <Text style={styles.progressText}>
                  {downloadProgress.current} of {downloadProgress.total} shows
                </Text>
                <Text style={styles.currentShowText}>
                  {downloadProgress.currentShow}
                </Text>
                
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${(downloadProgress.current / downloadProgress.total) * 100}%` 
                      }
                    ]} 
                  />
                </View>
                
                <Text style={styles.progressPercentage}>
                  {Math.round((downloadProgress.current / downloadProgress.total) * 100)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Show Details Modal */}
        <ShowDetailsModal
          visible={showDetailsModalVisible}
          onClose={() => setShowDetailsModalVisible(false)}
          showDetails={showDetails}
          loading={loadingShowDetails}
          onSetPlainText={setPlainText}
          onRefreshShow={loadShowDetails}
        />

        {/* TODO: Add Create and Edit modals here */}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  backButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FreeShowTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
  },
  headerActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    width: 36,
    height: 36,
    borderRadius: FreeShowTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  headerActionButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.textSecondary + '40',
    borderColor: FreeShowTheme.colors.textSecondary + '40',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  createButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.textSecondary + '40',
  },
  createButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '700',
    color: 'white',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.xs,
    backgroundColor: FreeShowTheme.colors.connected,
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
  },
  downloadButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.textSecondary + '40',
  },
  downloadButtonText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: 'white',
  },

  // Content
  content: {
    flex: 1,
  },
  flatListContent: {
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.md,
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  loadingText: {
    marginTop: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  emptyTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  emptyDescription: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: FreeShowTheme.spacing.xl,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FreeShowTheme.spacing.sm,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginTop: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  emptyActionButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '700',
  },

  // Search empty state
  emptySearchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: FreeShowTheme.spacing.xl,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },
  emptySearchTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.md,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  emptySearchDescription: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  clearSearchButtonLarge: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    marginTop: FreeShowTheme.spacing.md,
  },
  clearSearchButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },

  // Shows list
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingTop: FreeShowTheme.spacing.lg,
  },
  showSeparator: {
    height: FreeShowTheme.spacing.md,
  },

  // Download Progress Modal
  progressModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressContainer: {
    backgroundColor: FreeShowTheme.colors.primary,
    borderRadius: FreeShowTheme.borderRadius.xl,
    padding: FreeShowTheme.spacing.xl,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter + '40',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: FreeShowTheme.spacing.lg,
  },
  progressTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
  cancelButton: {
    backgroundColor: FreeShowTheme.colors.textSecondary + '40',
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.sm,
  },
  progressContent: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  currentShowText: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.text,
    fontWeight: '600',
    marginBottom: FreeShowTheme.spacing.lg,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 4,
    marginBottom: FreeShowTheme.spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: FreeShowTheme.colors.connected,
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontWeight: '600',
  },
});

export default ShowsScreen;
