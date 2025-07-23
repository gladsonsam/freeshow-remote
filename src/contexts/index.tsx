// Combined Context Provider - Combines all focused contexts for backward compatibility

import React, { ReactNode } from 'react';
import { ConnectionProvider } from './ConnectionStateContext';
import { DiscoveryProvider } from './DiscoveryContext';
import { SettingsProvider } from './SettingsContext';

interface AppContextProviderProps {
  children: ReactNode;
  autoStartDiscovery?: boolean;
  autoLoadSettings?: boolean;
}

/**
 * Combined provider that wraps all focused contexts
 * Maintains the same API as the original ConnectionContext for backward compatibility
 */
export const AppContextProvider: React.FC<AppContextProviderProps> = ({
  children,
  autoStartDiscovery = false,
  autoLoadSettings = true,
}) => {
  return (
    <SettingsProvider autoLoad={autoLoadSettings}>
      <ConnectionProvider>
        <DiscoveryProvider autoStartDiscovery={autoStartDiscovery}>
          {children}
        </DiscoveryProvider>
      </ConnectionProvider>
    </SettingsProvider>
  );
};

// Re-export all hooks for easy access
export {
  // Connection hooks
  useConnection,
  useConnectionState,
  useConnectionActions,
  useFreeShowService,
} from './ConnectionStateContext';

export {
  // Discovery hooks
  useDiscovery,
  useDiscoveryState,
  useDiscoveryActions,
} from './DiscoveryContext';

export {
  // Settings hooks
  useSettings,
  useAppSettings,
  useConnectionHistory,
  useSettingsError,
} from './SettingsContext';

// Re-export types
export type { ConnectionState, ConnectionActions, ConnectionContextType } from './ConnectionStateContext';
export type { DiscoveryState, DiscoveryActions, DiscoveryContextType } from './DiscoveryContext';
export type { SettingsState, SettingsActions, SettingsContextType } from './SettingsContext';
