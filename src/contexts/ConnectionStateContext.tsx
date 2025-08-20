// Connection State Context - Handles basic connection state and operations

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getDefaultFreeShowService } from '../services/DIContainer';
import { IFreeShowService } from '../services/interfaces/IFreeShowService';
import { ErrorLogger } from '../services/ErrorLogger';
import { settingsRepository } from '../repositories';
import { configService } from '../config/AppConfig';

export interface ConnectionState {
  isConnected: boolean;
  connectionHost: string | null;
  connectionName: string | null;
  connectionPort: number | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError: string | null;
  connectionStartTime: Date | null;
  lastActivity: Date | null;
  currentShowPorts: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  } | null;
  capabilities: string[] | null;
  autoConnectAttempted: boolean;
}

export interface ConnectionActions {
  connect: (host: string, port?: number, name?: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;
  checkConnection: () => boolean;
  clearError: () => void;
  updateShowPorts: (ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }) => Promise<void>;
  updateCapabilities: (capabilities: string[]) => void;
  cancelConnection: () => void;
  setAutoConnectAttempted: (attempted: boolean) => void;
  triggerAutoLaunch?: (navigation: any) => Promise<void>;
}

export interface ConnectionContextType {
  state: ConnectionState;
  actions: ConnectionActions;
  service: IFreeShowService;
  navigation: any;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
  service?: IFreeShowService; // Allow dependency injection for testing
  navigation?: any;
  onConnectionHistoryUpdate?: () => Promise<void>; // Callback to refresh connection history
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ 
  children, 
  service: injectedService,
  navigation,
  onConnectionHistoryUpdate
}) => {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    connectionHost: null,
    connectionName: null,
    connectionPort: null,
    connectionStatus: 'disconnected',
    lastError: null,
    connectionStartTime: null,
    lastActivity: null,
    currentShowPorts: null,
    capabilities: null,
    autoConnectAttempted: false,
  });

  const navigationRef = useRef<any>(null);
  const service = injectedService || getDefaultFreeShowService();
  const logContext = 'ConnectionProvider';
  const cancelConnectionRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update navigation ref when navigation prop changes
  useEffect(() => {
    navigationRef.current = navigation;
    ErrorLogger.debug('[ConnectionProvider] Navigation ref updated', 'ConnectionStateContext', { hasNavigation: !!navigation });
  }, [navigation]);

  // Update state when service connection changes
  useEffect(() => {
    const handleConnect = (data: any) => {
      setState(prev => ({
        ...prev,
        isConnected: true,
        connectionHost: data.host,
        connectionPort: data.port,
        connectionStatus: 'connected',
        connectionStartTime: new Date(),
        lastActivity: new Date(),
        lastError: null,
      }));
      ErrorLogger.info('Connection established', logContext, data);
    };

    const handleDisconnect = (data: any) => {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectionStatus: 'disconnected',
        lastActivity: new Date(),
      }));
      ErrorLogger.info('Connection lost', logContext, data);
    };

    const handleError = (data: any) => {
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        lastError: data.error?.message || 'Connection error',
        lastActivity: new Date(),
      }));
      ErrorLogger.error('Connection error', logContext, new Error(data.error?.message || 'Unknown error'));
    };

    // Listen to service events
    service.on('connect', handleConnect);
    service.on('disconnect', handleDisconnect);
    service.on('error', handleError);

    // Cleanup listeners on unmount
    return () => {
      service.off('connect', handleConnect);
      service.off('disconnect', handleDisconnect);
      service.off('error', handleError);
    };
  }, [service, logContext]);

  // Update activity on any message
  useEffect(() => {
    const updateActivity = () => {
      setState(prev => ({
        ...prev,
        lastActivity: new Date(),
      }));
    };

    // Listen to any service event to update activity
    const events = ['shows', 'slides', 'outputs', 'ping'];
    events.forEach(event => {
      service.on(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        service.off(event, updateActivity);
      });
    };
  }, [service]);

  // Auto-reconnect on mount
  useEffect(() => {
    let didAttempt = false;
    const autoReconnect = async () => {
      try {
        const appSettings = await settingsRepository.getAppSettings();
        if (!appSettings.autoReconnect) {
          setState(prev => ({ ...prev, autoConnectAttempted: true }));
          return;
        }
        if (didAttempt) return;
        didAttempt = true;
        
        const lastConnection = await settingsRepository.getLastConnection();
        if (!lastConnection?.host) {
          setState(prev => ({ ...prev, autoConnectAttempted: true }));
          return;
        }
        
        const timeoutMs = configService.getNetworkConfig().autoConnectTimeout;
        let timeoutHandle: NodeJS.Timeout | null = null;
        let didTimeout = false;
        
        timeoutHandle = setTimeout(() => {
          didTimeout = true;
          service.disconnect();
          setState(prev => ({ ...prev, connectionStatus: 'error', lastError: 'Auto-connect timeout' }));
        }, timeoutMs);
        
        // Use API port for connection (default 5505 if not specified)
        const apiPort = lastConnection.showPorts?.api || 5505;
        
        const success = await service.connect(
          lastConnection.host,
          apiPort,
          lastConnection.nickname
        ).then(() => true).catch(() => false);
        
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (didTimeout) return;
        
        if (success) {
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            connectionHost: lastConnection.host, 
            connectionName: lastConnection.nickname || lastConnection.host, 
            connectionStatus: 'connected',
            connectionPort: apiPort,
          }));
          
          // Update show ports with the saved configuration (respects disabled interfaces with port=0)
          if (lastConnection.showPorts) {
            const showPorts = {
              remote: lastConnection.showPorts.remote,
              stage: lastConnection.showPorts.stage,
              control: lastConnection.showPorts.control,
              output: lastConnection.showPorts.output,
              api: lastConnection.showPorts.api,
            };
            
            // Update the show ports state to reflect saved configuration
            setState(prev => ({ 
              ...prev, 
              currentShowPorts: showPorts,
            }));
            
            ErrorLogger.info('[AutoReconnect] Applied saved show ports configuration', 'ConnectionStateContext', {
              host: lastConnection.host,
              showPorts
            });
          }
          
          ErrorLogger.info('[AutoReconnect] Successfully reconnected with saved configuration', 'ConnectionStateContext', {
            host: lastConnection.host,
            nickname: lastConnection.nickname,
            apiPort,
            showPorts: lastConnection.showPorts
          });
          
          setTimeout(() => triggerAutoLaunch(), 500);
        } else {
          // Navigate to Connect screen on auto-reconnect failure (regardless of navigation layout)
          setTimeout(() => {
            if (navigationRef.current?.navigate) {
              navigationRef.current.navigate('Main', { screen: 'Connect' });
            }
          }, 100);
          
          ErrorLogger.warn(`[AutoReconnect] Failed to reconnect to last connection: ${lastConnection.host}:${apiPort}`, 'ConnectionStateContext');
        }
        
        setState(prev => ({ ...prev, autoConnectAttempted: true }));
      } catch (err) {
        ErrorLogger.error('[AutoConnect] Error in auto-reconnect', 'AutoConnect', err instanceof Error ? err : new Error(String(err)));
        setState(prev => ({ ...prev, autoConnectAttempted: true }));
      }
    };
    autoReconnect();
  }, []);

  // Auto-launch functionality
  const triggerAutoLaunch = useCallback(async (nav?: any) => {
    try {
      const navToUse = nav || navigationRef.current;
      if (!navToUse?.navigate) return;

      const appSettings = await settingsRepository.getAppSettings();
      
      // Auto-launch interface only if conditions are met
      if (appSettings.autoReconnect && appSettings.autoLaunchInterface !== 'none' && state.isConnected && state.connectionHost) {
        const defaultPorts = configService.getDefaultShowPorts();
        const showOptions = [
          { id: 'remote', port: defaultPorts.remote },
          { id: 'stage', port: defaultPorts.stage },
          { id: 'control', port: defaultPorts.control },
          { id: 'output', port: defaultPorts.output },
          { id: 'api', port: defaultPorts.api },
        ];
        
        const selectedShow = showOptions.find(show => show.id === appSettings.autoLaunchInterface);
        if (selectedShow) {
          try {
            if (appSettings.autoLaunchInterface === 'api') {
              navToUse.navigate('APIScreen', {
                title: 'API Controls',
                showId: appSettings.autoLaunchInterface,
              });
            } else {
              const url = `http://${state.connectionHost}:${selectedShow.port}`;
              const title = appSettings.autoLaunchInterface.charAt(0).toUpperCase() + appSettings.autoLaunchInterface.slice(1) + 'Show';
              
              navToUse.navigate('WebView', {
                url,
                title,
                showId: appSettings.autoLaunchInterface,
                initialFullscreen: appSettings.autoLaunchFullscreen || false,
              });
            }
          } catch (navigationError) {
            ErrorLogger.error('[AutoLaunch] Navigation error', 'ConnectionStateContext', 
              navigationError instanceof Error ? navigationError : new Error(String(navigationError)));
          }
        }
      }
    } catch (error) {
      ErrorLogger.error('[AutoLaunch] Error in auto-launch', 'ConnectionStateContext', error instanceof Error ? error : new Error(String(error)));
    }
  }, [state.isConnected, state.connectionHost]);

  // App state listener for foreground reconnection
  useEffect(() => {
    let previousAppState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // If app is coming to foreground, attempt reconnection
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        try {
          const appSettings = await settingsRepository.getAppSettings();
          if (!appSettings.autoReconnect) {
            previousAppState = nextAppState;
            return;
          }

          const currentState = service.isConnected();
          const isAlreadyConnecting = state.connectionStatus === 'connecting';
          
          if (!currentState && !isAlreadyConnecting && state.connectionHost && state.connectionStatus === 'disconnected') {
            setState(prev => ({ 
              ...prev, 
              connectionStatus: 'connecting',
              lastError: null 
            }));

            try {
              await service.connect(
                state.connectionHost,
                state.connectionPort || 5505,
                state.connectionName || state.connectionHost
              );
              
              if (service.isConnected()) {
                setState(prev => ({
                  ...prev,
                  isConnected: true,
                  connectionStatus: 'connected',
                  connectionStartTime: new Date(),
                  lastActivity: new Date(),
                  lastError: null,
                }));

                setTimeout(() => triggerAutoLaunch(), 500);
              } else {
                setState(prev => ({
                  ...prev,
                  connectionStatus: 'disconnected',
                }));
              }
            } catch (error) {
              setState(prev => ({
                ...prev,
                connectionStatus: 'error',
                lastError: error instanceof Error ? error.message : 'Foreground reconnection failed',
              }));
            }
          }
        } catch (error) {
          ErrorLogger.error('[AppState] Error during foreground reconnection', 'ConnectionStateContext', 
            error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      previousAppState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [service, state.connectionHost, state.connectionPort, state.connectionName, triggerAutoLaunch]);

  const connect = useCallback(async (host: string, port?: number, name?: string): Promise<boolean> => {
    setState(prev => ({ ...prev, connectionStatus: 'connecting', lastError: null }));
    cancelConnectionRef.current = false;
    try {
      const connectPromise = service.connect(host, port, name);
      await Promise.race([
        connectPromise,
        new Promise((_, reject) => {
          const checkCancel = () => {
            if (cancelConnectionRef.current) {
              reject(new Error('Connection cancelled by user'));
            } else {
              setTimeout(checkCancel, 100);
            }
          };
          checkCancel();
        })
      ]);
      if (service.isConnected()) {
        setState(prev => ({ ...prev, isConnected: true, connectionHost: host, connectionName: name || host, connectionPort: port || null, connectionStatus: 'connected', lastError: null }));
        return true;
      } else {
        setState(prev => ({ ...prev, connectionStatus: 'error', lastError: 'Failed to connect to FreeShow' }));
        return false;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Connection cancelled by user') {
        setState(prev => ({ ...prev, connectionStatus: 'disconnected', lastError: 'Connection cancelled' }));
      } else {
        setState(prev => ({ ...prev, connectionStatus: 'error', lastError: error instanceof Error ? error.message : 'Connection failed' }));
      }
      return false;
    }
  }, [service]);

  const disconnect = useCallback(async (): Promise<void> => {
    try {
      await service.disconnect();
      
      // Service will emit 'disconnect' event which will update state
    } catch (error) {
      ErrorLogger.error('Failed to disconnect', logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }, [service, logContext]);

  const reconnect = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({
        ...prev,
        connectionStatus: 'connecting',
        lastError: null,
      }));

      await service.reconnect();
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Reconnection failed';
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        lastError: errorMessage,
      }));
      
      ErrorLogger.error('Failed to reconnect', logContext, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, [service, logContext]);

  const checkConnection = useCallback((): boolean => {
    return service.isConnected();
  }, [service]);

  const clearError = useCallback((): void => {
    setState(prev => ({
      ...prev,
      lastError: null,
    }));
  }, []);

  const updateShowPorts = useCallback(async (ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }): Promise<void> => {
    setState(prev => ({
      ...prev,
      currentShowPorts: ports,
    }));

    // Auto-save connection history when ports change (only if connected)
    if (state.isConnected && state.connectionHost) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save after 200ms of inactivity (reduced for better UX)
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await settingsRepository.updateConnectionPorts(state.connectionHost!, ports);
          
          // Immediately refresh connection history in the UI
          if (onConnectionHistoryUpdate) {
            await onConnectionHistoryUpdate();
          }
        } catch (error) {
          ErrorLogger.warn('Failed to auto-save connection ports', logContext, 
            error instanceof Error ? error : new Error(String(error))
          );
        }
      }, 200); // Reduced from 500ms to 200ms for more responsive feel
    }
  }, [state.isConnected, state.connectionHost, logContext, onConnectionHistoryUpdate]);

  const updateCapabilities = useCallback((capabilities: string[]): void => {
    setState(prev => ({
      ...prev,
      capabilities,
    }));
  }, []);

  const cancelConnection = useCallback(() => {
    cancelConnectionRef.current = true;
    service.disconnect();
    setState(prev => ({ ...prev, connectionStatus: 'disconnected', lastError: 'Connection cancelled' }));
  }, [service]);

  const setAutoConnectAttempted = useCallback((attempted: boolean) => {
    setState(prev => ({
      ...prev,
      autoConnectAttempted: attempted,
    }));
  }, []);

  // Trigger auto-launch when connection becomes connected (backup for auto-connect)
  // Only run this backup auto-launch if the app's initial auto-connect attempt hasn't already been performed.
  // This prevents manual connections from causing auto-launch/auto-fullscreen behavior.
  useEffect(() => {
    if (!state.autoConnectAttempted && state.isConnected && state.connectionHost && navigationRef.current) {
      ErrorLogger.debug('[ConnectionProvider] Connection established during initial auto-connect flow, checking for auto-launch', 'ConnectionStateContext');
      setTimeout(async () => {
        await triggerAutoLaunch();
      }, 500);
    }
  }, [state.isConnected, state.connectionHost, state.autoConnectAttempted, triggerAutoLaunch]);

  const actions: ConnectionActions = {
    connect,
    disconnect,
    reconnect,
    checkConnection,
    clearError,
    updateShowPorts,
    updateCapabilities,
    cancelConnection,
    setAutoConnectAttempted,
    triggerAutoLaunch,
  };

  const contextValue: ConnectionContextType = {
    state,
    actions,
    service,
    navigation: navigationRef.current,
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

// Convenience hooks for specific parts of the context
export const useConnectionState = (): ConnectionState => {
  return useConnection().state;
};

export const useConnectionActions = (): ConnectionActions => {
  return useConnection().actions;
};

export const useFreeShowService = (): IFreeShowService => {
  return useConnection().service;
};
