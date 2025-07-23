import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { freeShowService } from '../services/FreeShowService';
import { SettingsService, ConnectionSettings, ConnectionHistory, AppSettings } from '../services/SettingsService';
import { autoDiscoveryService, DiscoveredFreeShowInstance } from '../services/AutoDiscoveryService';
import { ErrorLogger } from '../services/ErrorLogger';

interface ConnectionContextType {
  isConnected: boolean;
  connectionHost: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError: string | null;
  connectionHistory: ConnectionHistory[];
  appSettings: AppSettings;
  currentShowPorts: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  } | null;
  connect: (host: string, port?: number, showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  }) => Promise<boolean>;
  disconnect: () => void;
  checkConnection: () => void;
  getConnectionHistory: () => Promise<ConnectionHistory[]>;
  removeFromHistory: (id: string) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  updateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateCurrentShowPorts: (ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  }) => void;
  freeShowService: typeof freeShowService;
  // Auto Discovery
  discoveredServices: DiscoveredFreeShowInstance[];
  isDiscovering: boolean;
  isDiscoveryAvailable: boolean;
  startDiscovery: () => void;
  stopDiscovery: () => void;
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
  const [connectionHistory, setConnectionHistory] = useState<ConnectionHistory[]>([]);
  const [currentShowPorts, setCurrentShowPorts] = useState<{
    remote: number;
    stage: number;
    control: number;
    output: number;
  } | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'dark',
    notifications: true,
    autoReconnect: true,
    connectionTimeout: 10,
  });

  // Auto Discovery state
  const [discoveredServices, setDiscoveredServices] = useState<DiscoveredFreeShowInstance[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Auto-connect state - prevent multiple auto-connect attempts
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);
  
  // Track when initial data loading is complete
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load app settings and connection history on startup
  useEffect(() => {
    const initializeApp = async () => {
      ErrorLogger.info('Initializing app...', 'ConnectionContext');
      await loadAppSettings();
      await loadConnectionHistory();
      
      // Mark that initial data loading is complete
      setIsDataLoaded(true);
      ErrorLogger.debug('Initial data loading complete', 'ConnectionContext');
    };
    
    initializeApp();
  }, []);

  // Auto-connect to last connection in history on startup
  useEffect(() => {
    let autoConnectTimeout: NodeJS.Timeout | null = null;
    
    const attemptAutoConnect = async () => {
      ErrorLogger.debug('Auto-connect check', 'ConnectionContext', {
        hasAttemptedAutoConnect,
        historyLength: connectionHistory.length,
        autoReconnect: appSettings.autoReconnect,
        isConnected,
        connectionStatus
      });
      
      if (
        connectionHistory.length > 0 && 
        appSettings.autoReconnect && 
        !isConnected && 
        connectionStatus === 'disconnected'
      ) {
        // Mark that we've attempted auto-connect
        setHasAttemptedAutoConnect(true);
        
        // Get the most recent connection (last in history)
        const lastConnection = connectionHistory[connectionHistory.length - 1];
        ErrorLogger.info('Attempting auto-connect to last connection', 'ConnectionContext', { host: lastConnection.host });
        
        // Delay slightly to ensure services are ready, then attempt connection
        setTimeout(async () => {
          // Set up auto-connect timeout after connection starts
          autoConnectTimeout = setTimeout(() => {
            ErrorLogger.warn('⏰ Auto-connect timeout reached, canceling connection attempt', 'ConnectionContext');
            // Cancel the ongoing connection attempt
            freeShowService.disconnect();
            setConnectionStatus('error');
            setLastError('Auto-connect timeout - connection took too long');
          }, appSettings.connectionTimeout * 1000); // Use connectionTimeout from settings
          
          try {
            const success = await connect(lastConnection.host, 5505, lastConnection.showPorts);
            if (autoConnectTimeout) {
              clearTimeout(autoConnectTimeout);
              autoConnectTimeout = null;
            }
            if (!success) {
              ErrorLogger.warn('❌ Auto-connect failed', 'ConnectionContext');
            } else {
              ErrorLogger.info('✅ Auto-connect successful', 'ConnectionContext');
            }
          } catch (error) {
            if (autoConnectTimeout) {
              clearTimeout(autoConnectTimeout);
              autoConnectTimeout = null;
            }
            ErrorLogger.error('❌ Auto-connect error', 'ConnectionContext', error instanceof Error ? error : new Error(String(error)));
          }
        }, 1500);
      } else {
        // Mark that we've attempted auto-connect even if conditions aren't met
        setHasAttemptedAutoConnect(true);
        if (connectionHistory.length === 0) {
          ErrorLogger.info('No connection history found - skipping auto-connect', 'ConnectionContext');
        } else if (!appSettings.autoReconnect) {
          ErrorLogger.info('Auto-reconnect disabled - skipping auto-connect', 'ConnectionContext');
        } else {
          ErrorLogger.info('Auto-connect conditions not met', 'ConnectionContext', {
            isConnected,
            connectionStatus
          });
        }
      }
    };

    // Only attempt auto-connect when initial data is loaded AND we haven't attempted yet
    if (
      isDataLoaded && 
      !hasAttemptedAutoConnect
    ) {
      ErrorLogger.debug('Ready for auto-connect check', 'ConnectionContext', {
        historyLength: connectionHistory.length,
        autoReconnect: appSettings.autoReconnect,
        hasAttemptedAutoConnect,
        isDataLoaded
      });
      attemptAutoConnect();
    } else {
      ErrorLogger.debug('Not ready for auto-connect yet', 'ConnectionContext', {
        hasAttemptedAutoConnect,
        historyLength: connectionHistory.length,
        autoReconnectDefined: appSettings.autoReconnect !== undefined,
        isDataLoaded
      });
    }

    // Cleanup timeout on unmount
    return () => {
      if (autoConnectTimeout) {
        clearTimeout(autoConnectTimeout);
      }
    };
  }, [isDataLoaded, hasAttemptedAutoConnect]);

  const loadAppSettings = async (): Promise<void> => {
    try {
      const settings = await SettingsService.getAppSettings();
      setAppSettings(settings);
      ErrorLogger.info('Loaded app settings', 'ConnectionContext', { settings });
    } catch (error) {
      ErrorLogger.error('Failed to load app settings', 'ConnectionContext', error instanceof Error ? error : new Error(String(error)));
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

  const removeFromHistory = async (id: string): Promise<void> => {
    try {
      await SettingsService.removeFromConnectionHistory(id);
      await loadConnectionHistory(); // Refresh history
      console.log('Removed connection from history:', id);
    } catch (error) {
      console.error('Failed to remove connection from history:', error);
    }
  };

  const clearAllHistory = async (): Promise<void> => {
    try {
      await SettingsService.clearConnectionHistory();
      setConnectionHistory([]); // Clear local state immediately
      console.log('Cleared all connection history');
    } catch (error) {
      console.error('Failed to clear connection history:', error);
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

  const updateCurrentShowPorts = useCallback((ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  }) => {
    setCurrentShowPorts(prevPorts => {
      // Only update if the ports have actually changed
      if (!prevPorts || 
          prevPorts.remote !== ports.remote ||
          prevPorts.stage !== ports.stage ||
          prevPorts.control !== ports.control ||
          prevPorts.output !== ports.output) {
        console.log('Updated current show ports:', ports);
        return ports;
      }
      return prevPorts;
    });
  }, []);

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

  const connect = async (host: string, port: number = 5505, showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  }): Promise<boolean> => {
    setConnectionStatus('connecting');
    setLastError(null);
    
    try {
      const success = await freeShowService.connect(host, port);
      if (success) {
        setIsConnected(true);
        setConnectionHost(host);
        setConnectionStatus('connected');
        
        // Store the current show ports (use defaults if not provided)
        const currentPorts = showPorts || {
          remote: 5510,
          stage: 5511,
          control: 5512,
          output: 5513,
        };
        setCurrentShowPorts(currentPorts);
        
        // Add to connection history with interface ports
        await SettingsService.addToConnectionHistory(host, port, undefined, currentPorts);
        
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
    setCurrentShowPorts(null);
    setLastError(null);
  };

  // Auto Discovery methods
  const startDiscovery = (): void => {
    if (isDiscovering) {
      console.log('⚠️ Discovery already in progress');
      return;
    }

    console.log('🔍 Starting FreeShow discovery...');
    setIsDiscovering(true);
    setDiscoveredServices([]);
    
    // Set up listeners
    autoDiscoveryService.onServicesUpdated((services) => {
      console.log('📡 Discovered services updated:', services);
      
      // Deduplicate by IP address and ignore the discovered port
      const uniqueServices: DiscoveredFreeShowInstance[] = [];
      const seenIPs = new Set<string>();
      
      services.forEach(service => {
        const ip = service.ip || service.host;
        if (!seenIPs.has(ip)) {
          seenIPs.add(ip);
          // Always use default port 5505 and IP as the primary identifier
          uniqueServices.push({
            ...service,
            name: ip, // Use IP as display name
            host: ip,
            port: 5505, // Always use default port regardless of discovery
            ip: ip
          });
        }
      });
      
      console.log('📡 Deduplicated services by IP:', uniqueServices);
      setDiscoveredServices(uniqueServices);
    });

    autoDiscoveryService.onError((error) => {
      console.error('❌ Discovery error:', error);
      setIsDiscovering(false);
    });

    // Start scanning
    autoDiscoveryService.startDiscovery();
  };

  const stopDiscovery = (): void => {
    if (!isDiscovering) {
      return;
    }

    console.log('🛑 Stopping FreeShow discovery...');
    autoDiscoveryService.stopDiscovery();
    autoDiscoveryService.removeAllListeners();
    setIsDiscovering(false);
  };

  // Cleanup discovery on unmount
  useEffect(() => {
    return () => {
      stopDiscovery();
    };
  }, []);

  const contextValue: ConnectionContextType = {
    isConnected,
    connectionHost,
    connectionStatus,
    lastError,
    connectionHistory,
    appSettings,
    currentShowPorts,
    connect,
    disconnect,
    checkConnection,
    getConnectionHistory,
    removeFromHistory,
    clearAllHistory,
    updateAppSettings,
    updateCurrentShowPorts,
    freeShowService,
    // Auto Discovery
    discoveredServices,
    isDiscovering,
    isDiscoveryAvailable: autoDiscoveryService.isAvailable(),
    startDiscovery,
    stopDiscovery,
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
