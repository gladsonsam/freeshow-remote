import Zeroconf, { ZeroconfService, ZeroconfError } from 'react-native-zeroconf';

export interface DiscoveredFreeShowInstance {
  name: string; // Display name (hostname or IP)
  host: string; // mDNS hostname, e.g. 'MyMacBook.local.'
  port: number; // Always use default port 5505
  ip: string; // Primary IP for deduplication
}

export type DiscoveryEventCallback = (instances: DiscoveredFreeShowInstance[]) => void;
export type ErrorEventCallback = (error: string) => void;

import { ErrorLogger } from './ErrorLogger';

class AutoDiscoveryService {
  private zeroconf: Zeroconf | null = null;
  private discoveredServices: Map<string, DiscoveredFreeShowInstance> = new Map();
  private isScanning: boolean = false;
  private scanTimeout: NodeJS.Timeout | null = null;
  private readonly SCAN_TIMEOUT_MS = 15000; // 15 seconds timeout
  
  // Throttling and debouncing for performance optimization
  private updateThrottleTimeout: NodeJS.Timeout | null = null;
  private readonly UPDATE_THROTTLE_MS = 500; // Throttle service updates to max once per 500ms
  private pendingUpdate = false;
  
  private listeners: {
    onServicesUpdated: DiscoveryEventCallback[];
    onError: ErrorEventCallback[];
  } = {
    onServicesUpdated: [],
    onError: [],
  };

  constructor() {
    try {
      ErrorLogger.debug('🔧 AutoDiscovery: Initializing Zeroconf service...', 'AutoDiscoveryService');
      this.zeroconf = new Zeroconf();
      
      if (!this.zeroconf) {
        throw new Error('Zeroconf constructor returned null/undefined');
      }
      
      ErrorLogger.info('✅ AutoDiscovery: Zeroconf initialized successfully', 'AutoDiscoveryService');
      this.setupEventListeners();
    } catch (error) {
      ErrorLogger.error('❌ AutoDiscovery: Failed to initialize Zeroconf', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      
      // Check if we're in Expo Go
      const globalAny = global as any;
      const isExpoGo = __DEV__ && globalAny.__expo?.packagerConnection;
      
      if (isExpoGo) {
        ErrorLogger.info('💡 AutoDiscovery: Running in Expo Go - native modules not available', 'AutoDiscoveryService');
        ErrorLogger.info('🔨 AutoDiscovery: Please create a development build to use autodiscovery', 'AutoDiscoveryService');
      } else {
        ErrorLogger.info('💡 AutoDiscovery: This may be due to missing native dependencies or permissions', 'AutoDiscoveryService');
      }
      
      this.zeroconf = null;
      
      // Don't notify error immediately - wait until discovery is actually attempted
    }
  }

  private setupEventListeners(): void {
    if (!this.zeroconf) {
      ErrorLogger.warn('⚠️ AutoDiscovery: Zeroconf not initialized, skipping event listeners setup', 'AutoDiscoveryService');
      return;
    }

    // Service found
    this.zeroconf.on('start', () => {
      ErrorLogger.info('🔍 AutoDiscovery: Started scanning for FreeShow instances', 'AutoDiscoveryService');
    });

    this.zeroconf.on('stop', () => {
      ErrorLogger.info('🛑 AutoDiscovery: Stopped scanning', 'AutoDiscoveryService');
      this.isScanning = false;
      this.clearScanTimeout();
    });

    this.zeroconf.on('error', (error: ZeroconfError) => {
      ErrorLogger.error('❌ AutoDiscovery Error', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      this.notifyError(`Discovery error: ${error.message || 'Unknown error'}`);
    });

    // Service resolved (we get the full details)
    this.zeroconf.on('resolved', (service: ZeroconfService) => {
      ErrorLogger.info('✅ AutoDiscovery: FreeShow service resolved', 'AutoDiscoveryService', { service });
      
      // Get the primary IP address
      const primaryIP = service.addresses?.[0] || service.host;
      
      // Skip if we already have this IP address (prevent duplicates)
      const existingService = Array.from(this.discoveredServices.values())
        .find(existing => existing.ip === primaryIP);
      
      if (existingService) {
        ErrorLogger.debug(`🔍 AutoDiscovery: Skipping duplicate IP ${primaryIP}`, 'AutoDiscoveryService');
        return;
      }
      
      // Prefer the service name (human-friendly) if available, else fallback to IP
      const displayName = service.name && service.name.trim() !== '' ? service.name : primaryIP;
      const instance: DiscoveredFreeShowInstance = {
        name: displayName,
        host: service.host || '',
        port: 5505, // Always use default FreeShow API port
        ip: primaryIP,
      };

      // Use IP as the unique key for deduplication
      this.discoveredServices.set(primaryIP, instance);
      
      this.notifyServicesUpdatedThrottled();
    });

    // Service removed
    this.zeroconf.on('remove', (service: ZeroconfService) => {
      ErrorLogger.info('🗑️ AutoDiscovery: FreeShow service removed', 'AutoDiscoveryService', { serviceName: service.name });
      const primaryIP = service.addresses?.[0] || service.host;
      this.discoveredServices.delete(primaryIP);
      this.notifyServicesUpdatedThrottled();
    });
  }

  /**
   * Start scanning for FreeShow services on the network
   * FreeShow publishes services with type "freeshow" over UDP
   */
  startDiscovery(): void {
    if (!this.zeroconf) {
      const error = 'Autodiscovery requires a development build. Please use manual connection.';
      ErrorLogger.error('❌ AutoDiscovery', 'AutoDiscoveryService', new Error(String(error)));
      this.notifyError(error);
      return;
    }

    if (this.isScanning) {
      ErrorLogger.warn('⚠️ AutoDiscovery: Already scanning', 'AutoDiscoveryService');
      return;
    }

    try {
      ErrorLogger.info(`🔍 AutoDiscovery: Starting scan for FreeShow services (${this.SCAN_TIMEOUT_MS / 1000}s timeout)...`, 'AutoDiscoveryService');
      this.discoveredServices.clear();
      this.isScanning = true;
      
      // Set a timeout to automatically stop scanning
      this.setScanTimeout();
      
      // Scan for FreeShow services
      // FreeShow publishes with type "freeshow" and protocol "udp"
      this.zeroconf.scan('freeshow', 'udp');
    } catch (error) {
      ErrorLogger.error('❌ AutoDiscovery: Failed to start scanning', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      this.isScanning = false;
      this.notifyError(`Failed to start discovery: ${error}. Try using manual connection instead.`);
    }
  }

  /**
   * Stop scanning for services
   */
  stopDiscovery(): void {
    if (!this.zeroconf) {
      ErrorLogger.warn('⚠️ AutoDiscovery: Zeroconf not initialized', 'AutoDiscoveryService');
      return;
    }

    if (!this.isScanning) {
      return;
    }

    try {
      ErrorLogger.info('🛑 AutoDiscovery: Stopping scan...', 'AutoDiscoveryService');
      this.clearScanTimeout();
      this.isScanning = false;
      this.zeroconf.stop();
    } catch (error) {
      ErrorLogger.error('❌ AutoDiscovery: Failed to stop scanning', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      this.notifyError(`Failed to stop discovery: ${error}`);
    }
  }

  /**
   * Get all currently discovered FreeShow instances
   */
  getDiscoveredServices(): DiscoveredFreeShowInstance[] {
    return Array.from(this.discoveredServices.values());
  }

  /**
   * Check if currently scanning
   */
  isActive(): boolean {
    return this.isScanning;
  }

  /**
   * Check if autodiscovery is available (requires development build)
   */
  isAvailable(): boolean {
    return this.zeroconf !== null;
  }

  /**
   * Add listener for when services are updated
   */
  onServicesUpdated(callback: DiscoveryEventCallback): void {
    this.listeners.onServicesUpdated.push(callback);
  }

  /**
   * Add listener for errors
   */
  onError(callback: ErrorEventCallback): void {
    this.listeners.onError.push(callback);
  }

  /**
   * Remove a specific listener
   */
  removeListener(event: 'onServicesUpdated' | 'onError', callback: DiscoveryEventCallback | ErrorEventCallback): void {
    if (event === 'onServicesUpdated') {
      const index = this.listeners.onServicesUpdated.indexOf(callback as DiscoveryEventCallback);
      if (index > -1) {
        this.listeners.onServicesUpdated.splice(index, 1);
      }
    } else if (event === 'onError') {
      const index = this.listeners.onError.indexOf(callback as ErrorEventCallback);
      if (index > -1) {
        this.listeners.onError.splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.onServicesUpdated = [];
    this.listeners.onError = [];
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopDiscovery();
    this.removeAllListeners();
    this.discoveredServices.clear();
    this.clearScanTimeout();
    this.clearUpdateThrottle();
  }

  private setScanTimeout(): void {
    this.clearScanTimeout();
    this.scanTimeout = setTimeout(() => {
      const discoveredCount = this.discoveredServices.size;
      if (discoveredCount === 0) {
        ErrorLogger.info(`⏰ AutoDiscovery: Scan timeout reached (${this.SCAN_TIMEOUT_MS / 1000}s) with no devices found, stopping discovery`, 'AutoDiscoveryService');
        this.notifyError(`No FreeShow devices found after ${this.SCAN_TIMEOUT_MS / 1000} seconds. Try manual connection or ensure FreeShow is running on your network.`);
      } else {
        ErrorLogger.info(`⏰ AutoDiscovery: Scan timeout reached (${this.SCAN_TIMEOUT_MS / 1000}s), found ${discoveredCount} device(s), stopping discovery`, 'AutoDiscoveryService');
      }
      this.stopDiscovery();
    }, this.SCAN_TIMEOUT_MS);
  }

  private clearScanTimeout(): void {
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  private clearUpdateThrottle(): void {
    if (this.updateThrottleTimeout) {
      clearTimeout(this.updateThrottleTimeout);
      this.updateThrottleTimeout = null;
    }
    this.pendingUpdate = false;
  }

  /**
   * Throttled version of notifyServicesUpdated to prevent excessive updates
   * This improves performance by batching rapid discovery events
   */
  private notifyServicesUpdatedThrottled(): void {
    // If we already have a pending update, just mark that we need to update
    if (this.updateThrottleTimeout) {
      this.pendingUpdate = true;
      return;
    }

    // Immediately notify for the first event
    this.notifyServicesUpdated();
    
    // Set up throttling for subsequent events
    this.updateThrottleTimeout = setTimeout(() => {
      this.updateThrottleTimeout = null;
      
      // If there was a pending update during throttle period, process it now
      if (this.pendingUpdate) {
        this.pendingUpdate = false;
        this.notifyServicesUpdated();
      }
    }, this.UPDATE_THROTTLE_MS);
  }

  private notifyServicesUpdated(): void {
    const services = this.getDiscoveredServices();
    ErrorLogger.debug(`🔄 AutoDiscovery: Notifying ${this.listeners.onServicesUpdated.length} listeners of ${services.length} services`, 'AutoDiscoveryService');
    
    this.listeners.onServicesUpdated.forEach(callback => {
      try {
        callback(services);
      } catch (error) {
        ErrorLogger.error('❌ Error in services updated callback', 'AutoDiscoveryService', error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private notifyError(error: string): void {
    ErrorLogger.warn(`⚠️ AutoDiscovery: ${error}`, 'AutoDiscoveryService');
    
    this.listeners.onError.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        ErrorLogger.error('❌ Error in error callback', 'AutoDiscoveryService', err instanceof Error ? err : new Error(String(err)));
      }
    });
  }
}

// Export singleton instance
export const autoDiscoveryService = new AutoDiscoveryService();
