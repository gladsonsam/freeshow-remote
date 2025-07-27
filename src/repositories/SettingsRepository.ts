import { IStorageRepository, StorageKeys } from './IStorageRepository';
import { storageRepository } from './AsyncStorageRepository';
import { ErrorLogger } from '../services/ErrorLogger';
import { configService } from '../config/AppConfig';

// Types for settings domain
export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoReconnect: boolean;
  autoLaunchInterface: 'none' | 'remote' | 'stage' | 'control' | 'output' | 'api';
  connectionTimeout: number; // in seconds
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

/**
 * Repository for managing application settings and user preferences
 * Abstracts the underlying storage implementation
 */
export class SettingsRepository {
  private readonly logContext = 'SettingsRepository';
  private storage: IStorageRepository;

  constructor(storage: IStorageRepository = storageRepository) {
    this.storage = storage;
  }

  // App Settings
  async getAppSettings(): Promise<AppSettings> {
    try {
      const settings = await this.storage.getObject<AppSettings>(StorageKeys.APP_SETTINGS);
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings: AppSettings = {
          theme: 'dark',
          notifications: true,
          autoReconnect: true,
          autoLaunchInterface: 'none',
          connectionTimeout: 10,
        };
        await this.setAppSettings(defaultSettings);
        return defaultSettings;
      }
      return settings;
    } catch (error) {
      ErrorLogger.error('Failed to get app settings', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async setAppSettings(settings: AppSettings): Promise<void> {
    try {
      await this.storage.setObject(StorageKeys.APP_SETTINGS, settings);
      ErrorLogger.debug('App settings updated', this.logContext, { settings });
    } catch (error) {
      ErrorLogger.error('Failed to set app settings', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateAppSettings(partialSettings: Partial<AppSettings>): Promise<AppSettings> {
    try {
      const currentSettings = await this.getAppSettings();
      const updatedSettings = { ...currentSettings, ...partialSettings };
      await this.setAppSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      ErrorLogger.error('Failed to update app settings', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Connection History
  async getConnectionHistory(): Promise<ConnectionHistory[]> {
    try {
      const history = await this.storage.getObject<ConnectionHistory[]>(StorageKeys.CONNECTION_HISTORY);
      return history || [];
    } catch (error) {
      ErrorLogger.error('Failed to get connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async setConnectionHistory(history: ConnectionHistory[]): Promise<void> {
    try {
      await this.storage.setObject(StorageKeys.CONNECTION_HISTORY, history);
      ErrorLogger.debug(`Updated connection history with ${history.length} entries`, this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to set connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async addToConnectionHistory(
    host: string,
    port: number = 5505,
    name?: string,
    showPorts?: { remote: number; stage: number; control: number; output: number }
  ): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const existingIndex = history.findIndex(item => item.host === host);
      
      if (existingIndex >= 0) {
        // Update existing entry
        history[existingIndex] = {
          ...history[existingIndex],
          lastUsed: new Date().toISOString(),
          successfulConnections: history[existingIndex].successfulConnections + 1,
          name: name || history[existingIndex].name,
          showPorts: showPorts || history[existingIndex].showPorts,
        };
      } else {
        // Add new entry
        const newEntry: ConnectionHistory = {
          id: host,
          host,
          name,
          lastUsed: new Date().toISOString(),
          successfulConnections: 1,
          showPorts,
        };
        history.push(newEntry);
      }

      // Keep only the most recent connections based on config
      const maxConnections = configService.getStorageConfig().maxConnectionHistory;
      const sortedHistory = history
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, maxConnections);

      await this.setConnectionHistory(sortedHistory);
      ErrorLogger.info('Added to connection history', this.logContext, { 
        host, 
        port, 
        totalConnections: sortedHistory.length,
        maxConnections 
      });
    } catch (error) {
      ErrorLogger.error('Failed to add to connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async removeFromConnectionHistory(id: string): Promise<void> {
    try {
      const history = await this.getConnectionHistory();
      const filteredHistory = history.filter(item => item.id !== id);
      await this.setConnectionHistory(filteredHistory);
      ErrorLogger.info('Removed from connection history', this.logContext, { id });
    } catch (error) {
      ErrorLogger.error('Failed to remove from connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async clearConnectionHistory(): Promise<void> {
    try {
      await this.setConnectionHistory([]);
      ErrorLogger.info('Cleared connection history', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear connection history', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Last connection for auto-reconnect
  async getLastConnection(): Promise<ConnectionHistory | null> {
    try {
      const history = await this.getConnectionHistory();
      if (history.length === 0) {
        return null;
      }
      // Return the most recently used connection
      return history.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())[0];
    } catch (error) {
      ErrorLogger.error('Failed to get last connection', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  // Cleanup and maintenance
  async clearAllData(): Promise<void> {
    try {
      await this.storage.removeItem(StorageKeys.APP_SETTINGS);
      await this.storage.removeItem(StorageKeys.CONNECTION_HISTORY);
      await this.storage.removeItem(StorageKeys.USER_PREFERENCES);
      ErrorLogger.info('Cleared all settings data', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear all data', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}

// Export singleton instance
export const settingsRepository = new SettingsRepository();
