import Zeroconf, { ZeroconfService, ZeroconfError } from 'react-native-zeroconf';

export interface DiscoveredFreeShowInstance {
  name: string;
  host: string;
  port: number;
  ip?: string;
  txt?: { [key: string]: string };
  fullName?: string;
}

export type DiscoveryEventCallback = (instances: DiscoveredFreeShowInstance[]) => void;
export type ErrorEventCallback = (error: string) => void;

class AutoDiscoveryService {
  private zeroconf: Zeroconf | null = null;
  private discoveredServices: Map<string, DiscoveredFreeShowInstance> = new Map();
  private isScanning: boolean = false;
  private listeners: {
    onServicesUpdated: DiscoveryEventCallback[];
    onError: ErrorEventCallback[];
  } = {
    onServicesUpdated: [],
    onError: [],
  };

  constructor() {
    try {
      console.log('🔧 AutoDiscovery: Initializing Zeroconf service...');
      this.zeroconf = new Zeroconf();
      
      if (!this.zeroconf) {
        throw new Error('Zeroconf constructor returned null/undefined');
      }
      
      console.log('✅ AutoDiscovery: Zeroconf initialized successfully');
      this.setupEventListeners();
    } catch (error) {
      console.error('❌ AutoDiscovery: Failed to initialize Zeroconf:', error);
      
      // Check if we're in Expo Go
      const globalAny = global as any;
      const isExpoGo = __DEV__ && globalAny.__expo?.packagerConnection;
      
      if (isExpoGo) {
        console.log('💡 AutoDiscovery: Running in Expo Go - native modules not available');
        console.log('🔨 AutoDiscovery: Please create a development build to use autodiscovery');
      } else {
        console.log('💡 AutoDiscovery: This may be due to missing native dependencies or permissions');
      }
      
      this.zeroconf = null;
      
      // Don't notify error immediately - wait until discovery is actually attempted
    }
  }

  private setupEventListeners(): void {
    if (!this.zeroconf) {
      console.warn('⚠️ AutoDiscovery: Zeroconf not initialized, skipping event listeners setup');
      return;
    }

    // Service found
    this.zeroconf.on('start', () => {
      console.log('🔍 AutoDiscovery: Started scanning for FreeShow instances');
    });

    this.zeroconf.on('stop', () => {
      console.log('🛑 AutoDiscovery: Stopped scanning');
      this.isScanning = false;
    });

    this.zeroconf.on('error', (error: ZeroconfError) => {
      console.error('❌ AutoDiscovery Error:', error);
      this.notifyError(`Discovery error: ${error.message || 'Unknown error'}`);
    });

    // Service resolved (we get the full details)
    this.zeroconf.on('resolved', (service: ZeroconfService) => {
      console.log('✅ AutoDiscovery: FreeShow service resolved:', service);
      
      const instance: DiscoveredFreeShowInstance = {
        name: service.name,
        host: service.host,
        port: service.port,
        ip: service.addresses?.[0] || service.host,
        txt: service.txt || {},
        fullName: service.fullName,
      };

      // Use fullName as unique key, fallback to name+host+port
      const key = service.fullName || `${service.name}-${service.host}-${service.port}`;
      this.discoveredServices.set(key, instance);
      
      this.notifyServicesUpdated();
    });

    // Service removed
    this.zeroconf.on('remove', (service: ZeroconfService) => {
      console.log('🗑️ AutoDiscovery: FreeShow service removed:', service.name);
      const key = service.fullName || `${service.name}-${service.host}-${service.port}`;
      this.discoveredServices.delete(key);
      this.notifyServicesUpdated();
    });
  }

  /**
   * Start scanning for FreeShow services on the network
   * FreeShow publishes services with type "freeshow" over UDP
   */
  startDiscovery(): void {
    if (!this.zeroconf) {
      const error = 'Autodiscovery requires a development build. Please use manual connection.';
      console.error('❌ AutoDiscovery:', error);
      this.notifyError(error);
      return;
    }

    if (this.isScanning) {
      console.log('⚠️ AutoDiscovery: Already scanning');
      return;
    }

    try {
      console.log('🔍 AutoDiscovery: Starting scan for FreeShow services...');
      this.discoveredServices.clear();
      this.isScanning = true;
      
      // Scan for FreeShow services
      // FreeShow publishes with type "freeshow" and protocol "udp"
      this.zeroconf.scan('freeshow', 'udp');
    } catch (error) {
      console.error('❌ AutoDiscovery: Failed to start scanning:', error);
      this.isScanning = false;
      this.notifyError(`Failed to start discovery: ${error}. Try using manual connection instead.`);
    }
  }

  /**
   * Stop scanning for services
   */
  stopDiscovery(): void {
    if (!this.zeroconf) {
      console.warn('⚠️ AutoDiscovery: Zeroconf not initialized');
      return;
    }

    if (!this.isScanning) {
      return;
    }

    try {
      console.log('🛑 AutoDiscovery: Stopping scan...');
      this.zeroconf.stop();
      this.isScanning = false;
    } catch (error) {
      console.error('❌ AutoDiscovery: Failed to stop scanning:', error);
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
  }

  private notifyServicesUpdated(): void {
    const services = this.getDiscoveredServices();
    this.listeners.onServicesUpdated.forEach(callback => {
      try {
        callback(services);
      } catch (error) {
        console.error('❌ Error in services updated callback:', error);
      }
    });
  }

  private notifyError(error: string): void {
    this.listeners.onError.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('❌ Error in error callback:', err);
      }
    });
  }
}

// Export singleton instance
export const autoDiscoveryService = new AutoDiscoveryService();
