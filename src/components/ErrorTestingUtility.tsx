import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FreeShowTheme } from '../theme/FreeShowTheme';
import { useErrorHandler } from './ErrorBoundary';
import { getDefaultFreeShowService } from '../services/DIContainer';
import { 
  FreeShowConnectionError, 
  FreeShowTimeoutError, 
  FreeShowNetworkError 
} from '../services/FreeShowServiceV2';
import { 
  settingsRepository,
  AppSettings 
} from '../repositories';

interface ErrorInfo {
  timestamp: Date;
  type: string;
  message: string;
  component?: string;
  stack?: string;
}

export const ErrorTestingUtility: React.FC = () => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isVisible, setIsVisible] = useState(__DEV__);
  const handleError = useErrorHandler();

  useEffect(() => {
    // Global error listener for uncaught errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      logError({
        timestamp: new Date(),
        type: 'Console Error',
        message: errorMessage,
        component: 'Global',
      });
      originalConsoleError(...args);
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  const logError = (errorInfo: ErrorInfo) => {
    setErrors(prev => [errorInfo, ...prev.slice(0, 49)]); // Keep last 50 errors
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const testConnectionError = async () => {
    try {
      const freeShowService = getDefaultFreeShowService();
      await freeShowService.connect('invalid.ip.address', 9999);
    } catch (error) {
      const errorInfo: ErrorInfo = {
        timestamp: new Date(),
        type: error instanceof FreeShowConnectionError ? 'FreeShow Connection Error' : 'Unknown Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        component: 'FreeShowService',
        stack: error instanceof Error ? error.stack : undefined,
      };
      logError(errorInfo);
      handleError(error as Error, 'Connection Test');
    }
  };

  const testValidationError = async () => {
    try {
      // Test validation by trying to add invalid connection data
      await settingsRepository.addToConnectionHistory('', -1);
    } catch (error) {
      const errorInfo: ErrorInfo = {
        timestamp: new Date(),
        type: 'Repository Validation Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        component: 'SettingsRepository',
        stack: error instanceof Error ? error.stack : undefined,
      };
      logError(errorInfo);
      handleError(error as Error, 'Validation Test');
    }
  };

  const testComponentError = () => {
    try {
      // Simulate a component error
      throw new Error('Simulated component error for testing');
    } catch (error) {
      const errorInfo: ErrorInfo = {
        timestamp: new Date(),
        type: 'Component Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        component: 'ErrorTestingUtility',
        stack: error instanceof Error ? error.stack : undefined,
      };
      logError(errorInfo);
      handleError(error as Error, 'Component Test');
    }
  };

  const testAsyncError = async () => {
    try {
      // Simulate an async error
      await new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Simulated async error')), 100);
      });
    } catch (error) {
      const errorInfo: ErrorInfo = {
        timestamp: new Date(),
        type: 'Async Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        component: 'ErrorTestingUtility',
        stack: error instanceof Error ? error.stack : undefined,
      };
      logError(errorInfo);
      handleError(error as Error, 'Async Test');
    }
  };

  const exportErrors = () => {
    const errorReport = {
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0', // You can get this from package.json
      platform: 'React Native',
      errors: errors.map(error => ({
        ...error,
        timestamp: error.timestamp.toISOString(),
      })),
    };

    console.log('Error Report:', JSON.stringify(errorReport, null, 2));
    Alert.alert(
      'Error Report Generated',
      `Generated report with ${errors.length} errors. Check console for details.`
    );
  };

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsVisible(true)}
      >
        <Ionicons name="bug-outline" size={16} color={FreeShowTheme.colors.secondary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Error Testing & Monitoring</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setIsVisible(false)}
        >
          <Ionicons name="close" size={20} color={FreeShowTheme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.testButtons}>
        <TouchableOpacity style={styles.testButton} onPress={testConnectionError}>
          <Text style={styles.testButtonText}>Test Connection Error</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testValidationError}>
          <Text style={styles.testButtonText}>Test Validation Error</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testComponentError}>
          <Text style={styles.testButtonText}>Test Component Error</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.testButton} onPress={testAsyncError}>
          <Text style={styles.testButtonText}>Test Async Error</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={clearErrors}>
          <Ionicons name="trash-outline" size={16} color={FreeShowTheme.colors.text} />
          <Text style={styles.controlButtonText}>Clear ({errors.length})</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={exportErrors}>
          <Ionicons name="download-outline" size={16} color={FreeShowTheme.colors.text} />
          <Text style={styles.controlButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.errorList}>
        {errors.length === 0 ? (
          <Text style={styles.noErrors}>No errors logged yet</Text>
        ) : (
          errors.map((error, index) => (
            <View key={index} style={styles.errorItem}>
              <View style={styles.errorHeader}>
                <Text style={styles.errorType}>{error.type}</Text>
                <Text style={styles.errorTime}>
                  {error.timestamp.toLocaleTimeString()}
                </Text>
              </View>
              
              <Text style={styles.errorMessage}>{error.message}</Text>
              
              {error.component && (
                <Text style={styles.errorComponent}>Component: {error.component}</Text>
              )}
              
              {__DEV__ && error.stack && (
                <TouchableOpacity
                  onPress={() => console.log('Stack trace:', error.stack)}
                >
                  <Text style={styles.stackTrace}>📋 Tap to see stack trace</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.secondary,
    zIndex: 1000,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: FreeShowTheme.colors.primaryDarkest,
    borderTopWidth: 2,
    borderTopColor: FreeShowTheme.colors.secondary,
    maxHeight: '50%',
    zIndex: 999,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  testButton: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: FreeShowTheme.colors.primaryLighter,
  },
  testButtonText: {
    fontSize: 12,
    color: FreeShowTheme.colors.text,
  },
  controls: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: FreeShowTheme.colors.primaryLighter,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  controlButtonText: {
    fontSize: 12,
    color: FreeShowTheme.colors.text,
  },
  errorList: {
    flex: 1,
    padding: 8,
  },
  noErrors: {
    textAlign: 'center',
    color: FreeShowTheme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 20,
  },
  errorItem: {
    backgroundColor: FreeShowTheme.colors.primaryDarker,
    padding: 8,
    marginBottom: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: FreeShowTheme.colors.disconnected,
  },
  errorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  errorType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: FreeShowTheme.colors.secondary,
  },
  errorTime: {
    fontSize: 10,
    color: FreeShowTheme.colors.textSecondary,
  },
  errorMessage: {
    fontSize: 12,
    color: FreeShowTheme.colors.text,
    marginBottom: 4,
  },
  errorComponent: {
    fontSize: 10,
    color: FreeShowTheme.colors.textSecondary,
    marginBottom: 4,
  },
  stackTrace: {
    fontSize: 10,
    color: FreeShowTheme.colors.secondary,
    textDecorationLine: 'underline',
  },
});
