import { Platform } from 'react-native';

/**
 * Application Configuration
 * Centralized configuration for timeouts, ports, and other constants
 */

export interface NetworkConfig {
  defaultPort: number;
  connectionTimeout: number;
  autoConnectTimeout: number;
  discoveryTimeout: number;
  reconnectDelay: number;
  maxRetries: number;
  keepAliveInterval: number;
}

export interface ShowPortsConfig {
  remote: number;
  stage: number;
  control: number;
  output: number;
}

export interface ValidationConfig {
  maxHostLength: number;
  maxPortLength: number;
  portRange: {
    min: number;
    max: number;
  };
  ipRegexPattern: string;
  hostRegexPattern: string;
}

export interface AppConfig {
  network: NetworkConfig;
  defaultShowPorts: ShowPortsConfig;
  validation: ValidationConfig;
  isDevelopment: boolean;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Default configuration values
 * These can be overridden by environment variables or secure storage
 */
const DEFAULT_CONFIG: AppConfig = {
  network: {
    defaultPort: 5505,
    connectionTimeout: 10000, // 10 seconds
    autoConnectTimeout: 15000, // 15 seconds
    discoveryTimeout: 5000, // 5 seconds
    reconnectDelay: 3000, // 3 seconds
    maxRetries: 3,
    keepAliveInterval: 30000, // 30 seconds
  },
  defaultShowPorts: {
    remote: 5510,
    stage: 5511,
    control: 5512,
    output: 5513,
  },
  validation: {
    maxHostLength: 253, // RFC compliant max domain length
    maxPortLength: 5,
    portRange: {
      min: 1,
      max: 65535,
    },
    // IPv4 and IPv6 validation patterns
    ipRegexPattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$',
    // Hostname validation (RFC 1123 compliant)
    hostRegexPattern: '^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(?:\\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$',
  },
  isDevelopment: __DEV__,
  platform: Platform.OS as 'ios' | 'android' | 'web',
};

/**
 * Configuration service for managing app settings
 */
class ConfigService {
  private config: AppConfig = DEFAULT_CONFIG;

  /**
   * Get the current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Get network configuration
   */
  getNetworkConfig(): NetworkConfig {
    return { ...this.config.network };
  }

  /**
   * Get default show ports configuration
   */
  getDefaultShowPorts(): ShowPortsConfig {
    return { ...this.config.defaultShowPorts };
  }

  /**
   * Get validation configuration
   */
  getValidationConfig(): ValidationConfig {
    return { ...this.config.validation };
  }

  /**
   * Update configuration (for testing or runtime changes)
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      network: { ...this.config.network, ...updates.network },
      defaultShowPorts: { ...this.config.defaultShowPorts, ...updates.defaultShowPorts },
      validation: { ...this.config.validation, ...updates.validation },
    };
  }

  /**
   * Load configuration from environment or secure storage
   * In production, this could load from encrypted storage
   */
  async loadConfiguration(): Promise<void> {
    try {
      // In a real production app, you would load from:
      // - Environment variables
      // - Secure storage (Keychain/Keystore)
      // - Remote configuration service
      
      // For now, we use the default configuration
      // This can be extended to load from AsyncStorage or other sources
      
      if (this.config.isDevelopment) {
        // Development specific overrides
        this.config.network.connectionTimeout = 15000; // Longer timeout for dev
      }
    } catch (error) {
      console.warn('Failed to load configuration, using defaults:', error);
    }
  }

  /**
   * Validate a port number
   */
  isValidPort(port: number): boolean {
    const { portRange } = this.config.validation;
    return Number.isInteger(port) && port >= portRange.min && port <= portRange.max;
  }

  /**
   * Validate an IP address
   */
  isValidIP(ip: string): boolean {
    const { ipRegexPattern } = this.config.validation;
    return new RegExp(ipRegexPattern).test(ip);
  }

  /**
   * Validate a hostname
   */
  isValidHostname(hostname: string): boolean {
    const { hostRegexPattern, maxHostLength } = this.config.validation;
    return hostname.length <= maxHostLength && new RegExp(hostRegexPattern).test(hostname);
  }
}

// Export singleton instance
export const configService = new ConfigService();

// Export default config for reference
export { DEFAULT_CONFIG };
