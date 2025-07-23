import { IStorageRepository, StorageKeys } from './IStorageRepository';
import { storageRepository } from './AsyncStorageRepository';
import { ErrorLogger } from '../services/ErrorLogger';

// Types for connection domain
export interface SavedConnection {
  id: string;
  host: string;
  port: number;
  name?: string;
  isSecure?: boolean;
  showPorts?: {
    remote: number;
    stage: number;
    control: number;
    output: number;
  };
  metadata?: {
    version?: string;
    platform?: string;
    capabilities?: string[];
  };
}

export interface ConnectionSession {
  id: string;
  connectionId: string;
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  duration?: number; // in seconds
  status: 'active' | 'disconnected' | 'error';
  errorReason?: string;
  commands?: number; // Count of commands sent
  lastActivity: string; // ISO date string
}

export interface DiscoveryResult {
  host: string;
  port: number;
  name: string;
  type: string;
  discoveredAt: string; // ISO date string
  metadata?: Record<string, any>;
}

/**
 * Repository for managing connections, sessions, and discovery results
 * Handles persistence of connection-related data
 */
export class ConnectionRepository {
  private readonly logContext = 'ConnectionRepository';
  private storage: IStorageRepository;

  constructor(storage: IStorageRepository = storageRepository) {
    this.storage = storage;
  }

  // Saved Connections
  async getSavedConnections(): Promise<SavedConnection[]> {
    try {
      const connections = await this.storage.getObject<SavedConnection[]>(StorageKeys.SAVED_CONNECTIONS);
      return connections || [];
    } catch (error) {
      ErrorLogger.error('Failed to get saved connections', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async saveConnection(connection: Omit<SavedConnection, 'id'>): Promise<SavedConnection> {
    try {
      const connections = await this.getSavedConnections();
      
      // Check if connection already exists
      const existingIndex = connections.findIndex(c => c.host === connection.host && c.port === connection.port);
      
      if (existingIndex >= 0) {
        // Update existing connection
        const updatedConnection = {
          ...connections[existingIndex],
          ...connection,
          id: connections[existingIndex].id, // Keep existing ID
        };
        connections[existingIndex] = updatedConnection;
        await this.storage.setObject(StorageKeys.SAVED_CONNECTIONS, connections);
        ErrorLogger.info('Updated existing saved connection', this.logContext, { id: updatedConnection.id });
        return updatedConnection;
      } else {
        // Add new connection
        const newConnection: SavedConnection = {
          id: `${connection.host}:${connection.port}_${Date.now()}`,
          ...connection,
        };
        connections.push(newConnection);
        await this.storage.setObject(StorageKeys.SAVED_CONNECTIONS, connections);
        ErrorLogger.info('Added new saved connection', this.logContext, { id: newConnection.id });
        return newConnection;
      }
    } catch (error) {
      ErrorLogger.error('Failed to save connection', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async removeSavedConnection(id: string): Promise<void> {
    try {
      const connections = await this.getSavedConnections();
      const filteredConnections = connections.filter(c => c.id !== id);
      await this.storage.setObject(StorageKeys.SAVED_CONNECTIONS, filteredConnections);
      ErrorLogger.info('Removed saved connection', this.logContext, { id });
    } catch (error) {
      ErrorLogger.error('Failed to remove saved connection', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async getSavedConnection(id: string): Promise<SavedConnection | null> {
    try {
      const connections = await this.getSavedConnections();
      return connections.find(c => c.id === id) || null;
    } catch (error) {
      ErrorLogger.error('Failed to get saved connection', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  }

  // Connection Sessions
  async getConnectionSessions(): Promise<ConnectionSession[]> {
    try {
      const sessions = await this.storage.getObject<ConnectionSession[]>(StorageKeys.CONNECTION_SESSIONS);
      return sessions || [];
    } catch (error) {
      ErrorLogger.error('Failed to get connection sessions', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async startSession(connectionId: string): Promise<ConnectionSession> {
    try {
      const sessions = await this.getConnectionSessions();
      const newSession: ConnectionSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        connectionId,
        startTime: new Date().toISOString(),
        status: 'active',
        commands: 0,
        lastActivity: new Date().toISOString(),
      };
      
      sessions.push(newSession);
      
      // Keep only the last 50 sessions
      const trimmedSessions = sessions.slice(-50);
      await this.storage.setObject(StorageKeys.CONNECTION_SESSIONS, trimmedSessions);
      
      ErrorLogger.info('Started new connection session', this.logContext, { sessionId: newSession.id });
      return newSession;
    } catch (error) {
      ErrorLogger.error('Failed to start session', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async endSession(sessionId: string, status: 'disconnected' | 'error' = 'disconnected', errorReason?: string): Promise<void> {
    try {
      const sessions = await this.getConnectionSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        const session = sessions[sessionIndex];
        const endTime = new Date().toISOString();
        const duration = Math.floor((new Date(endTime).getTime() - new Date(session.startTime).getTime()) / 1000);
        
        sessions[sessionIndex] = {
          ...session,
          endTime,
          duration,
          status,
          errorReason,
        };
        
        await this.storage.setObject(StorageKeys.CONNECTION_SESSIONS, sessions);
        ErrorLogger.info('Ended connection session', this.logContext, { sessionId, status, duration });
      }
    } catch (error) {
      ErrorLogger.error('Failed to end session', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async updateSessionActivity(sessionId: string, commandCount?: number): Promise<void> {
    try {
      const sessions = await this.getConnectionSessions();
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex] = {
          ...sessions[sessionIndex],
          lastActivity: new Date().toISOString(),
          commands: commandCount !== undefined ? commandCount : sessions[sessionIndex].commands,
        };
        
        await this.storage.setObject(StorageKeys.CONNECTION_SESSIONS, sessions);
      }
    } catch (error) {
      ErrorLogger.error('Failed to update session activity', this.logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Discovery Results (temporary cache)
  async getDiscoveryResults(): Promise<DiscoveryResult[]> {
    try {
      const results = await this.storage.getObject<DiscoveryResult[]>(StorageKeys.DISCOVERY_CACHE);
      return results || [];
    } catch (error) {
      ErrorLogger.error('Failed to get discovery results', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  async setDiscoveryResults(results: DiscoveryResult[]): Promise<void> {
    try {
      await this.storage.setObject(StorageKeys.DISCOVERY_CACHE, results);
      ErrorLogger.debug(`Cached ${results.length} discovery results`, this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to set discovery results', this.logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async addDiscoveryResult(result: Omit<DiscoveryResult, 'discoveredAt'>): Promise<void> {
    try {
      const results = await this.getDiscoveryResults();
      const discoveryResult: DiscoveryResult = {
        ...result,
        discoveredAt: new Date().toISOString(),
      };
      
      // Remove existing result for same host:port
      const filteredResults = results.filter(r => !(r.host === result.host && r.port === result.port));
      filteredResults.push(discoveryResult);
      
      // Keep only results from last 24 hours
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
      const recentResults = filteredResults.filter(r => new Date(r.discoveredAt).getTime() > cutoffTime);
      
      await this.setDiscoveryResults(recentResults);
    } catch (error) {
      ErrorLogger.error('Failed to add discovery result', this.logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }

  async clearDiscoveryCache(): Promise<void> {
    try {
      await this.storage.removeItem(StorageKeys.DISCOVERY_CACHE);
      ErrorLogger.info('Cleared discovery cache', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear discovery cache', this.logContext, error instanceof Error ? error : new Error(String(error)));
    }
  }

  // Cleanup and maintenance
  async clearAllConnectionData(): Promise<void> {
    try {
      await this.storage.removeItem(StorageKeys.SAVED_CONNECTIONS);
      await this.storage.removeItem(StorageKeys.CONNECTION_SESSIONS);
      await this.storage.removeItem(StorageKeys.DISCOVERY_CACHE);
      ErrorLogger.info('Cleared all connection data', this.logContext);
    } catch (error) {
      ErrorLogger.error('Failed to clear all connection data', this.logContext, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  // Analytics and insights
  async getConnectionStats(): Promise<{
    totalConnections: number;
    totalSessions: number;
    averageSessionDuration: number;
    mostUsedConnection?: SavedConnection;
    recentSessionCount: number;
  }> {
    try {
      const connections = await this.getSavedConnections();
      const sessions = await this.getConnectionSessions();
      
      const completedSessions = sessions.filter(s => s.duration !== undefined);
      const averageSessionDuration = completedSessions.length > 0 
        ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length
        : 0;

      // Recent sessions (last 7 days)
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentSessionCount = sessions.filter(s => new Date(s.startTime).getTime() > weekAgo).length;

      // Most used connection (by session count)
      const connectionUsage = new Map<string, number>();
      sessions.forEach(s => {
        connectionUsage.set(s.connectionId, (connectionUsage.get(s.connectionId) || 0) + 1);
      });
      
      let mostUsedConnection: SavedConnection | undefined;
      if (connectionUsage.size > 0) {
        const mostUsedId = Array.from(connectionUsage.entries())
          .sort(([,a], [,b]) => b - a)[0][0];
        mostUsedConnection = connections.find(c => c.id === mostUsedId);
      }

      return {
        totalConnections: connections.length,
        totalSessions: sessions.length,
        averageSessionDuration,
        mostUsedConnection,
        recentSessionCount,
      };
    } catch (error) {
      ErrorLogger.error('Failed to get connection stats', this.logContext, error instanceof Error ? error : new Error(String(error)));
      return {
        totalConnections: 0,
        totalSessions: 0,
        averageSessionDuration: 0,
        recentSessionCount: 0,
      };
    }
  }
}

// Export singleton instance
export const connectionRepository = new ConnectionRepository();
