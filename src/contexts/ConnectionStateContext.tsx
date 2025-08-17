// Connection State Context - Handles basic connection state and operations

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getDefaultFreeShowService } from '../services/DIContainer';
import { IFreeShowService } from '../services/interfaces/IFreeShowService';
import { ErrorLogger } from '../services/ErrorLogger';
import { settingsRepository, AppSettings } from '../repositories';

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
  }) => void;
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
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ 
  children, 
  service: injectedService,
  navigation 
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
      ErrorLogger.info('[AutoConnect] useEffect triggered', 'AutoConnect');
      try {
        const appSettings: AppSettings = await settingsRepository.getAppSettings();
        ErrorLogger.info('[AutoConnect] Loaded app settings', 'AutoConnect', appSettings);
        if (!appSettings.autoReconnect) {
          ErrorLogger.info('[AutoConnect] autoReconnect is false, skipping', 'AutoConnect');
          // Mark auto-connect as attempted even if disabled
          setState(prev => ({ ...prev, autoConnectAttempted: true }));
          return;
        }
        if (didAttempt) return;
        didAttempt = true;
        const lastConnection = await settingsRepository.getLastConnection();
        if (lastConnection) {
          ErrorLogger.info('[AutoConnect] Last connection', 'AutoConnect', lastConnection);
        } else {
          ErrorLogger.info('[AutoConnect] Last connection is null', 'AutoConnect');
        }
        if (!lastConnection || !lastConnection.host) {
          ErrorLogger.info('[AutoConnect] No valid last connection found, skipping', 'AutoConnect');
          // Mark auto-connect as attempted even if no last connection
          setState(prev => ({ ...prev, autoConnectAttempted: true }));
          return;
        }
        const timeoutMs = require('../config/AppConfig').configService.getNetworkConfig().autoConnectTimeout;
        ErrorLogger.info('[AutoConnect] Attempting to connect', 'AutoConnect', {
          host: lastConnection.host,
          port: lastConnection.showPorts?.remote || 5505,
          showPorts: lastConnection.showPorts,
          timeoutMs
        });
        let timeoutHandle: NodeJS.Timeout | null = null;
        let didTimeout = false;
        timeoutHandle = setTimeout(() => {
          didTimeout = true;
          ErrorLogger.info('[AutoConnect] Connection attempt timed out', 'AutoConnect');
          service.disconnect();
          setState(prev => ({ ...prev, connectionStatus: 'error', lastError: 'Auto-connect timeout - connection took too long' }));
        }, timeoutMs); // timeoutMs is already in milliseconds
        const success = await service.connect(
          lastConnection.host,
          lastConnection.showPorts?.remote || 5505,
          lastConnection.nickname // Pass the stored nickname to preserve it
        ).then(() => true).catch(() => false);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        if (didTimeout) return;
        if (success) {
          ErrorLogger.info('[AutoConnect] Auto-connect successful', 'AutoConnect', { host: lastConnection.host });
          // Set the connection name in state to preserve nickname in UI
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            connectionHost: lastConnection.host, 
            connectionName: lastConnection.nickname || lastConnection.host, 
            connectionStatus: 'connected' 
          }));
          
          // Trigger auto-launch if enabled (with shorter delay since no navigation needed)
          setTimeout(async () => {
            await triggerAutoLaunch();
          }, 500);
        } else {
          ErrorLogger.info('[AutoConnect] Auto-connect failed', 'AutoConnect', { host: lastConnection.host });
          
          // Only navigate to Connect tab if auto-connect failed AND we're using bottom tab navigation
          // For sidebar navigation, let the user stay where they are
          setTimeout(async () => {
            try {
              const appSettings = await settingsRepository.getAppSettings();
              
              // Skip forced navigation for sidebar layout - user can manually navigate if needed
              if (appSettings.navigationLayout === 'sidebar') {
                ErrorLogger.info('[AutoConnect] Auto-connect failed but staying on current screen for sidebar navigation', 'AutoConnect');
                return;
              }
              
              // Only force navigation for bottom tab layout
              if (navigationRef.current && typeof navigationRef.current.navigate === 'function') {
                ErrorLogger.info('[AutoConnect] Auto-connect failed, navigating to Connect tab', 'AutoConnect');
                navigationRef.current.navigate('Main', { screen: 'Connect' });
              }
            } catch (navigationError) {
              ErrorLogger.error('[AutoConnect] Navigation error during auto-connect fallback', 'AutoConnect', 
                navigationError instanceof Error ? navigationError : new Error(String(navigationError)));
            }
          }, 100);
        }
        
        // Mark auto-connect attempt as completed regardless of success/failure
        setState(prev => ({ ...prev, autoConnectAttempted: true }));
      } catch (err) {
        ErrorLogger.error('[AutoConnect] Error in auto-reconnect', 'AutoConnect', err instanceof Error ? err : new Error(String(err)));
        // Mark auto-connect as attempted even if there was an error
        setState(prev => ({ ...prev, autoConnectAttempted: true }));
      }
    };
    autoReconnect();
    // Only run once on mount
  }, []);

  // Auto-launch functionality
  const triggerAutoLaunch = useCallback(async (nav?: any) => {
    try {
      const navToUse = nav || navigationRef.current;
      ErrorLogger.debug('[AutoLaunch] Attempting auto-launch', 'ConnectionStateContext', { 
        hasNavigation: !!navToUse,
        isConnected: state.isConnected,
        connectionHost: state.connectionHost
      });
      
      if (!navToUse || typeof navToUse.navigate !== 'function') {
        ErrorLogger.warn('[AutoLaunch] No valid navigation available', 'ConnectionStateContext', 
          new Error(`Navigation validation failed: hasNavigation=${!!navToUse}, hasNavigateMethod=${!!(navToUse && typeof navToUse.navigate === 'function')}`));
        return;
      }

      const appSettings = await settingsRepository.getAppSettings();
      ErrorLogger.debug('[AutoLaunch] App settings loaded', 'ConnectionStateContext', { 
        autoLaunchInterface: appSettings.autoLaunchInterface,
        navigationLayout: appSettings.navigationLayout
      });
      
      // Removed sidebar navigation check so auto-launch works for all layouts
      
      // Auto-launch interface only if auto-reconnect is enabled
      if (appSettings.autoReconnect && appSettings.autoLaunchInterface !== 'none' && state.isConnected && state.connectionHost) {
        const showOptions = [
          { id: 'remote', port: 5510 },
          { id: 'stage', port: 5511 },
          { id: 'control', port: 5512 },
          { id: 'output', port: 5513 },
          { id: 'api', port: 5505 },
        ];
        
        const selectedShow = showOptions.find(show => show.id === appSettings.autoLaunchInterface);
        if (selectedShow) {
          try {
            if (appSettings.autoLaunchInterface === 'api') {
              // Navigate to APIScreen for API interface
              ErrorLogger.info('[AutoLaunch] Navigating to API interface', 'ConnectionStateContext', {
                interface: appSettings.autoLaunchInterface,
                title: 'API Controls'
              });
              
              navToUse.navigate('APIScreen', {
                title: 'API Controls',
                showId: appSettings.autoLaunchInterface,
              });
            } else {
              // Navigate to WebView for other interfaces
              const url = `http://${state.connectionHost}:${selectedShow.port}`;
              ErrorLogger.info('[AutoLaunch] Navigating to auto-launch interface', 'ConnectionStateContext', {
                interface: appSettings.autoLaunchInterface,
                url,
                title: appSettings.autoLaunchInterface.charAt(0).toUpperCase() + appSettings.autoLaunchInterface.slice(1) + 'Show'
              });
              
              navToUse.navigate('WebView', {
                url,
                title: appSettings.autoLaunchInterface.charAt(0).toUpperCase() + appSettings.autoLaunchInterface.slice(1) + 'Show',
                showId: appSettings.autoLaunchInterface,
                initialFullscreen: appSettings.autoLaunchFullscreen || false,
              });
            }
          } catch (navigationError) {
            ErrorLogger.error('[AutoLaunch] Navigation error during auto-launch', 'ConnectionStateContext', 
              navigationError instanceof Error ? navigationError : new Error(String(navigationError)));
          }
        } else {
          ErrorLogger.warn('[AutoLaunch] Selected show not found', 'ConnectionStateContext', 
            new Error(`autoLaunchInterface: ${appSettings.autoLaunchInterface}`)
          );
        }
      } else {
        ErrorLogger.debug('[AutoLaunch] Auto-launch conditions not met', 'ConnectionStateContext', {
          autoReconnect: appSettings.autoReconnect,
          autoLaunchInterface: appSettings.autoLaunchInterface,
          isConnected: state.isConnected,
          hasConnectionHost: !!state.connectionHost
        });
      }
    } catch (error) {
      ErrorLogger.error('[AutoLaunch] Error in auto-launch', 'ConnectionStateContext', error instanceof Error ? error : new Error(String(error)));
    }
  }, [state.isConnected, state.connectionHost]);

  // App state listener for foreground reconnection
  useEffect(() => {
    let previousAppState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      ErrorLogger.info(`[AppState] App state changed from ${previousAppState} to ${nextAppState}`, 'ConnectionStateContext');
      
      // If app is coming to foreground and we were previously connected but now disconnected
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        ErrorLogger.info('[AppState] App came to foreground, checking reconnection', 'ConnectionStateContext');
        
        try {
          // Check if auto-reconnect is enabled
          const appSettings = await settingsRepository.getAppSettings();
          if (!appSettings.autoReconnect) {
            ErrorLogger.info('[AppState] Auto-reconnect disabled, skipping foreground reconnection', 'ConnectionStateContext');
            previousAppState = nextAppState;
            return;
          }

          // Only attempt reconnection if we're not currently connected but have connection info
          // Also check if we're not already in a connecting state to avoid duplicate attempts
          const currentState = service.isConnected();
          const isAlreadyConnecting = state.connectionStatus === 'connecting';
          
          if (!currentState && !isAlreadyConnecting && state.connectionHost && state.connectionStatus === 'disconnected') {
            ErrorLogger.info('[AppState] Attempting foreground reconnection', 'ConnectionStateContext', {
              host: state.connectionHost,
              port: state.connectionPort
            });

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
              
              // Check if connection was successful and update state properly
              if (service.isConnected()) {
                ErrorLogger.info('[AppState] Foreground reconnection successful', 'ConnectionStateContext');
                
                // Update state to trigger auto-launch mechanism
                setState(prev => ({
                  ...prev,
                  isConnected: true,
                  connectionStatus: 'connected',
                  connectionStartTime: new Date(),
                  lastActivity: new Date(),
                  lastError: null,
                }));

                // Trigger auto-launch after a short delay
                setTimeout(async () => {
                  await triggerAutoLaunch();
                }, 500);
              } else {
                ErrorLogger.info('[AppState] Foreground reconnection failed', 'ConnectionStateContext');
                setState(prev => ({
                  ...prev,
                  connectionStatus: 'disconnected',
                }));
              }
            } catch (error) {
              ErrorLogger.error('[AppState] Error during foreground reconnection', 'ConnectionStateContext', 
                error instanceof Error ? error : new Error(String(error)));
              setState(prev => ({
                ...prev,
                connectionStatus: 'error',
                lastError: error instanceof Error ? error.message : 'Foreground reconnection failed',
              }));
            }
          } else if (currentState) {
            ErrorLogger.info('[AppState] Already connected, no foreground reconnection needed', 'ConnectionStateContext');
          } else {
            ErrorLogger.info('[AppState] No previous connection info for foreground reconnection', 'ConnectionStateContext');
          }
        } catch (error) {
          ErrorLogger.error('[AppState] Error checking foreground reconnection settings', 'ConnectionStateContext', 
            error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      previousAppState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
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

  const updateShowPorts = useCallback((ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }): void => {
    setState(prev => ({
      ...prev,
      currentShowPorts: ports,
    }));
  }, []);

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
