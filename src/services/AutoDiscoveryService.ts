import Zeroconf, { ZeroconfService, ZeroconfError } from 'react-native-zeroconf';

export interface DiscoveredFreeShowInstance {
  name: string; // Display name (hostname or IP)
  host: string; // mDNS hostname, e.g. 'MyMacBook.local.'
  port: number; // Primary port (usually API port if available)
  ip: string; // Primary IP for deduplication
  ports?: {
    api?: number;
    remote?: number;
    stage?: number;
    control?: number;
    output?: number;
    [key: string]: number | undefined;
  };
  capabilities?: string[];
  apiEnabled?: boolean;
}

export type DiscoveryEventCallback = (instances: DiscoveredFreeShowInstance[]) => void;
export type ErrorEventCallback = (error: string) => void;

// Temporary interface for pending service aggregation
interface PendingService {
  name: string;
  host: string;
  port: number;
  ip: string;
  capability: string;
  portKey: string;
  isApi: boolean;
}

import { ErrorLogger } from './ErrorLogger';

/**
 * Parse service name to determine capability and port mapping
 */
function parseServiceCapability(serviceName: string, _port: number): { 
  capability: string; 
  portKey: string; 
  isApi: boolean;
} {
  const name = (serviceName || '').toUpperCase().trim(); // FreeShow uses uppercase service names
  
  // Check for exact FreeShow service names
  if (name === 'API') {
    return { capability: 'api', portKey: 'api', isApi: true };
  }
  if (name === 'REMOTE') {
    return { capability: 'remoteshow', portKey: 'remote', isApi: false };
  }
  if (name === 'STAGE') {
    return { capability: 'stageshow', portKey: 'stage', isApi: false };
  }
  if (name === 'CONTROLLER') {
    return { capability: 'controlshow', portKey: 'control', isApi: false };
  }
  if (name === 'OUTPUT_STREAM' || name === 'OUTPUT') {
    return { capability: 'outputshow', portKey: 'output', isApi: false };
  }
  
  // Fallback for lowercase or partial matches  
  const lowerName = serviceName.toLowerCase();
  if (lowerName.includes('api') || lowerName.includes('server') || lowerName === 'freeshow') {
    return { capability: 'api', portKey: 'api', isApi: true };
  }
  if (lowerName.includes('remote')) {
    return { capability: 'remoteshow', portKey: 'remote', isApi: false };
  }
  if (lowerName.includes('stage')) {
    return { capability: 'stageshow', portKey: 'stage', isApi: false };
  }
  if (lowerName.includes('control')) {
    return { capability: 'controlshow', portKey: 'control', isApi: false };
  }
  if (lowerName.includes('output')) {
    return { capability: 'outputshow', portKey: 'output', isApi: false };
  }
  
  // For unknown services, use the name as-is
  return { 
    capability: `unknown:${name}`, 
    portKey: name || 'unknown', 
    isApi: false 
  };
}

class AutoDiscoveryService {
  private zeroconf: Zeroconf | null = null;
  private discoveredServices: Map<string, DiscoveredFreeShowInstance> = new Map();
  private pendingServices: Map<string, PendingService[]> = new Map(); // Group services by IP
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

  /**
   * Aggregate multiple services for the same IP into a single DiscoveredFreeShowInstance
   */
  private aggregateServicesForIP(ip: string): void {
    const services = this.pendingServices.get(ip) || [];
    if (services.length === 0) return;
    
    // Initialize the aggregated instance
    const ports: Record<string, number> = {};
    const capabilities: string[] = [];
    let primaryPort = 5505; // Default fallback
    let displayName = ip;
    let host = '';
    let hasApi = false;
    
    // Process each service for this IP
    services.forEach((service: PendingService) => {
      if (service.portKey && service.port) {
        ports[service.portKey] = service.port;
      }
      
      if (service.capability && !capabilities.includes(service.capability)) {
        capabilities.push(service.capability);
      }
      
      if (service.isApi) {
        hasApi = true;
        primaryPort = service.port; // Use API port as primary
      }
      
      // Prioritize hostname over service name for display
      if (service.host) {
        host = service.host;
        // Use hostname without .local suffix as display name
        const hostname = service.host.replace(/\.local\.?$/, '');
        if (hostname && hostname !== ip) {
          displayName = hostname;
        }
      }
    });
    
    // API always uses default port 5505 (not broadcasted via Bonjour)
    // Set primary port to default API port since that's what we'll connect to
    primaryPort = 5505;
    
    // Create the aggregated instance
    // API is available as long as any service is running (API endpoint runs on service ports)
    const aggregatedInstance: DiscoveredFreeShowInstance = {
      name: displayName,
      host: host || '',
      port: primaryPort,
      ip: ip,
      ports: ports,
      capabilities: capabilities,
      apiEnabled: capabilities.length > 0, // API available if any service is running
    };
    
    // Store the aggregated instance
    this.discoveredServices.set(ip, aggregatedInstance);
    
    ErrorLogger.debug(`🔗 AutoDiscovery: Aggregated ${services.length} services for ${ip}`, 'AutoDiscoveryService', {
      ports,
      capabilities,
      apiEnabled: hasApi,
    });
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
      
      // Parse service capability from name and port
      const { capability, portKey, isApi } = parseServiceCapability(service.name, service.port);
      
      // Get or create pending services for this IP
      const ipServices = this.pendingServices.get(primaryIP) || [];
      
      // Add this service to the pending list
      ipServices.push({
        name: service.name || primaryIP, // Keep service name for debugging
        host: service.host || '',
        port: service.port,
        ip: primaryIP,
        capability,
        portKey,
        isApi,
      });
      
      this.pendingServices.set(primaryIP, ipServices);
      
      // Aggregate all services for this IP into a single instance
      this.aggregateServicesForIP(primaryIP);
      
      this.notifyServicesUpdatedThrottled();
    });

    // Service removed
    this.zeroconf.on('remove', (service: ZeroconfService) => {
      ErrorLogger.info('🗑️ AutoDiscovery: FreeShow service removed', 'AutoDiscoveryService', { serviceName: service.name });
      const primaryIP = service.addresses?.[0] || service.host;
      
      // Remove the specific service from pending services
      const ipServices = this.pendingServices.get(primaryIP) || [];
      const filteredServices = ipServices.filter(s => 
        !(s.port === service.port && s.name === service.name)
      );
      
      if (filteredServices.length === 0) {
        // No more services for this IP, remove completely
        this.pendingServices.delete(primaryIP);
        this.discoveredServices.delete(primaryIP);
      } else {
        // Re-aggregate remaining services
        this.pendingServices.set(primaryIP, filteredServices);
        this.aggregateServicesForIP(primaryIP);
      }
      
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
      this.pendingServices.clear();
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
    this.pendingServices.clear();
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
