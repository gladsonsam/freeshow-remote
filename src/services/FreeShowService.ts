import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { ErrorLogger } from './ErrorLogger';
import { configService } from '../config/AppConfig';
import { ValidationService } from './InputValidationService';

// Error types for better error handling
export class FreeShowConnectionError extends Error {
  constructor(message: string, public code?: string, public details?: any) {
    super(message);
    this.name = 'FreeShowConnectionError';
  }
}

export class FreeShowTimeoutError extends Error {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'FreeShowTimeoutError';
  }
}

export class FreeShowNetworkError extends Error {
  constructor(message: string, public networkCode?: string) {
    super(message);
    this.name = 'FreeShowNetworkError';
  }
}

class FreeShowService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};
  private networkConfig = configService.getNetworkConfig();
  private currentReconnectionAttempt: number = 0;

  constructor() {
    // Initialize configuration on service creation
    this.initializeConfiguration();
  }

  private async initializeConfiguration(): Promise<void> {
    try {
      await configService.loadConfiguration();
      this.networkConfig = configService.getNetworkConfig();
      ErrorLogger.debug('FreeShowService configuration loaded', 'FreeShowService', 
        new Error(`Config: ${JSON.stringify(this.networkConfig)}`)
      );
    } catch (error) {
      ErrorLogger.error('Failed to load FreeShowService configuration', 'FreeShowService', 
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async connect(host: string, port: number = this.networkConfig.defaultPort): Promise<boolean> {
    try {
      const url = `http://${host}:${port}`;
      ErrorLogger.info(`🔌 Attempting to connect to FreeShow at: ${url}`, 'FreeShowService', new Error(`Platform: ${Platform.OS}`));
      
      // Validate and sanitize input parameters using InputValidationService
      const hostValidation = ValidationService.validateHost(host);
      if (!hostValidation.isValid) {
        throw new FreeShowConnectionError(`Invalid host: ${hostValidation.error}`, 'INVALID_HOST');
      }
      
      const portValidation = ValidationService.validatePort(port);
      if (!portValidation.isValid) {
        throw new FreeShowConnectionError(`Invalid port: ${portValidation.error}`, 'INVALID_PORT');
      }

      // Use sanitized values
      const sanitizedHost = hostValidation.sanitizedValue as string;
      const sanitizedPort = portValidation.sanitizedValue as number;

      // Test basic HTTP connectivity first with proper error handling
      try {
        await this.testHttpConnectivity(url);
      } catch (httpError) {
        ErrorLogger.warn('⚠️ HTTP test failed', 'FreeShowService', httpError instanceof Error ? httpError : new Error(String(httpError)));
        // Continue with socket connection attempt even if HTTP test fails
      }
      
      return await this.establishSocketConnection(url);
      
    } catch (error) {
      ErrorLogger.error('Connection failed', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
      
      // Re-throw with more specific error information
      if (error instanceof FreeShowConnectionError || 
          error instanceof FreeShowTimeoutError || 
          error instanceof FreeShowNetworkError) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new FreeShowConnectionError(
        `Failed to connect to FreeShow: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_FAILED',
        error
      );
    }
  }

  private async testHttpConnectivity(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new FreeShowTimeoutError('HTTP connectivity test timeout', 5000));
      }, 5000);
      
      fetch(url, { 
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      })
      .then(response => {
        clearTimeout(timeoutId);
        ErrorLogger.info('✅ HTTP test successful', 'FreeShowService', { status: response.status });
        resolve();
      })
      .catch(httpError => {
        clearTimeout(timeoutId);
        
        if (httpError.name === 'AbortError') {
          reject(new FreeShowTimeoutError('HTTP test aborted due to timeout', 5000));
        } else {
          reject(new FreeShowNetworkError(
            `HTTP connectivity test failed: ${httpError.message}`,
            httpError.code
          ));
        }
      });
    });
  }

  private async establishSocketConnection(url: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(url, {
          timeout: 15000,
          transports: ['websocket', 'polling'], // Add polling as fallback
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false,
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: this.networkConfig.maxRetries
        });

        // Connection timeout handler
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            this.cleanupConnection();
            reject(new FreeShowTimeoutError(
              `Connection timeout after ${this.networkConfig.connectionTimeout}ms`, 
              this.networkConfig.connectionTimeout
            ));
          }
        }, this.networkConfig.connectionTimeout);

        this.socket.on('connect', () => {
          try {
            clearTimeout(connectionTimeout);
            ErrorLogger.info('✅ Connected to FreeShow', 'FreeShowService');
            this.isConnected = true;
            this.currentReconnectionAttempt = 0;
            resolve(true);
          } catch (error) {
            ErrorLogger.error('Error in connect handler', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
            reject(new FreeShowConnectionError('Error processing connection', 'CONNECT_HANDLER_ERROR', error));
          }
        });

        this.socket.on('disconnect', (reason) => {
          try {
            ErrorLogger.info('❌ Disconnected from FreeShow', 'FreeShowService', { reason });
            this.isConnected = false;
            
            // Emit disconnect event to listeners
            this.emit('disconnect', { reason });
          } catch (error) {
            ErrorLogger.error('Error in disconnect handler', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
          }
        });

        this.socket.on('connect_error', (error) => {
          try {
            clearTimeout(connectionTimeout);
            ErrorLogger.error('Connection error', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
            
            this.currentReconnectionAttempt++;
            
            if (this.currentReconnectionAttempt >= this.networkConfig.maxRetries) {
              this.cleanupConnection();
              reject(new FreeShowConnectionError(
                `Failed to connect after ${this.networkConfig.maxRetries} attempts: ${error.message}`,
                'MAX_RECONNECTION_ATTEMPTS',
                error
              ));
            } else {
              // Let socket.io handle the reconnection
              ErrorLogger.debug(`Reconnection attempt ${this.currentReconnectionAttempt}/${this.networkConfig.maxRetries}`, 'FreeShowService');
            }
          } catch (handlerError) {
            ErrorLogger.error('Error in connect_error handler', 'FreeShowService', handlerError instanceof Error ? handlerError : new Error(String(handlerError)));
            reject(new FreeShowConnectionError('Error processing connection error', 'ERROR_HANDLER_ERROR', handlerError));
          }
        });

        this.socket.on('error', (error) => {
          try {
            ErrorLogger.error('Socket error', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
            this.emit('error', error);
          } catch (handlerError) {
            ErrorLogger.error('Error in error handler', 'FreeShowService', handlerError instanceof Error ? handlerError : new Error(String(handlerError)));
          }
        });

      } catch (socketError) {
        reject(new FreeShowConnectionError(
          `Failed to create socket connection: ${socketError instanceof Error ? socketError.message : 'Unknown error'}`,
          'SOCKET_CREATION_ERROR',
          socketError
        ));
      }
    });
  }

  private cleanupConnection(): void {
    try {
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      this.isConnected = false;
    } catch (error) {
      ErrorLogger.error('Error during connection cleanup', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
    }
  }

  disconnect(): void {
    try {
      ErrorLogger.info('Disconnecting from FreeShow...', 'FreeShowService');
      
      if (this.socket) {
        // Remove all listeners before disconnecting
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.isConnected = false;
      this.listeners = {};
      this.currentReconnectionAttempt = 0;
      
      ErrorLogger.info('Successfully disconnected from FreeShow', 'FreeShowService');
    } catch (error) {
      ErrorLogger.error('Error during disconnect', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
      
      // Force cleanup even if error occurs
      this.socket = null;
      this.isConnected = false;
      this.listeners = {};
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket !== null;
  }

  // Remote Control Methods with error handling
  nextSlide(): void {
    try {
      if (!this.socket || !this.isConnected) {
        throw new FreeShowConnectionError('Not connected to FreeShow', 'NOT_CONNECTED');
      }
      
      this.socket.emit('NEXT');
      ErrorLogger.debug('Sent NEXT command', 'FreeShowService');
    } catch (error) {
      ErrorLogger.error('Error sending NEXT command', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
      this.emit('command_error', { command: 'NEXT', error });
      throw error;
    }
  }

  previousSlide(): void {
    try {
      if (!this.socket || !this.isConnected) {
        throw new FreeShowConnectionError('Not connected to FreeShow', 'NOT_CONNECTED');
      }
      
      this.socket.emit('PREVIOUS');
      ErrorLogger.debug('Sent PREVIOUS command', 'FreeShowService');
    } catch (error) {
      ErrorLogger.error('Error sending PREVIOUS command', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
      this.emit('command_error', { command: 'PREVIOUS', error });
      throw error;
    }
  }

  clearOutput(): void {
    try {
      if (!this.socket || !this.isConnected) {
        throw new FreeShowConnectionError('Not connected to FreeShow', 'NOT_CONNECTED');
      }
      
      this.socket.emit('CLEAR_OUTPUT');
      ErrorLogger.debug('Sent CLEAR_OUTPUT command', 'FreeShowService');
    } catch (error) {
      ErrorLogger.error('Error sending CLEAR_OUTPUT command', 'FreeShowService', error instanceof Error ? error : new Error(String(error)));
      this.emit('command_error', { command: 'CLEAR_OUTPUT', error });
      throw error;
    }
  }

  clearAll(): void {
    try {
      if (!this.socket || !this.isConnected) {
        throw new FreeShowConnectionError('Not connected to FreeShow', 'NOT_CONNECTED');
      }
      
      this.socket.emit('CLEAR_ALL');
      console.log('Sent CLEAR_ALL command');
    } catch (error) {
      console.error('Error sending CLEAR_ALL command:', error);
      this.emit('command_error', { command: 'CLEAR_ALL', error });
      throw error;
    }
  }

  clearSlide(): void {
    try {
      if (!this.socket || !this.isConnected) {
        throw new FreeShowConnectionError('Not connected to FreeShow', 'NOT_CONNECTED');
      }
      
      this.socket.emit('CLEAR_SLIDE');
      console.log('Sent CLEAR_SLIDE command');
    } catch (error) {
      console.error('Error sending CLEAR_SLIDE command:', error);
      this.emit('command_error', { command: 'CLEAR_SLIDE', error });
      throw error;
    }
  }

  // Event system for listening to socket events with error handling
  on(event: string, callback: (data: any) => void): void {
    try {
      if (!event || typeof event !== 'string') {
        throw new Error('Invalid event name');
      }
      
      if (!callback || typeof callback !== 'function') {
        throw new Error('Invalid callback function');
      }
      
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      
      this.listeners[event].push(callback);
      console.log(`Added listener for event: ${event}`);
    } catch (error) {
      console.error('Error adding event listener:', error);
      throw error;
    }
  }

  off(event: string, callback: (data: any) => void): void {
    try {
      if (!event || typeof event !== 'string') {
        throw new Error('Invalid event name');
      }
      
      if (this.listeners[event]) {
        if (callback) {
          this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        } else {
          this.listeners[event] = [];
        }
        console.log(`Removed listener(s) for event: ${event}`);
      }
    } catch (error) {
      console.error('Error removing event listener:', error);
      throw error;
    }
  }

  private emit(event: string, data: any): void {
    try {
      if (this.listeners[event]) {
        this.listeners[event].forEach(callback => {
          try {
            callback(data);
          } catch (callbackError) {
            console.error(`Error in callback for event ${event}:`, callbackError);
          }
        });
      }
    } catch (error) {
      console.error('Error emitting event:', error);
    }
  }

  // Remove event listeners with error handling
  removeListener(type: string, callback?: (data: any) => void): void {
    try {
      if (!this.listeners[type]) return;
      
      if (callback) {
        const index = this.listeners[type].indexOf(callback);
        if (index > -1) {
          this.listeners[type].splice(index, 1);
          console.log(`Removed specific listener for type: ${type}`);
        }
      } else {
        this.listeners[type] = [];
        console.log(`Removed all listeners for type: ${type}`);
      }
    } catch (error) {
      console.error('Error removing listener:', error);
    }
  }

  removeAllListeners(): void {
    try {
      this.listeners = {};
      console.log('Removed all event listeners');
    } catch (error) {
      console.error('Error removing all listeners:', error);
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.socket || !this.isConnected) {
        return false;
      }
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 3000);
        
        // Simple ping test
        this.socket!.emit('ping', Date.now());
        
        const pongHandler = () => {
          clearTimeout(timeout);
          this.socket!.off('pong', pongHandler);
          resolve(true);
        };
        
        this.socket!.on('pong', pongHandler);
      });
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  // Get connection info
  getConnectionInfo(): { 
    isConnected: boolean; 
    socketId: string | null; 
    listenerCount: number;
    reconnectionAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      socketId: this.socket?.id || null,
      listenerCount: Object.keys(this.listeners).length,
      reconnectionAttempts: this.currentReconnectionAttempt,
    };
  }
}

export const freeShowService = new FreeShowService();
