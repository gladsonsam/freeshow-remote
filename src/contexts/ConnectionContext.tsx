import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { freeShowService } from '../services/FreeShowService';
import { SettingsService, ConnectionSettings, ConnectionHistory, AppSettings } from '../services/SettingsService';

interface ConnectionContextType {
  isConnected: boolean;
  connectionHost: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError: string | null;
  savedConnectionSettings: ConnectionSettings | null;
  connectionHistory: ConnectionHistory[];
  appSettings: AppSettings;
  connect: (host: string, port?: number) => Promise<boolean>;
  disconnect: () => void;
  checkConnection: () => void;
  loadSavedSettings: () => Promise<void>;
  clearSavedSettings: () => Promise<void>;
  getConnectionHistory: () => Promise<ConnectionHistory[]>;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  freeShowService: typeof freeShowService;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionHost, setConnectionHost] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [savedConnectionSettings, setSavedConnectionSettings] = useState<ConnectionSettings | null>(null);
  const [connectionHistory, setConnectionHistory] = useState<ConnectionHistory[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'dark',
    notifications: true,
    autoReconnect: true,
    connectionTimeout: 10,
  });

  // Load saved settings and attempt auto-reconnect on startup
  useEffect(() => {
    const initializeApp = async () => {
      console.log('Initializing app with saved settings...');
      await loadSavedSettings();
      await loadAppSettings();
      await loadConnectionHistory();
    };
    
    initializeApp();
  }, []);

  // Auto-reconnect when saved settings are loaded (if autoReconnect is enabled)
  useEffect(() => {
    const attemptAutoReconnect = async () => {
      if (
        savedConnectionSettings && 
        appSettings.autoReconnect && 
        !isConnected && 
        connectionStatus === 'disconnected'
      ) {
        console.log('Attempting auto-reconnect to:', savedConnectionSettings.host);
        // Delay slightly to ensure services are ready
        setTimeout(() => {
          connect(savedConnectionSettings.host, savedConnectionSettings.port);
        }, 1500);
      }
    };

    attemptAutoReconnect();
  }, [savedConnectionSettings, appSettings.autoReconnect]);

  const loadSavedSettings = async (): Promise<void> => {
    try {
      const settings = await SettingsService.getConnectionSettings();
      setSavedConnectionSettings(settings);
      console.log('Loaded saved connection settings:', settings);
    } catch (error) {
      console.error('Failed to load saved connection settings:', error);
    }
  };

  const loadAppSettings = async (): Promise<void> => {
    try {
      const settings = await SettingsService.getAppSettings();
      setAppSettings(settings);
      console.log('Loaded app settings:', settings);
    } catch (error) {
      console.error('Failed to load app settings:', error);
    }
  };

  const loadConnectionHistory = async (): Promise<void> => {
    try {
      const history = await SettingsService.getConnectionHistory();
      setConnectionHistory(history);
      console.log('Loaded connection history:', history);
    } catch (error) {
      console.error('Failed to load connection history:', error);
    }
  };

  const clearSavedSettings = async (): Promise<void> => {
    try {
      await SettingsService.clearConnectionSettings();
      setSavedConnectionSettings(null);
      console.log('Cleared saved connection settings');
    } catch (error) {
      console.error('Failed to clear saved connection settings:', error);
    }
  };

  const getConnectionHistory = async (): Promise<ConnectionHistory[]> => {
    try {
      const history = await SettingsService.getConnectionHistory();
      setConnectionHistory(history);
      return history;
    } catch (error) {
      console.error('Failed to get connection history:', error);
      return [];
    }
  };

  const updateAppSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    try {
      await SettingsService.saveAppSettings(newSettings);
      const updatedSettings = { ...appSettings, ...newSettings };
      setAppSettings(updatedSettings);
      console.log('Updated app settings:', updatedSettings);
    } catch (error) {
      console.error('Failed to update app settings:', error);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection status periodically
    const interval = setInterval(checkConnection, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const checkConnection = () => {
    const connected = freeShowService.getConnectionStatus();
    setIsConnected(connected);
    
    if (connected && connectionStatus === 'disconnected') {
      setConnectionStatus('connected');
      setLastError(null);
    } else if (!connected && connectionStatus === 'connected') {
      setConnectionStatus('disconnected');
      setConnectionHost(null);
    }
  };

  const connect = async (host: string, port: number = 5505): Promise<boolean> => {
    setConnectionStatus('connecting');
    setLastError(null);
    
    try {
      const success = await freeShowService.connect(host, port);
      if (success) {
        setIsConnected(true);
        setConnectionHost(host);
        setConnectionStatus('connected');
        
        // Save successful connection settings
        await SettingsService.saveConnectionSettings(host, port, appSettings.autoReconnect);
        setSavedConnectionSettings({ host, port, lastConnected: new Date().toISOString(), autoConnect: appSettings.autoReconnect });
        
        // Refresh connection history
        await loadConnectionHistory();
        
        return true;
      } else {
        setConnectionStatus('error');
        setLastError('Failed to connect to FreeShow');
        return false;
      }
    } catch (error) {
      setConnectionStatus('error');
      setLastError(error instanceof Error ? error.message : 'Connection failed');
      return false;
    }
  };

  const disconnect = () => {
    freeShowService.disconnect();
    setIsConnected(false);
    setConnectionHost(null);
    setConnectionStatus('disconnected');
    setLastError(null);
  };

  const contextValue: ConnectionContextType = {
    isConnected,
    connectionHost,
    connectionStatus,
    lastError,
    savedConnectionSettings,
    connectionHistory,
    appSettings,
    connect,
    disconnect,
    checkConnection,
    loadSavedSettings,
    clearSavedSettings,
    getConnectionHistory,
    updateAppSettings,
    freeShowService,
  };

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
};
