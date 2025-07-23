import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorLogger } from './ErrorLogger';

// Error types for better error handling
export class SettingsStorageError extends Error {
  constructor(message: string, public operation: string, public key?: string, public details?: any) {
    super(message);
    this.name = 'SettingsStorageError';
  }
}

export class SettingsValidationError extends Error {
  constructor(message: string, public field: string, public value?: any) {
    super(message);
    this.name = 'SettingsValidationError';
  }
}

export interface ConnectionSettings {
  host: string;
  lastConnected: string; // ISO date string
  autoConnect: boolean;
  showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  };
}

export interface ConnectionHistory {
  id: string; // Now just the IP address
  host: string; // IP address
  name?: string; // User-friendly name
  lastUsed: string; // ISO date string
  successfulConnections: number;
  showPorts?: { // Interface port configs stored per IP
    remote: number;
    stage: number;
    control: number;
    output: number;
  };
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoReconnect: boolean;
  connectionTimeout: number; // in seconds
  // Add more settings here in the future
}

const STORAGE_KEYS = {
  CONNECTION_SETTINGS: '@freeshow_remote:connection_settings',
  CONNECTION_HISTORY: '@freeshow_remote:connection_history',
  APP_SETTINGS: '@freeshow_remote:app_settings',
} as const;

export class SettingsService {
  // Validation helpers
  private static validateHost(host: string): void {
    if (!host || typeof host !== 'string') {
      throw new SettingsValidationError('Host is required and must be a string', 'host', host);
    }
    
    // Basic IP validation (IPv4)
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(host)) {
      throw new SettingsValidationError('Host must be a valid IPv4 address', 'host', host);
    }
  }

  private static validatePort(port: number): void {
    if (typeof port !== 'number' || port <= 0 || port > 65535) {
      throw new SettingsValidationError('Port must be a number between 1 and 65535', 'port', port);
    }
  }

  private static validateShowPorts(showPorts: any): void {
    if (!showPorts || typeof showPorts !== 'object') {
      throw new SettingsValidationError('ShowPorts must be an object', 'showPorts', showPorts);
    }
    
    const requiredPorts = ['remote', 'stage', 'control', 'output'];
    for (const portName of requiredPorts) {
      if (!(portName in showPorts)) {
        throw new SettingsValidationError(`Missing required port: ${portName}`, 'showPorts', showPorts);
      }
      this.validatePort(showPorts[portName]);
    }
  }

  // Connection Settings with comprehensive error handling
  static async saveConnectionSettings(
    host: string, 
    port: number = 5505,
    autoConnect: boolean = true,
    showPorts?: {
      remote: number;
      stage: number;
      control: number;
      output: number;
    }
  ): Promise<void> {
    try {
      // Validate inputs
      this.validateHost(host);
      this.validatePort(port);
      
      const defaultShowPorts = {
        remote: 5510,
        stage: 5511,
        control: 5512,
        output: 5513,
      };

      if (showPorts) {
        this.validateShowPorts(showPorts);
      }

      const connectionSettings: ConnectionSettings = {
        host,
        lastConnected: new Date().toISOString(),
        autoConnect,
        showPorts: showPorts || defaultShowPorts,
      };

      const settingsJson = JSON.stringify(connectionSettings);
      await AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_SETTINGS, settingsJson);
      
      // Also save to connection history
      await this.addToConnectionHistory(host, port, undefined, showPorts);
      
      ErrorLogger.info('Connection settings saved', 'SettingsService', { connectionSettings });
    } catch (error) {
      ErrorLogger.error('Failed to save connection settings', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof SettingsValidationError) {
        throw error;
      }
      
      throw new SettingsStorageError(
        `Failed to save connection settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'save',
        STORAGE_KEYS.CONNECTION_SETTINGS,
        error
      );
    }
  }

  static async getConnectionSettings(): Promise<ConnectionSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_SETTINGS);
      if (settings) {
        const parsed = JSON.parse(settings);
        
        // Validate the loaded settings
        if (!parsed.host || !parsed.lastConnected) {
          throw new SettingsValidationError('Invalid connection settings format', 'settings', parsed);
        }
        
        ErrorLogger.info('Loaded connection settings', 'SettingsService', { parsed });
        return parsed;
      }
      return null;
    } catch (error) {
      ErrorLogger.error('Failed to load connection settings', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof SyntaxError) {
        // Corrupted JSON data
        ErrorLogger.warn('Corrupted connection settings detected, clearing...', 'SettingsService');
        await this.clearConnectionSettings();
        return null;
      }
      
      if (error instanceof SettingsValidationError) {
        throw error;
      }
      
      throw new SettingsStorageError(
        `Failed to load connection settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'load',
        STORAGE_KEYS.CONNECTION_SETTINGS,
        error
      );
    }
  }

  static async clearConnectionSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONNECTION_SETTINGS);
      ErrorLogger.info('Connection settings cleared', 'SettingsService');
    } catch (error) {
      ErrorLogger.error('Failed to clear connection settings', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      throw new SettingsStorageError(
        'Failed to clear connection settings',
        'clear',
        STORAGE_KEYS.CONNECTION_SETTINGS,
        error
      );
    }
  }

  // Connection History with error handling
  static async addToConnectionHistory(
    host: string, 
    port: number = 5505, 
    name?: string, 
    showPorts?: {
      remote: number;
      stage: number;
      control: number;
      output: number;
    }
  ): Promise<void> {
    try {
      // Validate inputs
      this.validateHost(host);
      this.validatePort(port);
      
      if (showPorts) {
        this.validateShowPorts(showPorts);
      }
      
      const history = await this.getConnectionHistory();
      const id = host; // Use IP address as the unique identifier
      const now = new Date().toISOString();
      
      // Find existing entry by IP address
      const existingIndex = history.findIndex(item => item.id === id);
      
      if (existingIndex >= 0) {
        // Update existing entry, keeping or updating interface ports
        history[existingIndex] = {
          ...history[existingIndex],
          lastUsed: now,
          successfulConnections: history[existingIndex].successfulConnections + 1,
          name: name || history[existingIndex].name,
          showPorts: showPorts || history[existingIndex].showPorts || {
            remote: 5510,
            stage: 5511,
            control: 5512,
            output: 5513,
          },
        };
      } else {
        // Add new entry
        history.unshift({
          id,
          host,
          name,
          lastUsed: now,
          successfulConnections: 1,
          showPorts: showPorts || {
            remote: 5510,
            stage: 5511,
            control: 5512,
            output: 5513,
          },
        });
      }
      
      // Keep only last 10 connections
      const trimmedHistory = history.slice(0, 10);
      
      const historyJson = JSON.stringify(trimmedHistory);
      await AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_HISTORY, historyJson);
      
      ErrorLogger.info('Connection history updated (IP-based, no port)', 'SettingsService', { trimmedHistory });
    } catch (error) {
      ErrorLogger.error('Failed to update connection history', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof SettingsValidationError) {
        throw error;
      }
      
      throw new SettingsStorageError(
        'Failed to update connection history',
        'update',
        STORAGE_KEYS.CONNECTION_HISTORY,
        error
      );
    }
  }

  static async getConnectionHistory(): Promise<ConnectionHistory[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_HISTORY);
      if (history) {
        const parsed = JSON.parse(history);
        
        // Validate the loaded history
        if (!Array.isArray(parsed)) {
          throw new SettingsValidationError('Connection history must be an array', 'history', parsed);
        }
        
        return parsed;
      }
      return [];
    } catch (error) {
      ErrorLogger.error('Failed to load connection history', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof SyntaxError) {
        // Corrupted JSON data
        ErrorLogger.warn('Corrupted connection history detected, clearing...', 'SettingsService');
        await this.clearConnectionHistory();
        return [];
      }
      
      if (error instanceof SettingsValidationError) {
        throw error;
      }
      
      throw new SettingsStorageError(
        'Failed to load connection history',
        'load',
        STORAGE_KEYS.CONNECTION_HISTORY,
        error
      );
    }
  }

  static async removeFromConnectionHistory(id: string): Promise<void> {
    try {
      if (!id || typeof id !== 'string') {
        throw new SettingsValidationError('ID is required and must be a string', 'id', id);
      }
      
      const history = await this.getConnectionHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      
      const historyJson = JSON.stringify(filteredHistory);
      await AsyncStorage.setItem(STORAGE_KEYS.CONNECTION_HISTORY, historyJson);
      
      ErrorLogger.info('Connection removed from history', 'SettingsService', { id });
    } catch (error) {
      ErrorLogger.error('Failed to remove from connection history', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof SettingsValidationError) {
        throw error;
      }
      
      throw new SettingsStorageError(
        'Failed to remove from connection history',
        'remove',
        STORAGE_KEYS.CONNECTION_HISTORY,
        error
      );
    }
  }

  static async clearConnectionHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONNECTION_HISTORY);
      ErrorLogger.info('Connection history cleared', 'SettingsService');
    } catch (error) {
      ErrorLogger.error('Failed to clear connection history', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      throw new SettingsStorageError(
        'Failed to clear connection history',
        'clear',
        STORAGE_KEYS.CONNECTION_HISTORY,
        error
      );
    }
  }

  // App Settings with error handling
  static async saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      if (!settings || typeof settings !== 'object') {
        throw new SettingsValidationError('Settings must be an object', 'settings', settings);
      }
      
      // Validate individual settings
      if (settings.theme && !['light', 'dark', 'auto'].includes(settings.theme)) {
        throw new SettingsValidationError('Theme must be light, dark, or auto', 'theme', settings.theme);
      }
      
      if (settings.connectionTimeout && (typeof settings.connectionTimeout !== 'number' || settings.connectionTimeout <= 0)) {
        throw new SettingsValidationError('Connection timeout must be a positive number', 'connectionTimeout', settings.connectionTimeout);
      }
      
      const currentSettings = await this.getAppSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      const settingsJson = JSON.stringify(updatedSettings);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, settingsJson);
      
      ErrorLogger.info('App settings saved', 'SettingsService', { updatedSettings });
    } catch (error) {
      ErrorLogger.error('Failed to save app settings', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof SettingsValidationError) {
        throw error;
      }
      
      throw new SettingsStorageError(
        'Failed to save app settings',
        'save',
        STORAGE_KEYS.APP_SETTINGS,
        error
      );
    }
  }

  static async getAppSettings(): Promise<AppSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      const defaults: AppSettings = {
        theme: 'dark',
        notifications: true,
        autoReconnect: true,
        connectionTimeout: 10,
      };
      
      if (settings) {
        const parsed = JSON.parse(settings);
        
        // Validate and merge with defaults
        const validatedSettings = {
          ...defaults,
          ...parsed,
        };
        
        // Additional validation
        if (!['light', 'dark', 'auto'].includes(validatedSettings.theme)) {
          validatedSettings.theme = 'dark';
        }
        
        if (typeof validatedSettings.connectionTimeout !== 'number' || validatedSettings.connectionTimeout <= 0) {
          validatedSettings.connectionTimeout = 10;
        }
        
        return validatedSettings;
      }
      
      return defaults;
    } catch (error) {
      ErrorLogger.error('Failed to load app settings', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      
      if (error instanceof SyntaxError) {
        // Corrupted JSON data, return defaults
        ErrorLogger.warn('Corrupted app settings detected, using defaults...', 'SettingsService');
        return {
          theme: 'dark',
          notifications: true,
          autoReconnect: true,
          connectionTimeout: 10,
        };
      }
      
      throw new SettingsStorageError(
        'Failed to load app settings',
        'load',
        STORAGE_KEYS.APP_SETTINGS,
        error
      );
    }
  }

  static async clearAppSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS);
      ErrorLogger.info('App settings cleared', 'SettingsService');
    } catch (error) {
      ErrorLogger.error('Failed to clear app settings', 'SettingsService', error instanceof Error ? error : new Error(String(error)));
      throw new SettingsStorageError(
        'Failed to clear app settings',
        'clear',
        STORAGE_KEYS.APP_SETTINGS,
        error
      );
    }
  }

  // Utility methods with error handling
  static async clearAllSettings(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.CONNECTION_SETTINGS,
        STORAGE_KEYS.CONNECTION_HISTORY,
        STORAGE_KEYS.APP_SETTINGS,
      ]);
      console.log('All settings cleared');
    } catch (error) {
      console.error('Failed to clear all settings:', error);
      throw new SettingsStorageError(
        'Failed to clear all settings',
        'clearAll',
        undefined,
        error
      );
    }
  }

  static async getAllStorageKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      throw new SettingsStorageError(
        'Failed to get storage keys',
        'getAllKeys',
        undefined,
        error
      );
    }
  }

  static async getStorageInfo(): Promise<{
    keys: readonly string[];
    totalSize: number;
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        } catch (itemError) {
          console.warn(`Failed to get size for key ${key}:`, itemError);
        }
      }
      
      return { keys, totalSize };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw new SettingsStorageError(
        'Failed to get storage info',
        'getStorageInfo',
        undefined,
        error
      );
    }
  }

  // Health check for storage
  static async healthCheck(): Promise<boolean> {
    try {
      const testKey = '@freeshow_remote:health_check';
      const testValue = Date.now().toString();
      
      // Test write
      await AsyncStorage.setItem(testKey, testValue);
      
      // Test read
      const readValue = await AsyncStorage.getItem(testKey);
      
      // Test delete
      await AsyncStorage.removeItem(testKey);
      
      return readValue === testValue;
    } catch (error) {
      console.error('Storage health check failed:', error);
      return false;
    }
  }
}
