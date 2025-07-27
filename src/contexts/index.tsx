// Combined Context Provider - Combines all focused contexts for backward compatibility

import React, { ReactNode } from 'react';
import { ConnectionProvider } from './ConnectionStateContext';
import { DiscoveryProvider } from './DiscoveryContext';
import { SettingsProvider } from './SettingsContext';

// Combine all providers into a single AppContext
export const AppContextProvider: React.FC<{
  children: ReactNode;
  navigation?: any;
}> = ({ children, navigation }) => {
  return (
    <SettingsProvider>
      <ConnectionProvider navigation={navigation}>
        <DiscoveryProvider autoStartDiscovery={false}>
          {children}
        </DiscoveryProvider>
      </ConnectionProvider>
    </SettingsProvider>
  );
};

export * from './ConnectionStateContext';
export * from './DiscoveryContext';
export * from './SettingsContext';
