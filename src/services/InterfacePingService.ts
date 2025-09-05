import { ErrorLogger } from './ErrorLogger';
import { configService } from '../config/AppConfig';

export interface PingResult {
  isReachable: boolean;
  responseTime?: number;
  error?: string;
}

export interface PortPingResult {
  port: number;
  isReachable: boolean;
  responseTime?: number;
  error?: string;
}

export interface InterfaceValidationResult {
  remote: number;
  stage: number;
  control: number;
  output: number;
  api: number;
  validatedPorts: PortPingResult[];
  hasEnabledInterfaces: boolean;
}

/**
 * Simple service for pinging IP addresses and validating interface ports
 */
export class InterfacePingService {
  private readonly logContext = 'InterfacePingService';
  private readonly timeout = 500; // Reduced timeout for faster response

  /**
   * Test a specific port on a host
   */
  async pingPort(host: string, port: number): Promise<PortPingResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const _response = await fetch(`http://${host}:${port}`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      return {
        port,
        isReachable: true,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        port,
        isReachable: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Validate interface ports by pinging them (parallel for speed)
   * Only keeps interfaces enabled if they respond successfully to ping
   */
  async validateInterfacePorts(host: string, ports: {
    remote: number;
    stage: number;
    control: number;
    output: number;
    api: number;
  }): Promise<InterfaceValidationResult> {
    const finalPorts = { ...ports };

    // Get all non-zero ports for parallel testing
    const portsToTest = Object.entries(ports).filter(([_, port]) => port > 0);
    
    // Run all pings in parallel for speed
    const pingPromises = portsToTest.map(([interfaceName, port]) => 
      this.pingPort(host, port).then(result => ({ interfaceName, result }))
    );

    // Wait for all pings to complete
    const pingResults = await Promise.all(pingPromises);
    const validatedPorts: PortPingResult[] = [];

    // Process results - disable ports that don't respond
    for (const { interfaceName, result } of pingResults) {
      validatedPorts.push(result);
      
      if (!result.isReachable) {
        finalPorts[interfaceName as keyof typeof ports] = 0;
        ErrorLogger.info(`Disabled ${interfaceName} interface - port ${result.port} not responding`, this.logContext);
      } else {
        ErrorLogger.info(`Validated ${interfaceName} interface on port ${result.port}`, this.logContext);
      }
    }

    const hasEnabledInterfaces = Object.values(finalPorts).some(port => port > 0);

    return {
      ...finalPorts,
      validatedPorts,
      hasEnabledInterfaces
    };
  }

  /**
   * Fast ping test - just check if the host responds quickly
   */
  async pingHost(host: string): Promise<PingResult> {
    const startTime = Date.now();
    
    try {
      // Try the most likely port first (FreeShow default)
      const defaultPort = configService.getNetworkConfig().defaultPort;
      const testPorts = [defaultPort, 80, 443]; // FreeShow first, then common web ports
      
      // Try ports one by one, but with short timeout for speed
      for (const port of testPorts) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.timeout);

          const response = await fetch(`http://${host}:${port}`, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          
          ErrorLogger.debug(`Host ${host} is reachable on port ${port}`, this.logContext, {
            host, port, responseTime, status: response.status
          });
          
          return {
            isReachable: true,
            responseTime
          };
          
        } catch {
          // Continue to next port quickly
          continue;
        }
      }
      
      // If we get here, all ports failed
      const responseTime = Date.now() - startTime;
      return {
        isReachable: false,
        responseTime,
        error: 'Host not reachable on tested ports'
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      ErrorLogger.warn(`Failed to ping host ${host}`, this.logContext, 
        error instanceof Error ? error : new Error(String(error))
      );
      
      return {
        isReachable: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Export singleton instance
export const interfacePingService = new InterfacePingService();
