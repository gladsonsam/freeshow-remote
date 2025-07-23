// Dependency injection container for FreeShow service

import { configService } from '../config/AppConfig';
import { InputValidationService } from './InputValidationService';
import { ErrorLogger } from './ErrorLogger';
import { settingsRepository, connectionRepository } from '../repositories';
import { 
  IFreeShowServiceDependencies,
  IConfigService,
  IValidationService,
  IErrorLogger,
  IFreeShowServiceConfig 
} from './interfaces/IFreeShowService';
import { 
  SocketFactory, 
  ConnectionStateManager, 
  EventManager,
  defaultFreeShowServiceConfig 
} from './implementations/FreeShowServiceImplementations';
import { FreeShowService } from './FreeShowServiceV2';

/**
 * Adapter classes to make existing services compatible with interfaces
 */
class ConfigServiceAdapter implements IConfigService {
  getNetworkConfig() {
    return configService.getNetworkConfig();
  }

  getDefaultShowPorts() {
    return configService.getDefaultShowPorts();
  }

  async loadConfiguration(): Promise<void> {
    return configService.loadConfiguration();
  }
}

class ValidationServiceAdapter implements IValidationService {
  validateHost(host: string) {
    return InputValidationService.validateHost(host);
  }

  validatePort(port: number) {
    return InputValidationService.validatePort(port);
  }

  validateIPAddress(ip: string) {
    return InputValidationService.validateIPAddress(ip);
  }
}

class ErrorLoggerAdapter implements IErrorLogger {
  debug(message: string, context: string, error?: Error): void {
    ErrorLogger.debug(message, context, error);
  }

  info(message: string, context: string, metadata?: any): void {
    ErrorLogger.info(message, context, metadata);
  }

  warn(message: string, context: string, metadata?: any): void {
    ErrorLogger.warn(message, context, metadata);
  }

  error(message: string, context: string, error: Error): void {
    ErrorLogger.error(message, context, error);
  }

  fatal(message: string, context: string, error: Error): void {
    ErrorLogger.fatal(message, context, error);
  }
}

/**
 * Dependency injection container
 */
export class DIContainer {
  private static instance: DIContainer;
  private dependencies: IFreeShowServiceDependencies;

  private constructor() {
    this.dependencies = this.createDependencies();
  }

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  private createDependencies(): IFreeShowServiceDependencies {
    return {
      configService: new ConfigServiceAdapter(),
      validationService: new ValidationServiceAdapter(),
      errorLogger: new ErrorLoggerAdapter(),
      socketFactory: new SocketFactory(),
      connectionStateManager: new ConnectionStateManager(),
      eventManager: new EventManager(),
      settingsRepository,
      connectionRepository,
    };
  }

  public getDependencies(): IFreeShowServiceDependencies {
    return this.dependencies;
  }

  public createFreeShowService(config?: Partial<IFreeShowServiceConfig>): FreeShowService {
    const serviceConfig = { ...defaultFreeShowServiceConfig, ...config };
    return new FreeShowService(this.dependencies, serviceConfig);
  }

  // Allow dependency overrides for testing
  public overrideDependency<K extends keyof IFreeShowServiceDependencies>(
    key: K,
    implementation: IFreeShowServiceDependencies[K]
  ): void {
    this.dependencies[key] = implementation;
  }

  public resetDependencies(): void {
    this.dependencies = this.createDependencies();
  }
}

/**
 * Factory function for creating FreeShow service instances
 */
export function createFreeShowService(config?: Partial<IFreeShowServiceConfig>): FreeShowService {
  const container = DIContainer.getInstance();
  return container.createFreeShowService(config);
}

/**
 * Get the default FreeShow service instance (singleton-like behavior)
 */
export function getDefaultFreeShowService(): FreeShowService {
  if (!defaultServiceInstance) {
    defaultServiceInstance = createFreeShowService();
  }
  return defaultServiceInstance;
}

// Private singleton instance for backward compatibility
let defaultServiceInstance: FreeShowService | null = null;

/**
 * Reset the default service instance (useful for testing or configuration changes)
 */
export function resetDefaultFreeShowService(): void {
  defaultServiceInstance = null;
  DIContainer.getInstance().resetDependencies();
}
