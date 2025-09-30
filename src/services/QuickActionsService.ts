import * as QuickActions from 'expo-quick-actions';
import { Platform } from 'react-native';
import { ConnectionHistory } from '../repositories';

export interface QuickActionData {
  type: 'connect-history';
  connectionId: string;
  host: string;
  nickname?: string;
}

class QuickActionsService {
  /**
   * Update launcher shortcuts with the 3 most recent connections
   * Works on both Android (long-press) and iOS (3D Touch/Haptic Touch)
   */
  async updateRecentConnections(history: ConnectionHistory[]): Promise<void> {
    // Works on both Android and iOS
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return;
    }

    try {
      // Get the 3 most recent connections
      const recentConnections = [...history]
        .sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime())
        .slice(0, 3);

      // Create quick actions
      const quickActions: QuickActions.Action[] = recentConnections.map((connection, index) => ({
        id: `connect-${connection.id}`,
        title: connection.nickname || connection.host,
        subtitle: connection.nickname ? connection.host : undefined,
        // Use SF Symbols for iOS, configured icon for Android
        icon: Platform.OS === 'ios' ? 'symbol:wifi' : 'wifi_shortcut',
        params: {
          type: 'connect-history',
          connectionId: connection.id,
          host: connection.host,
          nickname: connection.nickname || '',
        },
      }));

      // Set the quick actions
      await QuickActions.setItems(quickActions);

      console.log('[QuickActionsService] Updated quick actions:', quickActions.length);
    } catch (error) {
      console.error('[QuickActionsService] Failed to update quick actions:', error);
    }
  }

  /**
   * Clear all quick actions
   */
  async clearQuickActions(): Promise<void> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return;
    }

    try {
      await QuickActions.setItems([]);
      console.log('[QuickActionsService] Cleared quick actions');
    } catch (error) {
      console.error('[QuickActionsService] Failed to clear quick actions:', error);
    }
  }

  /**
   * Get the initial quick action when app opens from a shortcut
   */
  getInitialAction(): QuickActions.Action | null {
    try {
      // QuickActions.initial is the initial action, not a function
      return QuickActions.initial || null;
    } catch (error) {
      console.error('[QuickActionsService] Failed to get initial action:', error);
      return null;
    }
  }
}

export const quickActionsService = new QuickActionsService();
