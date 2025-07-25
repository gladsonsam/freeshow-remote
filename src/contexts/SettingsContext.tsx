// Settings Context - Handles app settings and connection history

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { settingsRepository, AppSettings, ConnectionHistory } from '../repositories';
import { ErrorLogger } from '../services/ErrorLogger';

export interface SettingsState {
  appSettings: AppSettings;
  connectionHistory: ConnectionHistory[];
  isLoading: boolean;
  error: string | null;
}

export interface SettingsActions {
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  refreshConnectionHistory: () => Promise<void>;
  removeFromHistory: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  getLastConnection: () => Promise<ConnectionHistory | null>;
  clearError: () => void;
}

export interface SettingsContextType {
  state: SettingsState;
  actions: SettingsActions;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
  autoLoad?: boolean; // Whether to load settings automatically on mount
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ 
  children, 
  autoLoad = true 
}) => {
  const [state, setState] = useState<SettingsState>({
    appSettings: {
      theme: 'dark',
      notifications: true,
      autoReconnect: true,
      autoLaunchInterface: 'none',
      connectionTimeout: 10,
    },
    connectionHistory: [],
    isLoading: autoLoad,
    error: null,
  });

  const logContext = 'SettingsProvider';

  // Load initial data
  useEffect(() => {
    if (autoLoad) {
      loadAllData();
    }
  }, [autoLoad]);

  const loadAllData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const [appSettings, connectionHistory] = await Promise.all([
        settingsRepository.getAppSettings(),
        settingsRepository.getConnectionHistory(),
      ]);

      setState(prev => ({
        ...prev,
        appSettings,
        connectionHistory,
        isLoading: false,
      }));

      ErrorLogger.debug('Settings and history loaded', logContext, {
        settingsLoaded: !!appSettings,
        historyCount: connectionHistory.length,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load settings';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));

      ErrorLogger.error('Failed to load settings data', logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }, [logContext]);

  const updateAppSettings = useCallback(async (partialSettings: Partial<AppSettings>): Promise<void> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const updatedSettings = await settingsRepository.updateAppSettings(partialSettings);
      
      setState(prev => ({
        ...prev,
        appSettings: updatedSettings,
      }));

      ErrorLogger.info('App settings updated', logContext, partialSettings);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      ErrorLogger.error('Failed to update app settings', logContext, error instanceof Error ? error : new Error(String(error)));
      throw error; // Re-throw for component handling
    }
  }, [logContext]);

  const refreshConnectionHistory = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const connectionHistory = await settingsRepository.getConnectionHistory();
      
      setState(prev => ({
        ...prev,
        connectionHistory,
      }));

      ErrorLogger.debug('Connection history refreshed', logContext, { count: connectionHistory.length });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh history';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      ErrorLogger.error('Failed to refresh connection history', logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }, [logContext]);

  const removeFromHistory = useCallback(async (id: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      await settingsRepository.removeFromConnectionHistory(id);
      
      // Update local state
      setState(prev => ({
        ...prev,
        connectionHistory: prev.connectionHistory.filter(item => item.id !== id),
      }));

      ErrorLogger.info('Removed connection from history', logContext, { id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove from history';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      ErrorLogger.error('Failed to remove from connection history', logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [logContext]);

  const clearAllHistory = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      await settingsRepository.clearConnectionHistory();
      
      // Update local state
      setState(prev => ({
        ...prev,
        connectionHistory: [],
      }));

      ErrorLogger.info('Cleared all connection history', logContext);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear history';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      ErrorLogger.error('Failed to clear connection history', logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [logContext]);

  const getLastConnection = useCallback(async (): Promise<ConnectionHistory | null> => {
    try {
      return await settingsRepository.getLastConnection();
    } catch (error) {
      ErrorLogger.error('Failed to get last connection', logContext, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }, [logContext]);

  const clearError = useCallback((): void => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const actions: SettingsActions = {
    updateAppSettings,
    refreshConnectionHistory,
    removeFromHistory,
    clearAllHistory,
    getLastConnection,
    clearError,
  };

  const contextValue: SettingsContextType = {
    state,
    actions,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Convenience hooks for specific parts of the context
export const useAppSettings = (): [AppSettings, (settings: Partial<AppSettings>) => Promise<void>] => {
  const { state, actions } = useSettings();
  return [state.appSettings, actions.updateAppSettings];
};

export const useConnectionHistory = (): [
  ConnectionHistory[],
  {
    refresh: () => Promise<void>;
    remove: (id: string) => Promise<void>;
    clear: () => Promise<void>;
    getLast: () => Promise<ConnectionHistory | null>;
  }
] => {
  const { state, actions } = useSettings();
  return [
    state.connectionHistory,
    {
      refresh: actions.refreshConnectionHistory,
      remove: actions.removeFromHistory,
      clear: actions.clearAllHistory,
      getLast: actions.getLastConnection,
    }
  ];
};

export const useSettingsError = (): [string | null, () => void] => {
  const { state, actions } = useSettings();
  return [state.error, actions.clearError];
};
