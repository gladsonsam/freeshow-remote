import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { freeShowService } from '../services/FreeShowService';

interface ConnectionContextType {
  isConnected: boolean;
  connectionHost: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastError: string | null;
  connect: (host: string, port?: number) => Promise<boolean>;
  disconnect: () => void;
  checkConnection: () => void;
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
    connect,
    disconnect,
    checkConnection,
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
