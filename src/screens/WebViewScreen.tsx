import React, { useState, useRef } from 'react';
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
import { FreeShowTheme } from '../theme/FreeShowTheme';

interface WebViewScreenProps {
  navigation: any;
  route: any;
}

const WebViewScreen: React.FC<WebViewScreenProps> = ({ navigation, route }) => {
  const { url, title } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const handleForward = () => {
    if (canGoForward && webViewRef.current) {
      webViewRef.current.goForward();
    }
  };

  const handleRefresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
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

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.url}>{url}</Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={20} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
          onPress={handleBack}
          disabled={!canGoBack}
        >
          <Ionicons 
            name="chevron-back" 
            size={20} 
            color={canGoBack ? FreeShowTheme.colors.text : FreeShowTheme.colors.text + '40'} 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
          onPress={handleForward}
          disabled={!canGoForward}
        >
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={canGoForward ? FreeShowTheme.colors.text : FreeShowTheme.colors.text + '40'} 
          />
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity style={styles.navButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={18} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={FreeShowTheme.colors.secondary} />
            <Text style={styles.loadingText}>Loading {title}...</Text>
          </View>
        )}
        
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          style={styles.webView}
          onLoad={handleLoad}
          onError={handleError}
          onNavigationStateChange={handleNavigationStateChange}
          startInLoadingState={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="compatibility"
          allowsFullscreenVideo={true}
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
  url: {
    fontSize: FreeShowTheme.fontSize.xs,
    color: FreeShowTheme.colors.text + '99',
    fontFamily: FreeShowTheme.fonts.system,
    marginTop: 2,
  },
  refreshButton: {
    padding: FreeShowTheme.spacing.sm,
  },
  placeholder: {
    width: 40,
  },
  navigationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FreeShowTheme.spacing.md,
    paddingVertical: FreeShowTheme.spacing.xs,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  navButton: {
    padding: FreeShowTheme.spacing.sm,
    marginRight: FreeShowTheme.spacing.xs,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  spacer: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
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
