import AsyncStorage from '@react-native-async-storage/async-storage';

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
  // Connection Settings
  static async saveConnectionSettings(
    host: string, 
    port: number = 5505, // Keep parameter for backward compatibility but don't store it
    autoConnect: boolean = true,
    showPorts?: {
      remote: number;
      stage: number;
      control: number;
      output: number;
    }
  ): Promise<void> {
    try {
      const connectionSettings: ConnectionSettings = {
        host,
        lastConnected: new Date().toISOString(),
        autoConnect,
        showPorts: showPorts || {
          remote: 5510,
          stage: 5511,
          control: 5512,
          output: 5513,
        },
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONNECTION_SETTINGS, 
        JSON.stringify(connectionSettings)
      );
      
      // Also save to connection history
      await this.addToConnectionHistory(host, port, undefined, showPorts);
      
      console.log('Connection settings saved:', connectionSettings);
    } catch (error) {
      console.error('Failed to save connection settings:', error);
    }
  }

  static async getConnectionSettings(): Promise<ConnectionSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_SETTINGS);
      if (settings) {
        const parsed = JSON.parse(settings);
        console.log('Loaded connection settings:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to load connection settings:', error);
    }
    return null;
  }

  static async clearConnectionSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONNECTION_SETTINGS);
      console.log('Connection settings cleared');
    } catch (error) {
      console.error('Failed to clear connection settings:', error);
    }
  }

  // Connection History
  static async addToConnectionHistory(host: string, port: number = 5505, name?: string, showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  }): Promise<void> {
    try {
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
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONNECTION_HISTORY,
        JSON.stringify(trimmedHistory)
      );
      
      console.log('Connection history updated (IP-based, no port):', trimmedHistory);
    } catch (error) {
      console.error('Failed to update connection history:', error);
    }
  }

  static async getConnectionHistory(): Promise<ConnectionHistory[]> {
    try {
      const history = await AsyncStorage.getItem(STORAGE_KEYS.CONNECTION_HISTORY);
      if (history) {
        return JSON.parse(history);
      }
    } catch (error) {
      console.error('Failed to load connection history:', error);
    }
    return [];
  }

  static async removeFromConnectionHistory(id: string): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.CONNECTION_HISTORY,
        JSON.stringify(filteredHistory)
      );
      
      console.log('Connection removed from history:', id);
    } catch (error) {
      console.error('Failed to remove from connection history:', error);
    }
  }

  static async clearConnectionHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CONNECTION_HISTORY);
      console.log('Connection history cleared');
    } catch (error) {
      console.error('Failed to clear connection history:', error);
    }
  }

  // App Settings
  static async saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getAppSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
      await AsyncStorage.setItem(
        STORAGE_KEYS.APP_SETTINGS,
        JSON.stringify(updatedSettings)
      );
      
      console.log('App settings saved:', updatedSettings);
    } catch (error) {
      console.error('Failed to save app settings:', error);
    }
  }

  static async getAppSettings(): Promise<AppSettings> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (settings) {
        const parsed = JSON.parse(settings);
        // Ensure we have defaults for any missing settings
        return {
          theme: 'dark',
          notifications: true,
          autoReconnect: true,
          connectionTimeout: 10,
          ...parsed,
        };
      }
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
    
    // Return defaults
    return {
      theme: 'dark',
      notifications: true,
      autoReconnect: true,
      connectionTimeout: 10,
    };
  }

  static async clearAppSettings(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS);
      console.log('App settings cleared');
    } catch (error) {
      console.error('Failed to clear app settings:', error);
    }
  }

  // Utility methods
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
    }
  }

  static async getAllStorageKeys(): Promise<readonly string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      return [];
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
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return { keys, totalSize };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { keys: [], totalSize: 0 };
    }
  }
}
