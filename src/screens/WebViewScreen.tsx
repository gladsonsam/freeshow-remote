import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import ShowSwitcher from '../components/ShowSwitcher';
import { useConnection } from '../contexts/ConnectionContext';

interface WebViewScreenProps {
  navigation: any;
  route: any;
}

const WebViewScreen: React.FC<WebViewScreenProps> = ({ navigation, route }) => {
  const { url, title, showId } = route.params || {};
  const { connectionHost } = useConnection();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState<ScreenOrientation.Orientation>(ScreenOrientation.Orientation.PORTRAIT_UP);
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    // Get current orientation on mount
    ScreenOrientation.getOrientationAsync().then(setCurrentOrientation);

    // Listen for orientation changes
    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      setCurrentOrientation(event.orientationInfo.orientation);
    });

    return () => {
      // Reset to default when leaving
      ScreenOrientation.unlockAsync();
      subscription?.remove();
    };
  }, []);

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleToggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleError = () => {
    setError('Failed to load the interface. Please check your connection and try again.');
    setLoading(false);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleRotateScreen = async () => {
    try {
      const isLandscape = currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                          currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      
      if (isLandscape) {
        // Switch to portrait
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      } else {
        // Switch to landscape
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE_LEFT);
      }
    } catch (error) {
      console.error('Failed to rotate screen:', error);
      Alert.alert('Error', 'Failed to rotate screen');
    }
  };

  const handleShowSelect = (show: any) => {
    if (!connectionHost) {
      Alert.alert('Error', 'No connection host available');
      return;
    }

    const newUrl = `http://${connectionHost}:${show.port}`;
    
    // Navigate to the new show interface
    navigation.setParams({
      url: newUrl,
      title: show.title,
      showId: show.id,
    });

    // Reload the WebView with the new URL
    if (webViewRef.current) {
      setLoading(true);
      setError(null);
    }
  };

  const getRotationIcon = () => {
    const isLandscape = currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                        currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
    return isLandscape ? 'phone-portrait' : 'phone-landscape';
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={FreeShowTheme.colors.text + '66'} />
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => {
            setError(null);
            setLoading(true);
          }}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isFullScreen && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>
          
          {connectionHost && showId ? (
            <ShowSwitcher
              currentTitle={title}
              currentShowId={showId}
              connectionHost={connectionHost}
              onShowSelect={handleShowSelect}
            />
          ) : (
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{title}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color={FreeShowTheme.colors.text} />
          </TouchableOpacity>

          {showId === 'output' && (
            <TouchableOpacity style={styles.rotationButton} onPress={handleRotateScreen}>
              <Ionicons name={getRotationIcon()} size={20} color={FreeShowTheme.colors.text} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.fullScreenButton} onPress={handleToggleFullScreen}>
            <Ionicons 
              name={isFullScreen ? "contract" : "expand"} 
              size={20} 
              color={FreeShowTheme.colors.text} 
            />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
            <Text style={styles.loadingText}>Loading {title}...</Text>
          </View>
        )}

        {isFullScreen && (
          <TouchableOpacity style={styles.exitFullScreenButton} onPress={handleToggleFullScreen}>
            <Ionicons name="contract" size={24} color="white" />
          </TouchableOpacity>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          onLoad={handleLoad}
          onError={handleError}
          startInLoadingState={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          allowsFullscreenVideo={true}
          key={url} // Force re-render when URL changes
        />
      </View>
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
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.sm,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  closeButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: FreeShowTheme.spacing.md,
  },
  title: {
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  refreshButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  rotationButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  fullScreenButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  exitFullScreenButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    padding: FreeShowTheme.spacing.md,
    zIndex: 1000,
  },
  webView: {
    flex: 1,
    backgroundColor: FreeShowTheme.colors.primary,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FreeShowTheme.colors.primary,
    zIndex: 1,
  },
  loadingText: {
    marginTop: FreeShowTheme.spacing.md,
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text,
    fontFamily: FreeShowTheme.fonts.system,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: FreeShowTheme.spacing.xl,
  },
  errorTitle: {
    fontSize: FreeShowTheme.fontSize.xl,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
    marginTop: FreeShowTheme.spacing.lg,
    marginBottom: FreeShowTheme.spacing.sm,
    fontFamily: FreeShowTheme.fonts.system,
  },
  errorText: {
    fontSize: FreeShowTheme.fontSize.md,
    color: FreeShowTheme.colors.text + '99',
    textAlign: 'center',
    marginBottom: FreeShowTheme.spacing.xl,
    fontFamily: FreeShowTheme.fonts.system,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.secondary,
    paddingVertical: FreeShowTheme.spacing.md,
    paddingHorizontal: FreeShowTheme.spacing.lg,
    borderRadius: FreeShowTheme.borderRadius.lg,
    gap: FreeShowTheme.spacing.sm,
  },
  buttonText: {
    color: 'white',
    fontSize: FreeShowTheme.fontSize.md,
    fontWeight: '600',
    fontFamily: FreeShowTheme.fonts.system,
  },
});

export default WebViewScreen;
