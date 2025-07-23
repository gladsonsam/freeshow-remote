// Discovery Context - Handles auto-discovery of FreeShow instances

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { autoDiscoveryService, DiscoveredFreeShowInstance } from '../services/AutoDiscoveryService';
import { ErrorLogger } from '../services/ErrorLogger';
import { connectionRepository } from '../repositories';

export interface DiscoveryState {
  discoveredServices: DiscoveredFreeShowInstance[];
  isDiscovering: boolean;
  isDiscoveryAvailable: boolean;
  lastDiscoveryTime: Date | null;
  discoveryError: string | null;
}

export interface DiscoveryActions {
  startDiscovery: () => void;
  stopDiscovery: () => void;
  refreshDiscovery: () => void;
  clearDiscoveredServices: () => void;
  removeDiscoveredService: (id: string) => void;
}

export interface DiscoveryContextType {
  state: DiscoveryState;
  actions: DiscoveryActions;
}

const DiscoveryContext = createContext<DiscoveryContextType | undefined>(undefined);

interface DiscoveryProviderProps {
  children: ReactNode;
  autoStartDiscovery?: boolean; // Whether to start discovery automatically
}

export const DiscoveryProvider: React.FC<DiscoveryProviderProps> = ({ 
  children, 
  autoStartDiscovery = false 
}) => {
  const [state, setState] = useState<DiscoveryState>({
    discoveredServices: [],
    isDiscovering: false,
    isDiscoveryAvailable: autoDiscoveryService.isAvailable(),
    lastDiscoveryTime: null,
    discoveryError: null,
  });

  const logContext = 'DiscoveryProvider';

  // Set up discovery event listeners
  useEffect(() => {
    const handleServicesUpdated = (services: DiscoveredFreeShowInstance[]) => {
      setState(prev => ({
        ...prev,
        discoveredServices: services,
        lastDiscoveryTime: new Date(),
        discoveryError: null,
      }));

      // Cache discovery results
      services.forEach(service => {
        connectionRepository.addDiscoveryResult({
          host: service.host,
          port: service.port,
          name: service.name,
          type: 'freeshow',
          metadata: { ip: service.ip },
        }).catch(error => {
          ErrorLogger.warn('Failed to cache discovery result', logContext, error instanceof Error ? error : new Error(String(error)));
        });
      });

      ErrorLogger.debug(`Updated discovered services: ${services.length}`, logContext);
    };

    const handleDiscoveryError = (error: string) => {
      setState(prev => ({
        ...prev,
        discoveryError: error,
        isDiscovering: false,
      }));
      ErrorLogger.error('Discovery error', logContext, new Error(error));
    };

    // Register event listeners using the correct methods
    autoDiscoveryService.onServicesUpdated(handleServicesUpdated);
    autoDiscoveryService.onError(handleDiscoveryError);

    return () => {
      autoDiscoveryService.removeListener('onServicesUpdated', handleServicesUpdated);
      autoDiscoveryService.removeListener('onError', handleDiscoveryError);
    };
  }, [logContext]);

  // Load cached discovery results on mount
  useEffect(() => {
    const loadCachedResults = async () => {
      try {
        const cachedResults = await connectionRepository.getDiscoveryResults();
        if (cachedResults.length > 0) {
          const discoveredServices: DiscoveredFreeShowInstance[] = cachedResults.map(result => ({
            host: result.host,
            port: result.port,
            name: result.name,
            ip: result.metadata?.ip || result.host, // Use IP from metadata or fallback to host
          }));

          setState(prev => ({
            ...prev,
            discoveredServices,
            lastDiscoveryTime: new Date(cachedResults[0].discoveredAt),
          }));

          ErrorLogger.debug(`Loaded ${cachedResults.length} cached discovery results`, logContext);
        }
      } catch (error) {
        ErrorLogger.warn('Failed to load cached discovery results', logContext, error instanceof Error ? error : new Error(String(error)));
      }
    };

    loadCachedResults();
  }, [logContext]);

  // Auto-start discovery if enabled
  useEffect(() => {
    if (autoStartDiscovery && state.isDiscoveryAvailable && !state.isDiscovering) {
      startDiscovery();
    }
  }, [autoStartDiscovery, state.isDiscoveryAvailable, state.isDiscovering]);

  const startDiscovery = useCallback(() => {
    if (!state.isDiscoveryAvailable) {
      ErrorLogger.warn('Discovery service not available', logContext);
      return;
    }

    if (state.isDiscovering) {
      ErrorLogger.debug('Discovery already running', logContext);
      return;
    }

    try {
      autoDiscoveryService.startDiscovery();
    } catch (error) {
      ErrorLogger.error('Failed to start discovery', logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }, [state.isDiscoveryAvailable, state.isDiscovering, logContext]);

  const stopDiscovery = useCallback(() => {
    if (!state.isDiscovering) {
      ErrorLogger.debug('Discovery not running', logContext);
      return;
    }

    try {
      autoDiscoveryService.stopDiscovery();
    } catch (error) {
      ErrorLogger.error('Failed to stop discovery', logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }, [state.isDiscovering, logContext]);

  const refreshDiscovery = useCallback(() => {
    if (state.isDiscovering) {
      stopDiscovery();
    }
    
    // Clear current results
    setState(prev => ({
      ...prev,
      discoveredServices: [],
      discoveryError: null,
    }));

    // Start discovery after a short delay
    setTimeout(() => {
      startDiscovery();
    }, 500);
  }, [state.isDiscovering, startDiscovery, stopDiscovery]);

  const clearDiscoveredServices = useCallback(() => {
    setState(prev => ({
      ...prev,
      discoveredServices: [],
      discoveryError: null,
    }));

    // Clear cache
    connectionRepository.clearDiscoveryCache().catch(error => {
      ErrorLogger.warn('Failed to clear discovery cache', logContext, error);
    });

    ErrorLogger.debug('Cleared discovered services', logContext);
  }, [logContext]);

  const removeDiscoveredService = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      discoveredServices: prev.discoveredServices.filter(service => 
        `${service.host}:${service.port}` !== id
      ),
    }));
    ErrorLogger.debug('Removed discovered service', logContext, { id });
  }, [logContext]);

  const actions: DiscoveryActions = {
    startDiscovery,
    stopDiscovery,
    refreshDiscovery,
    clearDiscoveredServices,
    removeDiscoveredService,
  };

  const contextValue: DiscoveryContextType = {
    state,
    actions,
  };

  return (
    <DiscoveryContext.Provider value={contextValue}>
      {children}
    </DiscoveryContext.Provider>
  );
};

export const useDiscovery = (): DiscoveryContextType => {
  const context = useContext(DiscoveryContext);
  if (context === undefined) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
};

// Convenience hooks for specific parts of the context
export const useDiscoveryState = (): DiscoveryState => {
  return useDiscovery().state;
};

export const useDiscoveryActions = (): DiscoveryActions => {
  return useDiscovery().actions;
};
