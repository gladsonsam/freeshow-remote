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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useConnection } from '../contexts';

interface BibleScreenProps {
  navigation: any;
}

interface QuickVerse {
  reference: string;
  description: string;
  category: string;
}

interface BibleBook {
  name: string;
  chapters: number;
  testament: 'Old' | 'New';
}

const BibleScreen: React.FC<BibleScreenProps> = ({ navigation }) => {
  const { state } = useConnection();
  const { connectionHost, isConnected } = state;
  
  const [searchText, setSearchText] = useState('');
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [bibleId] = useState('bible1'); // Default bible ID
  
  const socketRef = useRef<Socket | null>(null);

  // Set up WebSocket connection
  useEffect(() => {
    if (isConnected && connectionHost) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isConnected, connectionHost]);

  const connectWebSocket = async () => {
    if (!connectionHost) return;

    try {
      console.log('Bible screen connecting to FreeShow WebSocket...');
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socketUrl = `http://${connectionHost}:5505`;
      socketRef.current = io(socketUrl, { 
        transports: ["websocket"],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
      });

      socketRef.current.on('connect', () => {
        console.log('Bible screen WebSocket connected');
        setSocketConnected(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('Bible screen WebSocket disconnected:', reason);
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Bible screen connection error:', error);
        setSocketConnected(false);
      });

    } catch (error) {
      console.error('Failed to setup Bible screen WebSocket:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setSocketConnected(false);
  };

  const sendApiCommand = async (action: string, data: any = {}): Promise<void> => {
    if (!connectionHost || !socketRef.current || !socketRef.current.connected) {
      throw new Error('Not connected to FreeShow');
    }

    try {
      const command = { action, ...data };
      console.log('Bible screen sending command:', command);
      socketRef.current.emit('data', JSON.stringify(command));
    } catch (error) {
      console.error('Bible screen command failed:', error);
      throw error;
    }
  };

  // Quick access verses organized by category
  const quickVerses: QuickVerse[] = [
    // Popular verses
    { reference: 'John 3:16', description: 'For God so loved the world', category: 'Popular' },
    { reference: 'Romans 8:28', description: 'All things work together for good', category: 'Popular' },
    { reference: 'Philippians 4:13', description: 'I can do all things through Christ', category: 'Popular' },
    { reference: 'Jeremiah 29:11', description: 'Plans to prosper you', category: 'Popular' },
    { reference: 'Psalm 23:1', description: 'The Lord is my shepherd', category: 'Popular' },
    { reference: 'Isaiah 41:10', description: 'Fear not, for I am with you', category: 'Popular' },
    
    // Comfort & Peace
    { reference: 'Matthew 11:28', description: 'Come to me, all who are weary', category: 'Comfort' },
    { reference: 'Psalm 46:10', description: 'Be still and know that I am God', category: 'Comfort' },
    { reference: 'John 14:27', description: 'Peace I leave with you', category: 'Comfort' },
    { reference: 'Philippians 4:6-7', description: 'Do not be anxious about anything', category: 'Comfort' },
    
    // Strength & Courage
    { reference: 'Joshua 1:9', description: 'Be strong and courageous', category: 'Strength' },
    { reference: 'Isaiah 40:31', description: 'Those who wait on the Lord', category: 'Strength' },
    { reference: '2 Timothy 1:7', description: 'God has not given us a spirit of fear', category: 'Strength' },
    
    // Love & Grace
    { reference: '1 Corinthians 13:4-7', description: 'Love is patient, love is kind', category: 'Love' },
    { reference: 'Ephesians 2:8-9', description: 'By grace you have been saved', category: 'Love' },
    { reference: '1 John 4:19', description: 'We love because he first loved us', category: 'Love' },
  ];

  // Common Bible books with chapter counts
  const bibleBooks: BibleBook[] = [
    // New Testament - Most Common
    { name: 'Matthew', chapters: 28, testament: 'New' },
    { name: 'Mark', chapters: 16, testament: 'New' },
    { name: 'Luke', chapters: 24, testament: 'New' },
    { name: 'John', chapters: 21, testament: 'New' },
    { name: 'Acts', chapters: 28, testament: 'New' },
    { name: 'Romans', chapters: 16, testament: 'New' },
    { name: '1 Corinthians', chapters: 16, testament: 'New' },
    { name: '2 Corinthians', chapters: 13, testament: 'New' },
    { name: 'Galatians', chapters: 6, testament: 'New' },
    { name: 'Ephesians', chapters: 6, testament: 'New' },
    { name: 'Philippians', chapters: 4, testament: 'New' },
    { name: 'Colossians', chapters: 4, testament: 'New' },
    { name: '1 Thessalonians', chapters: 5, testament: 'New' },
    { name: '2 Thessalonians', chapters: 3, testament: 'New' },
    { name: '1 Timothy', chapters: 6, testament: 'New' },
    { name: '2 Timothy', chapters: 4, testament: 'New' },
    { name: 'Titus', chapters: 3, testament: 'New' },
    { name: 'Philemon', chapters: 1, testament: 'New' },
    { name: 'Hebrews', chapters: 13, testament: 'New' },
    { name: 'James', chapters: 5, testament: 'New' },
    { name: '1 Peter', chapters: 5, testament: 'New' },
    { name: '2 Peter', chapters: 3, testament: 'New' },
    { name: '1 John', chapters: 5, testament: 'New' },
    { name: '2 John', chapters: 1, testament: 'New' },
    { name: '3 John', chapters: 1, testament: 'New' },
    { name: 'Jude', chapters: 1, testament: 'New' },
    { name: 'Revelation', chapters: 22, testament: 'New' },
    
    // Old Testament - Most Common
    { name: 'Genesis', chapters: 50, testament: 'Old' },
    { name: 'Exodus', chapters: 40, testament: 'Old' },
    { name: 'Leviticus', chapters: 27, testament: 'Old' },
    { name: 'Numbers', chapters: 36, testament: 'Old' },
    { name: 'Deuteronomy', chapters: 34, testament: 'Old' },
    { name: 'Joshua', chapters: 24, testament: 'Old' },
    { name: 'Judges', chapters: 21, testament: 'Old' },
    { name: 'Ruth', chapters: 4, testament: 'Old' },
    { name: '1 Samuel', chapters: 31, testament: 'Old' },
    { name: '2 Samuel', chapters: 24, testament: 'Old' },
    { name: '1 Kings', chapters: 22, testament: 'Old' },
    { name: '2 Kings', chapters: 25, testament: 'Old' },
    { name: '1 Chronicles', chapters: 29, testament: 'Old' },
    { name: '2 Chronicles', chapters: 36, testament: 'Old' },
    { name: 'Ezra', chapters: 10, testament: 'Old' },
    { name: 'Nehemiah', chapters: 13, testament: 'Old' },
    { name: 'Esther', chapters: 10, testament: 'Old' },
    { name: 'Job', chapters: 42, testament: 'Old' },
    { name: 'Psalms', chapters: 150, testament: 'Old' },
    { name: 'Proverbs', chapters: 31, testament: 'Old' },
    { name: 'Ecclesiastes', chapters: 12, testament: 'Old' },
    { name: 'Song of Solomon', chapters: 8, testament: 'Old' },
    { name: 'Isaiah', chapters: 66, testament: 'Old' },
    { name: 'Jeremiah', chapters: 52, testament: 'Old' },
    { name: 'Lamentations', chapters: 5, testament: 'Old' },
    { name: 'Ezekiel', chapters: 48, testament: 'Old' },
    { name: 'Daniel', chapters: 12, testament: 'Old' },
    { name: 'Hosea', chapters: 14, testament: 'Old' },
    { name: 'Joel', chapters: 3, testament: 'Old' },
    { name: 'Amos', chapters: 9, testament: 'Old' },
    { name: 'Obadiah', chapters: 1, testament: 'Old' },
    { name: 'Jonah', chapters: 4, testament: 'Old' },
    { name: 'Micah', chapters: 7, testament: 'Old' },
    { name: 'Nahum', chapters: 3, testament: 'Old' },
    { name: 'Habakkuk', chapters: 3, testament: 'Old' },
    { name: 'Zephaniah', chapters: 3, testament: 'Old' },
    { name: 'Haggai', chapters: 2, testament: 'Old' },
    { name: 'Zechariah', chapters: 14, testament: 'Old' },
    { name: 'Malachi', chapters: 4, testament: 'Old' },
  ];

  const handleShowScripture = async (reference: string) => {
    if (!socketConnected) {
      Alert.alert('Error', 'Not connected to FreeShow');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Showing scripture:', reference);
      await sendApiCommand('start_scripture', { 
        id: bibleId, 
        reference: reference.trim() 
      });
    } catch (error) {
      console.error('Failed to show scripture:', error);
      Alert.alert('Error', `Failed to show scripture: ${reference}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    if (!searchText.trim()) {
      Alert.alert('Error', 'Please enter a Bible reference');
      return;
    }
    handleShowScripture(searchText);
  };

  const handleBookSelect = (book: BibleBook) => {
    setSelectedBook(book.name);
    setSelectedChapter(null);
  };

  const handleChapterSelect = (chapter: number) => {
    if (selectedBook) {
      const reference = `${selectedBook} ${chapter}`;
      handleShowScripture(reference);
      setSelectedChapter(chapter);
    }
  };

  const handleClearAll = async () => {
    try {
      setIsLoading(true);
      await sendApiCommand('clear_all');
    } catch (error) {
      console.error('Failed to clear all:', error);
      Alert.alert('Error', 'Failed to clear all');
    } finally {
      setIsLoading(false);
    }
  };

  const groupedVerses = quickVerses.reduce((acc, verse) => {
    if (!acc[verse.category]) {
      acc[verse.category] = [];
    }
    acc[verse.category].push(verse);
    return acc;
  }, {} as Record<string, QuickVerse[]>);

  const newTestamentBooks = bibleBooks.filter(book => book.testament === 'New');
  const oldTestamentBooks = bibleBooks.filter(book => book.testament === 'Old');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Bible Scripture</Text>
        <View style={styles.headerRight}>
          <View style={[styles.connectionDot, { backgroundColor: socketConnected ? '#28a745' : '#dc3545' }]} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Search Scripture</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Enter reference (e.g., John 3:16, Psalm 23, Romans 8:28-30)"
              placeholderTextColor={FreeShowTheme.colors.textSecondary}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.searchButton, !searchText.trim() && styles.searchButtonDisabled]}
              onPress={handleSearchSubmit}
              disabled={isLoading || !searchText.trim() || !socketConnected}
            >
              <Ionicons name="search" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Verses by Category */}
        {Object.entries(groupedVerses).map(([category, verses]) => (
          <View key={category} style={styles.section}>
            <Text style={styles.sectionTitle}>{category} Verses</Text>
            <View style={styles.quickVersesGrid}>
              {verses.map((verse) => (
                <TouchableOpacity
                  key={verse.reference}
                  style={[styles.quickVerseButton, !socketConnected && styles.quickVerseButtonDisabled]}
                  onPress={() => handleShowScripture(verse.reference)}
                  disabled={isLoading || !socketConnected}
                >
                  <Text style={styles.quickVerseReference}>{verse.reference}</Text>
                  <Text style={styles.quickVerseDescription}>{verse.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Bible Books Navigator */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Book</Text>
          
          {/* New Testament */}
          <View style={styles.testamentSection}>
            <Text style={styles.testamentTitle}>New Testament</Text>
            <View style={styles.booksGrid}>
              {newTestamentBooks.map((book) => (
                <TouchableOpacity
                  key={book.name}
                  style={[
                    styles.bookButton,
                    selectedBook === book.name && styles.bookButtonSelected,
                    !socketConnected && styles.bookButtonDisabled
                  ]}
                  onPress={() => handleBookSelect(book)}
                  disabled={!socketConnected}
                >
                  <Text style={[
                    styles.bookButtonText,
                    selectedBook === book.name && styles.bookButtonTextSelected
                  ]}>
                    {book.name}
                  </Text>
                  <Text style={styles.bookChapterCount}>{book.chapters} ch</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Old Testament */}
          <View style={styles.testamentSection}>
            <Text style={styles.testamentTitle}>Old Testament</Text>
            <View style={styles.booksGrid}>
              {oldTestamentBooks.map((book) => (
                <TouchableOpacity
                  key={book.name}
                  style={[
                    styles.bookButton,
                    selectedBook === book.name && styles.bookButtonSelected,
                    !socketConnected && styles.bookButtonDisabled
                  ]}
                  onPress={() => handleBookSelect(book)}
                  disabled={!socketConnected}
                >
                  <Text style={[
                    styles.bookButtonText,
                    selectedBook === book.name && styles.bookButtonTextSelected
                  ]}>
                    {book.name}
                  </Text>
                  <Text style={styles.bookChapterCount}>{book.chapters} ch</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Chapter Selector */}
        {selectedBook && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedBook} - Select Chapter
            </Text>
            <View style={styles.chaptersGrid}>
              {Array.from(
                { length: bibleBooks.find(b => b.name === selectedBook)?.chapters || 0 },
                (_, i) => i + 1
              ).map((chapter) => (
                <TouchableOpacity
                  key={chapter}
                  style={[
                    styles.chapterButton,
                    selectedChapter === chapter && styles.chapterButtonSelected,
                    !socketConnected && styles.chapterButtonDisabled
                  ]}
                  onPress={() => handleChapterSelect(chapter)}
                  disabled={isLoading || !socketConnected}
                >
                  <Text style={[
                    styles.chapterButtonText,
                    selectedChapter === chapter && styles.chapterButtonTextSelected
                  ]}>
                    {chapter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Clear All - Always at bottom */}
      <View style={styles.bottomSection}>
        <TouchableOpacity 
          style={[styles.clearAllButton, !socketConnected && styles.clearAllButtonDisabled]}
          onPress={handleClearAll}
          disabled={isLoading || !socketConnected}
        >
          <Ionicons name="close-circle" size={24} color="white" />
          <Text style={styles.clearAllButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
          <Text style={styles.loadingText}>Loading Scripture...</Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    flex: 1,
    padding: FreeShowTheme.spacing.lg,
  },
  section: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
    marginBottom: FreeShowTheme.spacing.md,
  },
  // Search Section
  searchContainer: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.md,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    padding: FreeShowTheme.spacing.md,
    color: FreeShowTheme.colors.text,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    fontSize: FreeShowTheme.fontSize.md,
  },
  searchButton: {
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  searchButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  // Quick Verses
  quickVersesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.sm,
  },
  quickVerseButton: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.md,
    padding: FreeShowTheme.spacing.md,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    minWidth: '48%',
    maxWidth: '48%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  quickVerseButtonDisabled: {
    opacity: 0.6,
  },
  quickVerseReference: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
    marginBottom: FreeShowTheme.spacing.xs,
  },
  quickVerseDescription: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.textSecondary,
    lineHeight: 16,
  },
  // Testament Sections
  testamentSection: {
    marginBottom: FreeShowTheme.spacing.lg,
  },
  testamentTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.secondary,
    marginBottom: FreeShowTheme.spacing.sm,
  },
  // Books Grid
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.xs,
  },
  bookButton: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.sm,
    padding: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    minWidth: '30%',
    alignItems: 'center',
  },
  bookButtonSelected: {
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    borderColor: FreeShowTheme.colors.secondary,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: FreeShowTheme.fontSize.xs,
    fontWeight: '500',
    color: FreeShowTheme.colors.text,
    textAlign: 'center',
  },
  bookButtonTextSelected: {
    color: FreeShowTheme.colors.secondary,
    fontWeight: '600',
  },
  bookChapterCount: {
    fontSize: FreeShowTheme.fontSize.xs - 2,
    color: FreeShowTheme.colors.textSecondary,
    marginTop: 2,
  },
  // Chapters Grid
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.xs,
  },
  chapterButton: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.sm,
    padding: FreeShowTheme.spacing.sm,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterButtonSelected: {
    backgroundColor: FreeShowTheme.colors.secondary,
    borderColor: FreeShowTheme.colors.secondary,
  },
  chapterButtonDisabled: {
    opacity: 0.6,
  },
  chapterButtonText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '500',
    color: FreeShowTheme.colors.text,
  },
  chapterButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  // Bottom Section
  bottomSection: {
    padding: FreeShowTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: FreeShowTheme.colors.primaryLighter,
  },
  clearAllButton: {
    backgroundColor: '#dc3545',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  clearAllButtonDisabled: {
    backgroundColor: '#6c757d',
    opacity: 0.6,
  },
  clearAllButtonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
  },
  // Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: 'white',
    marginTop: FreeShowTheme.spacing.md,
    fontWeight: '600',
  },
});

export default BibleScreen; 