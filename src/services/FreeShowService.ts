// Refactored FreeShowService with dependency injection

import { Socket } from 'socket.io-client';
import { 
  IFreeShowService, 
  IFreeShowServiceDependencies, 
  IFreeShowServiceConfig 
} from './interfaces/IFreeShowService';
import { 
  RequestQueueManager,
  defaultFreeShowServiceConfig 
} from './implementations/FreeShowServiceImplementations';

// Error types
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

/**
 * FreeShow service with dependency injection
 * No longer a singleton - instances can be created with different dependencies
 */
export class FreeShowService implements IFreeShowService {
  private socket: Socket | null = null;
  private currentHost: string | null = null;
  private currentPort: number | null = null;
  private currentReconnectionAttempt: number = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private requestQueue: RequestQueueManager;
  private readonly logContext = 'FreeShowService';

  // Dependencies
  private readonly dependencies: IFreeShowServiceDependencies;
  private readonly config: IFreeShowServiceConfig;

  constructor(
    dependencies: IFreeShowServiceDependencies,
    config: IFreeShowServiceConfig = defaultFreeShowServiceConfig
  ) {
    this.dependencies = dependencies;
    this.config = config;
    this.requestQueue = new RequestQueueManager(
      config.maxConcurrentRequests,
      config.requestQueueSize
    );

    // Initialize configuration
    this.initializeConfiguration();
  }

  private async initializeConfiguration(): Promise<void> {
    try {
      await this.dependencies.configService.loadConfiguration();
      this.dependencies.errorLogger.debug(
        'FreeShowService configuration loaded', 
        this.logContext
      );
    } catch (error) {
      this.dependencies.errorLogger.error(
        'Failed to load FreeShowService configuration', 
        this.logContext,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Connection management
  async connect(host: string, port?: number, nickname?: string): Promise<void> {
    try {
      // Validate inputs
      const hostValidation = this.dependencies.validationService.validateHost(host);
      if (!hostValidation.isValid) {
        throw new FreeShowConnectionError(
          hostValidation.error || 'Invalid host',
          'INVALID_HOST'
        );
      }

      // Use default port if not provided
      const finalPort = port ?? this.dependencies.configService.getNetworkConfig().defaultPort;
      const portValidation = this.dependencies.validationService.validatePort(finalPort);
      if (!portValidation.isValid) {
        throw new FreeShowConnectionError(
          portValidation.error || 'Invalid port',
          'INVALID_PORT'
        );
      }

      // Disconnect if already connected
      if (this.socket) {
        await this.disconnect();
      }

      this.currentHost = hostValidation.sanitizedValue || host;
      this.currentPort = portValidation.sanitizedValue || finalPort;

      const url = `ws://${this.currentHost}:${this.currentPort}`;
      const networkConfig = this.dependencies.configService.getNetworkConfig();
      
      this.dependencies.errorLogger.info(
        `Attempting to connect to FreeShow`, 
        this.logContext,
        { host: this.currentHost, port: this.currentPort }
      );

      this.socket = this.dependencies.socketFactory.createSocket(url, {
        timeout: networkConfig.connectionTimeout,
      });

      await this.setupSocketEventHandlers();
      await this.performConnection();

      // Save successful connection
      if (this.config.enableConnectionPersistence) {
        await this.dependencies.settingsRepository.addToConnectionHistory(
          this.currentHost,
          this.currentPort,
          nickname // Only pass nickname if explicitly provided, otherwise preserve existing
        );
      }

      // Start heartbeat if enabled
      if (this.config.enableHeartbeat) {
        this.startHeartbeat();
      }

    } catch (error) {
      this.dependencies.errorLogger.error(
        'Failed to connect to FreeShow',
        this.logContext,
        error instanceof Error ? error : new Error(String(error))
      );

      if (error instanceof FreeShowConnectionError) {
        throw error;
      }

      throw new FreeShowConnectionError(
        `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONNECTION_FAILED',
        error
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.dependencies.errorLogger.info('Disconnecting from FreeShow', this.logContext);

      // Stop heartbeat
      this.stopHeartbeat();

      // Clear request queue
      this.requestQueue.clearQueue();

      // Disconnect socket
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Update state
      this.dependencies.connectionStateManager.setConnected(false);
      this.currentHost = null;
      this.currentPort = null;
      this.currentReconnectionAttempt = 0;

      // Emit disconnect event
      this.dependencies.eventManager.emit('disconnect', {
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.dependencies.errorLogger.error(
        'Error during disconnect',
        this.logContext,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  async reconnect(): Promise<void> {
    if (!this.currentHost || !this.currentPort) {
      throw new FreeShowConnectionError(
        'Cannot reconnect: no previous connection information',
        'NO_CONNECTION_INFO'
      );
    }

    const networkConfig = this.dependencies.configService.getNetworkConfig();
    
    if (this.currentReconnectionAttempt >= networkConfig.maxRetries) {
      throw new FreeShowConnectionError(
        'Maximum reconnection attempts reached',
        'MAX_RECONNECTION_ATTEMPTS'
      );
    }

    this.currentReconnectionAttempt++;
    this.dependencies.errorLogger.info(
      `Reconnection attempt ${this.currentReconnectionAttempt}/${networkConfig.maxRetries}`,
      this.logContext
    );

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, networkConfig.reconnectDelay));

    // Don't pass nickname during reconnect to preserve existing nickname
    await this.connect(this.currentHost, this.currentPort);
  }

  private async performConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new FreeShowConnectionError('Socket not initialized', 'NO_SOCKET'));
        return;
      }

      const networkConfig = this.dependencies.configService.getNetworkConfig();
      const timeout = setTimeout(() => {
        reject(new FreeShowTimeoutError(
          'Connection timeout',
          networkConfig.connectionTimeout
        ));
      }, networkConfig.connectionTimeout);

      this.socket.once('connect', () => {
        clearTimeout(timeout);
        this.dependencies.connectionStateManager.setConnected(true);
        this.dependencies.connectionStateManager.setConnectionDetails(
          this.currentHost!,
          this.currentPort!
        );
        this.currentReconnectionAttempt = 0;
        
        this.dependencies.errorLogger.info(
          'Successfully connected to FreeShow',
          this.logContext,
          { host: this.currentHost, port: this.currentPort }
        );

        // Emit connect event
        this.dependencies.eventManager.emit('connect', {
          host: this.currentHost,
          port: this.currentPort,
          timestamp: new Date().toISOString(),
        });

        resolve();
      });

      this.socket.once('connect_error', (error: any) => {
        clearTimeout(timeout);
        reject(new FreeShowNetworkError(
          `Connection error: ${error.message || 'Unknown error'}`,
          error.code
        ));
      });

      this.socket.connect();
    });
  }

  private async setupSocketEventHandlers(): Promise<void> {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason: string) => {
      this.dependencies.errorLogger.warn(
        `Disconnected from FreeShow: ${reason}`,
        this.logContext
      );

      this.dependencies.connectionStateManager.setConnected(false);
      this.dependencies.eventManager.emit('disconnect', { reason, timestamp: new Date().toISOString() });

      // Auto-reconnect if enabled and not manually disconnected
      if (this.config.enableAutoReconnect && reason !== 'io client disconnect') {
        setTimeout(() => {
          this.reconnect().catch(error => {
            this.dependencies.errorLogger.error(
              'Auto-reconnection failed',
              this.logContext,
              error instanceof Error ? error : new Error(String(error))
            );
          });
        }, 1000);
      }
    });

    this.socket.on('error', (error: any) => {
      this.dependencies.errorLogger.error(
        'Socket error',
        this.logContext,
        new Error(error.message || 'Unknown socket error')
      );
      this.dependencies.eventManager.emit('error', { error, timestamp: new Date().toISOString() });
    });

    // FreeShow-specific events
    this.socket.on('shows', (data: any) => {
      this.dependencies.connectionStateManager.updateActivity();
      if (this.config.enableEventLogging) {
        this.dependencies.errorLogger.debug('Received shows data', this.logContext);
      }
      this.dependencies.eventManager.emit('shows', data);
    });

    this.socket.on('slides', (data: any) => {
      this.dependencies.connectionStateManager.updateActivity();
      if (this.config.enableEventLogging) {
        this.dependencies.errorLogger.debug('Received slides data', this.logContext);
      }
      this.dependencies.eventManager.emit('slides', data);
    });

    this.socket.on('outputs', (data: any) => {
      this.dependencies.connectionStateManager.updateActivity();
      if (this.config.enableEventLogging) {
        this.dependencies.errorLogger.debug('Received outputs data', this.logContext);
      }
      this.dependencies.eventManager.emit('outputs', data);
    });

    // Generic message handler
    this.socket.onAny((event: string, data: any) => {
      this.dependencies.connectionStateManager.updateActivity();
      if (this.config.enableEventLogging) {
        this.dependencies.errorLogger.debug(`Received event: ${event}`, this.logContext);
      }
      this.dependencies.eventManager.emit(event, data);
    });
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    const networkConfig = this.dependencies.configService.getNetworkConfig();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.dependencies.connectionStateManager.isConnected()) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, networkConfig.keepAliveInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // State methods
  isConnected(): boolean {
    return this.dependencies.connectionStateManager.isConnected();
  }

  getConnectionInfo(): any {
    return this.dependencies.connectionStateManager.getConnectionInfo();
  }

  // Event management
  on(event: string, callback: (data: any) => void): void {
    this.dependencies.eventManager.addListener(event, callback);
  }

  off(event: string, callback: (data: any) => void): void {
    this.dependencies.eventManager.removeListener(event, callback);
  }

  // Remote control methods
  async nextSlide(): Promise<void> {
    return this.sendRequest('next');
  }

  async previousSlide(): Promise<void> {
    return this.sendRequest('previous');
  }

  async gotoSlide(index: number): Promise<void> {
    return this.sendRequest('goto', { index });
  }

  async toggleBlackout(): Promise<void> {
    return this.sendRequest('blackout');
  }

  // Show management
  async getShows(): Promise<any[]> {
    return this.sendRequest('get_shows');
  }

  async getSlides(showId: string): Promise<any[]> {
    return this.sendRequest('get_slides', { showId });
  }

  async loadShow(showId: string): Promise<void> {
    return this.sendRequest('load_show', { showId });
  }

  // Output management
  async getOutputs(): Promise<any[]> {
    return this.sendRequest('get_outputs');
  }

  async setOutput(outputId: string, enabled: boolean): Promise<void> {
    return this.sendRequest('set_output', { outputId, enabled });
  }

  // Generic request handling with queue management
  async sendRequest(action: string, data?: any): Promise<any> {
    if (!this.socket || !this.dependencies.connectionStateManager.isConnected()) {
      throw new FreeShowConnectionError(
        'Not connected to FreeShow',
        'NOT_CONNECTED'
      );
    }

    return this.requestQueue.addRequest(action, data, this.executeRequest.bind(this));
  }

  private async executeRequest(action: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new FreeShowConnectionError('Socket not available', 'NO_SOCKET'));
        return;
      }

      const networkConfig = this.dependencies.configService.getNetworkConfig();
      const timeout = setTimeout(() => {
        reject(new FreeShowTimeoutError(
          `Request timeout for action: ${action}`,
          networkConfig.connectionTimeout
        ));
      }, networkConfig.connectionTimeout);

      // Create response handler
      const responseHandler = (response: any) => {
        clearTimeout(timeout);
        this.dependencies.connectionStateManager.updateActivity();
        
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response.data || response);
        }
      };

      // Listen for response
      this.socket.once(`${action}_response`, responseHandler);

      // Send request
      this.socket.emit(action, data || {});

      this.dependencies.errorLogger.debug(
        `Sent request: ${action}`,
        this.logContext
      );
    });
  }

  // Utility methods
  getRequestQueueStatus(): any {
    return this.requestQueue.getQueueStatus();
  }

  clearRequestQueue(): void {
    this.requestQueue.clearQueue();
  }
}
