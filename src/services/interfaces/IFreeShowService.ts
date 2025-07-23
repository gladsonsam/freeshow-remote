// Interfaces for dependency injection in FreeShowService

import { Socket } from 'socket.io-client';
import { ConnectionRepository, SettingsRepository } from '../../repositories';

/**
 * Interface for network configuration service
 */
export interface IConfigService {
  getNetworkConfig(): {
    defaultPort: number;
    connectionTimeout: number;
    autoConnectTimeout: number;
    discoveryTimeout: number;
    reconnectDelay: number;
    maxRetries: number;
    keepAliveInterval: number;
  };
  getDefaultShowPorts(): {
    remote: number;
    stage: number;
    control: number;
    output: number;
  };
  loadConfiguration(): Promise<void>;
}

/**
 * Interface for validation service
 */
export interface IValidationService {
  validateHost(host: string): { isValid: boolean; error?: string; sanitizedValue?: string };
  validatePort(port: number): { isValid: boolean; error?: string; sanitizedValue?: number };
  validateIPAddress(ip: string): { isValid: boolean; error?: string; sanitizedValue?: string };
}

/**
 * Interface for error logging service
 */
export interface IErrorLogger {
  debug(message: string, context: string, error?: Error): void;
  info(message: string, context: string, metadata?: any): void;
  warn(message: string, context: string, metadata?: any): void;
  error(message: string, context: string, error: Error): void;
  fatal(message: string, context: string, error: Error): void;
}

/**
 * Interface for socket factory to enable testing with mock sockets
 */
export interface ISocketFactory {
  createSocket(url: string, options?: any): Socket;
}

/**
 * Interface for connection state management
 */
export interface IConnectionStateManager {
  setConnected(connected: boolean): void;
  isConnected(): boolean;
  getConnectionInfo(): {
    host?: string;
    port?: number;
    connectedAt?: Date;
    lastActivity?: Date;
  } | null;
  updateActivity(): void;
  setConnectionDetails(host: string, port: number): void;
}

/**
 * Interface for event management
 */
export interface IEventManager {
  addListener(event: string, callback: (data: any) => void): void;
  removeListener(event: string, callback: (data: any) => void): void;
  removeAllListeners(event?: string): void;
  emit(event: string, data: any): void;
  getListenerCount(event: string): number;
}

/**
 * Main interface for FreeShow service dependencies
 */
export interface IFreeShowServiceDependencies {
  configService: IConfigService;
  validationService: IValidationService;
  errorLogger: IErrorLogger;
  socketFactory: ISocketFactory;
  connectionStateManager: IConnectionStateManager;
  eventManager: IEventManager;
  settingsRepository: SettingsRepository;
  connectionRepository: ConnectionRepository;
}

/**
 * Configuration interface for FreeShow service
 */
export interface IFreeShowServiceConfig {
  enableHeartbeat: boolean;
  enableAutoReconnect: boolean;
  enableConnectionPersistence: boolean;
  enableEventLogging: boolean;
  maxConcurrentRequests: number;
  requestQueueSize: number;
}

/**
 * Interface for FreeShow service itself
 */
export interface IFreeShowService {
  // Connection management
  connect(host: string, port?: number): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  
  // Connection state
  isConnected(): boolean;
  getConnectionInfo(): any;
  
  // Event management
  on(event: string, callback: (data: any) => void): void;
  off(event: string, callback: (data: any) => void): void;
  
  // Remote control
  nextSlide(): Promise<void>;
  previousSlide(): Promise<void>;
  gotoSlide(index: number): Promise<void>;
  toggleBlackout(): Promise<void>;
  
  // Show management
  getShows(): Promise<any[]>;
  getSlides(showId: string): Promise<any[]>;
  loadShow(showId: string): Promise<void>;
  
  // Output management
  getOutputs(): Promise<any[]>;
  setOutput(outputId: string, enabled: boolean): Promise<void>;
  
  // Generic request handling
  sendRequest(action: string, data?: any): Promise<any>;
}
