import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FreeShowTheme } from '../../theme/FreeShowTheme';
import { useConnection } from '../../contexts';
import { useSettings } from '../../contexts';
import { ErrorLogger } from '../../services/ErrorLogger';
import { Socket, io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ScriptureScreenProps {
  navigation: any;
}

interface BibleVersion {
  id: string;
  name: string;
  abbreviation: string;
}

interface Book {
  number: number;
  name: string;
  abbreviation: string;
  chapters: number;
  category: string;
  testament: 'OT' | 'NT';
}

interface Category {
  id: string;
  name: string;
  color: string;
  books: Book[];
}

const BIBLE_BOOKS: Book[] = [
  // OLD TESTAMENT - Law (1-5)
  { number: 1, name: 'Genesis', abbreviation: 'GEN', chapters: 50, category: 'law', testament: 'OT' },
  { number: 2, name: 'Exodus', abbreviation: 'EXO', chapters: 40, category: 'law', testament: 'OT' },
  { number: 3, name: 'Leviticus', abbreviation: 'LEV', chapters: 27, category: 'law', testament: 'OT' },
  { number: 4, name: 'Numbers', abbreviation: 'NUM', chapters: 36, category: 'law', testament: 'OT' },
  { number: 5, name: 'Deuteronomy', abbreviation: 'DEU', chapters: 34, category: 'law', testament: 'OT' },
  // OLD TESTAMENT - History (6-17)
  { number: 6, name: 'Joshua', abbreviation: 'JOS', chapters: 24, category: 'history', testament: 'OT' },
  { number: 7, name: 'Judges', abbreviation: 'JDG', chapters: 21, category: 'history', testament: 'OT' },
  { number: 8, name: 'Ruth', abbreviation: 'RUT', chapters: 4, category: 'history', testament: 'OT' },
  { number: 9, name: '1 Samuel', abbreviation: '1SA', chapters: 31, category: 'history', testament: 'OT' },
  { number: 10, name: '2 Samuel', abbreviation: '2SA', chapters: 24, category: 'history', testament: 'OT' },
  { number: 11, name: '1 Kings', abbreviation: '1KI', chapters: 22, category: 'history', testament: 'OT' },
  { number: 12, name: '2 Kings', abbreviation: '2KI', chapters: 25, category: 'history', testament: 'OT' },
  { number: 13, name: '1 Chronicles', abbreviation: '1CH', chapters: 29, category: 'history', testament: 'OT' },
  { number: 14, name: '2 Chronicles', abbreviation: '2CH', chapters: 36, category: 'history', testament: 'OT' },
  { number: 15, name: 'Ezra', abbreviation: 'EZR', chapters: 10, category: 'history', testament: 'OT' },
  { number: 16, name: 'Nehemiah', abbreviation: 'NEH', chapters: 13, category: 'history', testament: 'OT' },
  { number: 17, name: 'Esther', abbreviation: 'EST', chapters: 10, category: 'history', testament: 'OT' },
  // OLD TESTAMENT - Poetry & Wisdom (18-22)
  { number: 18, name: 'Job', abbreviation: 'JOB', chapters: 42, category: 'poetry', testament: 'OT' },
  { number: 19, name: 'Psalms', abbreviation: 'PSA', chapters: 150, category: 'poetry', testament: 'OT' },
  { number: 20, name: 'Proverbs', abbreviation: 'PRO', chapters: 31, category: 'poetry', testament: 'OT' },
  { number: 21, name: 'Ecclesiastes', abbreviation: 'ECC', chapters: 12, category: 'poetry', testament: 'OT' },
  { number: 22, name: 'Song of Solomon', abbreviation: 'SNG', chapters: 8, category: 'poetry', testament: 'OT' },
  // OLD TESTAMENT - Prophets (23-39)
  { number: 23, name: 'Isaiah', abbreviation: 'ISA', chapters: 66, category: 'prophets', testament: 'OT' },
  { number: 24, name: 'Jeremiah', abbreviation: 'JER', chapters: 52, category: 'prophets', testament: 'OT' },
  { number: 25, name: 'Lamentations', abbreviation: 'LAM', chapters: 5, category: 'prophets', testament: 'OT' },
  { number: 26, name: 'Ezekiel', abbreviation: 'EZK', chapters: 48, category: 'prophets', testament: 'OT' },
  { number: 27, name: 'Daniel', abbreviation: 'DAN', chapters: 12, category: 'prophets', testament: 'OT' },
  { number: 28, name: 'Hosea', abbreviation: 'HOS', chapters: 14, category: 'prophets', testament: 'OT' },
  { number: 29, name: 'Joel', abbreviation: 'JOL', chapters: 3, category: 'prophets', testament: 'OT' },
  { number: 30, name: 'Amos', abbreviation: 'AMO', chapters: 9, category: 'prophets', testament: 'OT' },
  { number: 31, name: 'Obadiah', abbreviation: 'OBA', chapters: 1, category: 'prophets', testament: 'OT' },
  { number: 32, name: 'Jonah', abbreviation: 'JON', chapters: 4, category: 'prophets', testament: 'OT' },
  { number: 33, name: 'Micah', abbreviation: 'MIC', chapters: 7, category: 'prophets', testament: 'OT' },
  { number: 34, name: 'Nahum', abbreviation: 'NAM', chapters: 3, category: 'prophets', testament: 'OT' },
  { number: 35, name: 'Habakkuk', abbreviation: 'HAB', chapters: 3, category: 'prophets', testament: 'OT' },
  { number: 36, name: 'Zephaniah', abbreviation: 'ZEP', chapters: 3, category: 'prophets', testament: 'OT' },
  { number: 37, name: 'Haggai', abbreviation: 'HAG', chapters: 2, category: 'prophets', testament: 'OT' },
  { number: 38, name: 'Zechariah', abbreviation: 'ZEC', chapters: 14, category: 'prophets', testament: 'OT' },
  { number: 39, name: 'Malachi', abbreviation: 'MAL', chapters: 4, category: 'prophets', testament: 'OT' },
  // NEW TESTAMENT - Gospels & Acts (40-44)
  { number: 40, name: 'Matthew', abbreviation: 'MAT', chapters: 28, category: 'gospels', testament: 'NT' },
  { number: 41, name: 'Mark', abbreviation: 'MRK', chapters: 16, category: 'gospels', testament: 'NT' },
  { number: 42, name: 'Luke', abbreviation: 'LUK', chapters: 24, category: 'gospels', testament: 'NT' },
  { number: 43, name: 'John', abbreviation: 'JHN', chapters: 21, category: 'gospels', testament: 'NT' },
  { number: 44, name: 'Acts', abbreviation: 'ACT', chapters: 28, category: 'gospels', testament: 'NT' },
  // NEW TESTAMENT - Letters (45-65)
  { number: 45, name: 'Romans', abbreviation: 'ROM', chapters: 16, category: 'letters', testament: 'NT' },
  { number: 46, name: '1 Corinthians', abbreviation: '1CO', chapters: 16, category: 'letters', testament: 'NT' },
  { number: 47, name: '2 Corinthians', abbreviation: '2CO', chapters: 13, category: 'letters', testament: 'NT' },
  { number: 48, name: 'Galatians', abbreviation: 'GAL', chapters: 6, category: 'letters', testament: 'NT' },
  { number: 49, name: 'Ephesians', abbreviation: 'EPH', chapters: 6, category: 'letters', testament: 'NT' },
  { number: 50, name: 'Philippians', abbreviation: 'PHP', chapters: 4, category: 'letters', testament: 'NT' },
  { number: 51, name: 'Colossians', abbreviation: 'COL', chapters: 4, category: 'letters', testament: 'NT' },
  { number: 52, name: '1 Thessalonians', abbreviation: '1TH', chapters: 5, category: 'letters', testament: 'NT' },
  { number: 53, name: '2 Thessalonians', abbreviation: '2TH', chapters: 3, category: 'letters', testament: 'NT' },
  { number: 54, name: '1 Timothy', abbreviation: '1TI', chapters: 6, category: 'letters', testament: 'NT' },
  { number: 55, name: '2 Timothy', abbreviation: '2TI', chapters: 4, category: 'letters', testament: 'NT' },
  { number: 56, name: 'Titus', abbreviation: 'TIT', chapters: 3, category: 'letters', testament: 'NT' },
  { number: 57, name: 'Philemon', abbreviation: 'PHM', chapters: 1, category: 'letters', testament: 'NT' },
  { number: 58, name: 'Hebrews', abbreviation: 'HEB', chapters: 13, category: 'letters', testament: 'NT' },
  { number: 59, name: 'James', abbreviation: 'JAS', chapters: 5, category: 'letters', testament: 'NT' },
  { number: 60, name: '1 Peter', abbreviation: '1PE', chapters: 5, category: 'letters', testament: 'NT' },
  { number: 61, name: '2 Peter', abbreviation: '2PE', chapters: 3, category: 'letters', testament: 'NT' },
  { number: 62, name: '1 John', abbreviation: '1JN', chapters: 5, category: 'letters', testament: 'NT' },
  { number: 63, name: '2 John', abbreviation: '2JN', chapters: 1, category: 'letters', testament: 'NT' },
  { number: 64, name: '3 John', abbreviation: '3JN', chapters: 1, category: 'letters', testament: 'NT' },
  { number: 65, name: 'Jude', abbreviation: 'JUD', chapters: 1, category: 'letters', testament: 'NT' },
  // NEW TESTAMENT - Apocalyptic (66)
  { number: 66, name: 'Revelation', abbreviation: 'REV', chapters: 22, category: 'prophecy', testament: 'NT' },
];

const OT_CATEGORIES: Category[] = [
  { id: 'law', name: 'The Law', color: '#e84242', books: BIBLE_BOOKS.filter(b => b.category === 'law') },
  { id: 'history', name: 'History', color: '#e89d42', books: BIBLE_BOOKS.filter(b => b.category === 'history') },
  { id: 'poetry', name: 'Poetry & Wisdom', color: '#b542e8', books: BIBLE_BOOKS.filter(b => b.category === 'poetry') },
  { id: 'prophets', name: 'Prophets', color: '#42e84d', books: BIBLE_BOOKS.filter(b => b.category === 'prophets') },
];

const NT_CATEGORIES: Category[] = [
  { id: 'gospels', name: 'The Gospels & Acts', color: '#42c4e8', books: BIBLE_BOOKS.filter(b => b.category === 'gospels') },
  { id: 'letters', name: 'Letters', color: '#e8de42', books: BIBLE_BOOKS.filter(b => b.category === 'letters') },
  { id: 'prophecy', name: 'Apocalyptic', color: '#e842e5', books: BIBLE_BOOKS.filter(b => b.category === 'prophecy') },
];

const STORAGE_KEY = '@freeshow_bibles';

const ScriptureScreen: React.FC<ScriptureScreenProps> = ({ navigation }) => {
  const { state } = useConnection();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // Scripture selection
  const [selectedBook, setSelectedBook] = useState<Book>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<number>(1);
  const [selectedVersion, setSelectedVersion] = useState<BibleVersion | null>(null);
  const [activeTestament, setActiveTestament] = useState<'OT' | 'NT'>('NT');

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Socket connection
  const socketRef = useRef<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Load Bible versions
  useEffect(() => {
    loadBibleVersions();
  }, []);

  const loadBibleVersions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const versions = JSON.parse(stored);
        if (versions.length > 0) {
          setSelectedVersion(versions[0]);
        }
      }
    } catch (error) {
      ErrorLogger.error('Failed to load Bible versions', 'ScriptureScreen', error instanceof Error ? error : new Error(String(error)));
    }
  };

  // Socket connection
  useEffect(() => {
    if (state.isConnected && state.connectionHost && state.currentShowPorts) {
      const socketUrl = `http://${state.connectionHost}:${state.currentShowPorts.api}`;

      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current.on('connect', () => {
        setSocketConnected(true);
      });

      socketRef.current.on('disconnect', () => {
        setSocketConnected(false);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [state.isConnected, state.connectionHost, state.currentShowPorts]);

  // Toast notification
  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);

    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  const handleSendToFreeShow = async () => {
    if (!socketConnected || !socketRef.current) {
      showToast('❌ Not connected to FreeShow');
      return;
    }

    setIsSending(true);

    try {
      const reference = `${selectedBook.number}.${selectedChapter}.${selectedVerse}`;

      const command: any = {
        action: 'start_scripture',
        reference: reference,
      };

      if (selectedVersion && selectedVersion.id) {
        command.id = selectedVersion.id;
      }

      ErrorLogger.info('Sending scripture to FreeShow', 'ScriptureScreen', { command });
      socketRef.current.emit('data', JSON.stringify(command));

      showToast(`✓ ${selectedBook.name} ${selectedChapter}:${selectedVerse}`);
    } catch (error) {
      ErrorLogger.error('Failed to send scripture', 'ScriptureScreen', error instanceof Error ? error : new Error(String(error)));
      showToast('❌ Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const handleScriptureAction = async (action: 'scripture_next' | 'scripture_previous') => {
    if (!socketConnected || !socketRef.current) {
      showToast('❌ Not connected to FreeShow');
      return;
    }

    try {
      const command = { action };

      ErrorLogger.info(`Sending ${action} to FreeShow`, 'ScriptureScreen', { command });
      socketRef.current.emit('data', JSON.stringify(command));

      showToast(action === 'scripture_next' ? '▶ Next' : '◀ Previous');
    } catch (error) {
      ErrorLogger.error(`Failed to send ${action}`, 'ScriptureScreen', error instanceof Error ? error : new Error(String(error)));
      showToast('❌ Failed');
    }
  };

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setSelectedChapter(1);
    setSelectedVerse(1);
    setActiveTestament(book.testament);
  };

  // Generate chapter and verse options based on current selections
  const chapterOptions = Array.from({ length: selectedBook.chapters }, (_, i) => i + 1);
  
  // Generate more verses to cover most chapters (up to 176 for Psalm 119)
  const verseOptions = Array.from({ length: 180 }, (_, i) => i + 1);

  const currentCategories = activeTestament === 'OT' ? OT_CATEGORIES : NT_CATEGORIES;

  const ContentColumn = () => (
    <>
      {/* Current Selection Display */}
      <View style={styles.currentSelection}>
        <Text style={styles.currentSelectionText}>
          {selectedBook.name} {selectedChapter}:{selectedVerse}
        </Text>
        <Text style={styles.currentSelectionFormat}>
          {selectedBook.number}.{selectedChapter}.{selectedVerse}
        </Text>
      </View>

      {/* Testament Toggle */}
      <View style={styles.testamentToggle}>
        <TouchableOpacity
          style={[styles.testamentButton, activeTestament === 'OT' && styles.testamentButtonActive]}
          onPress={() => setActiveTestament('OT')}
        >
          <Text style={[styles.testamentButtonText, activeTestament === 'OT' && styles.testamentButtonTextActive]}>
            Old Testament
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.testamentButton, activeTestament === 'NT' && styles.testamentButtonActive]}
          onPress={() => setActiveTestament('NT')}
        >
          <Text style={[styles.testamentButtonText, activeTestament === 'NT' && styles.testamentButtonTextActive]}>
            New Testament
          </Text>
        </TouchableOpacity>
      </View>

      {/* Books by Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Book</Text>
        {currentCategories.map((category) => (
          <View key={category.id} style={styles.categoryContainer}>
            <View style={[styles.categoryHeader, { backgroundColor: category.color + '20', borderLeftColor: category.color }]}>
              <Text style={[styles.categoryHeaderText, { color: category.color }]}>
                {category.name}
              </Text>
            </View>
            <View style={styles.booksGrid}>
              {category.books.map((book) => (
                <TouchableOpacity
                  key={book.number}
                  style={[
                    styles.bookButton,
                    isTablet && styles.bookButtonTablet,
                    selectedBook.number === book.number && {
                      backgroundColor: category.color + '40',
                      borderColor: category.color,
                    },
                  ]}
                  onPress={() => handleBookSelect(book)}
                >
                  <Text style={[
                    styles.bookButtonText,
                    isTablet && styles.bookButtonTextTablet,
                    selectedBook.number === book.number && { color: category.color, fontWeight: '700' },
                  ]}>
                    {book.abbreviation}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Chapter Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chapter ({selectedBook.chapters} total)</Text>
        <ScrollView
          horizontal={!isTablet}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={!isTablet && styles.horizontalScroll}
        >
          <View style={[styles.numbersGrid, isTablet && styles.numbersGridTablet]}>
            {chapterOptions.map((chapter) => (
              <TouchableOpacity
                key={chapter}
                style={[
                  styles.numberButton,
                  isTablet && styles.numberButtonTablet,
                  selectedChapter === chapter && styles.numberButtonSelected,
                ]}
                onPress={() => {
                  setSelectedChapter(chapter);
                  setSelectedVerse(1); // Reset verse when chapter changes
                }}
              >
                <Text style={[
                  styles.numberButtonText,
                  isTablet && styles.numberButtonTextTablet,
                  selectedChapter === chapter && styles.numberButtonTextSelected,
                ]}>
                  {chapter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Verse Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verse</Text>
        <ScrollView
          horizontal={!isTablet}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={!isTablet && styles.horizontalScroll}
        >
          <View style={[styles.numbersGrid, isTablet && styles.numbersGridTablet]}>
            {verseOptions.map((verse) => (
              <TouchableOpacity
                key={verse}
                style={[
                  styles.numberButton,
                  isTablet && styles.numberButtonTablet,
                  selectedVerse === verse && styles.numberButtonSelected,
                ]}
                onPress={() => setSelectedVerse(verse)}
              >
                <Text style={[
                  styles.numberButtonText,
                  isTablet && styles.numberButtonTextTablet,
                  selectedVerse === verse && styles.numberButtonTextSelected,
                ]}>
                  {verse}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={{ height: 40 }} />
    </>
  );

  return (
    <LinearGradient
      colors={FreeShowTheme.gradients.appBackground}
      style={styles.container}
    >
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
            <Ionicons name="book" size={24} color={FreeShowTheme.colors.secondary} />
            <Text style={styles.headerTitle}>Scripture</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                !socketConnected && styles.headerActionButtonDisabled
              ]}
              onPress={() => handleScriptureAction('scripture_previous')}
              disabled={!socketConnected}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerActionButton,
                !socketConnected && styles.headerActionButtonDisabled
              ]}
              onPress={() => handleScriptureAction('scripture_next')}
              disabled={!socketConnected}
            >
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerSendButton,
                (!socketConnected || isSending) && styles.headerSendButtonDisabled
              ]}
              onPress={handleSendToFreeShow}
              disabled={!socketConnected || isSending}
            >
              {isSending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.headerSendButtonText}>Send</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ContentColumn />
        </ScrollView>

        {/* Toast Notification */}
        {toastVisible && (
          <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        )}
      </SafeAreaView>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: FreeShowTheme.spacing.lg,
    paddingVertical: FreeShowTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
    position: 'relative',
  },
  backButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
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
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  connectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: FreeShowTheme.colors.textSecondary + '40',
  },
  connectionIndicatorConnected: {
    backgroundColor: '#2ecc71',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
  },
  headerActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    width: 40,
    height: 40,
    borderRadius: FreeShowTheme.borderRadius.lg,
    elevation: 2,
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerActionButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.textSecondary + '40',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerSendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FreeShowTheme.spacing.sm,
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.lg,
    elevation: 2,
    shadowColor: FreeShowTheme.colors.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerSendButtonDisabled: {
    backgroundColor: FreeShowTheme.colors.textSecondary + '40',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerSendButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '700',
    color: 'white',
  },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: FreeShowTheme.spacing.lg,
  },

  // Current Selection
  currentSelection: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.xl,
    padding: FreeShowTheme.spacing.xl,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.secondary + '30',
  },
  currentSelectionText: {
    fontSize: 28,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
    marginBottom: 6,
  },
  currentSelectionFormat: {
    fontSize: FreeShowTheme.fontSize.sm,
    color: FreeShowTheme.colors.textSecondary,
    fontFamily: 'monospace',
  },

  // Testament Toggle
  testamentToggle: {
    flexDirection: 'row',
    gap: FreeShowTheme.spacing.sm,
    marginBottom: FreeShowTheme.spacing.lg,
  },
  testamentButton: {
    flex: 1,
    paddingVertical: FreeShowTheme.spacing.md,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  testamentButtonActive: {
    backgroundColor: FreeShowTheme.colors.secondary + '20',
    borderColor: FreeShowTheme.colors.secondary,
  },
  testamentButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.textSecondary,
  },
  testamentButtonTextActive: {
    color: FreeShowTheme.colors.secondary,
    fontWeight: '700',
  },

  // Section
  section: {
    marginBottom: FreeShowTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '700',
    color: FreeShowTheme.colors.secondary,
    marginBottom: FreeShowTheme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Category
  categoryContainer: {
    marginBottom: FreeShowTheme.spacing.md,
  },
  categoryHeader: {
    paddingVertical: FreeShowTheme.spacing.sm,
    paddingHorizontal: FreeShowTheme.spacing.md,
    borderRadius: FreeShowTheme.borderRadius.md,
    marginBottom: FreeShowTheme.spacing.sm,
    borderLeftWidth: 4,
  },
  categoryHeaderText: {
    fontSize: FreeShowTheme.fontSize.sm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Books Grid
  booksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.sm,
  },
  bookButton: {
    paddingVertical: 14,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    minWidth: 70,
    alignItems: 'center',
  },
  bookButtonTablet: {
    paddingVertical: 18,
    paddingHorizontal: FreeShowTheme.spacing.xl,
    minWidth: 85,
  },
  bookButtonText: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  bookButtonTextTablet: {
    fontSize: FreeShowTheme.fontSize.lg,
  },

  // Numbers Grid (Chapter & Verse)
  horizontalScroll: {
    paddingRight: FreeShowTheme.spacing.xl,
  },
  numbersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: FreeShowTheme.spacing.sm,
  },
  numbersGridTablet: {
    gap: FreeShowTheme.spacing.md,
  },
  numberButton: {
    width: 60,
    height: 60,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.lg,
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.primaryLighter,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberButtonTablet: {
    width: 70,
    height: 70,
  },
  numberButtonSelected: {
    backgroundColor: FreeShowTheme.colors.secondary,
    borderColor: FreeShowTheme.colors.secondary,
  },
  numberButtonText: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '600',
    color: FreeShowTheme.colors.text,
  },
  numberButtonTextTablet: {
    fontSize: 20,
  },
  numberButtonTextSelected: {
    color: 'white',
    fontWeight: '700',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 100,
    left: '10%',
    right: '10%',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: FreeShowTheme.borderRadius.xl,
    padding: FreeShowTheme.spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: FreeShowTheme.colors.secondary,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  toastText: {
    fontSize: FreeShowTheme.fontSize.lg,
    fontWeight: '700',
    color: FreeShowTheme.colors.text,
  },
});

export default ScriptureScreen;
