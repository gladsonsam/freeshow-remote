// Connection State Context - Handles basic connection state and operations

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getDefaultFreeShowService } from '../services/DIContainer';
import { IFreeShowService } from '../services/interfaces/IFreeShowService';
import { ErrorLogger } from '../services/ErrorLogger';
import { settingsRepository, AppSettings } from '../repositories';

export interface ConnectionState {
  isConnected: boolean;
  connectionHost: string | null;
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
  } | null;
}

export interface ConnectionActions {
  connect: (host: string, port?: number) => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;
  checkConnection: () => boolean;
  clearError: () => void;
  updateShowPorts: (ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  }) => void;
}

export interface ConnectionContextType {
  state: ConnectionState;
  actions: ConnectionActions;
  service: IFreeShowService;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
  service?: IFreeShowService; // Allow dependency injection for testing
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ 
  children, 
  service: injectedService 
}) => {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    connectionHost: null,
    connectionPort: null,
    connectionStatus: 'disconnected',
    lastError: null,
    connectionStartTime: null,
    lastActivity: null,
    currentShowPorts: null,
  });

  // Use injected service or default
  const service = injectedService || getDefaultFreeShowService();
  const logContext = 'ConnectionProvider';

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

  const connect = useCallback(async (host: string, port: number = 5505): Promise<boolean> => {
    try {
      setState(prev => ({
        ...prev,
        connectionStatus: 'connecting',
        lastError: null,
      }));

      await service.connect(host, port);
      
      // Service will emit 'connect' event which will update state
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        lastError: errorMessage,
      }));
      
      ErrorLogger.error('Failed to connect', logContext, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, [service, logContext]);

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
  }): void => {
    setState(prev => ({
      ...prev,
      currentShowPorts: ports,
    }));
  }, []);

  const actions: ConnectionActions = {
    connect,
    disconnect,
    reconnect,
    checkConnection,
    clearError,
    updateShowPorts,
  };

  const contextValue: ConnectionContextType = {
    state,
    actions,
    service,
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
