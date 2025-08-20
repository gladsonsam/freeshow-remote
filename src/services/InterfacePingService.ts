import { ErrorLogger } from './ErrorLogger';

export interface PingResult {
  isReachable: boolean;
  responseTime?: number;
  error?: string;
}

/**
 * Simple service for pinging IP addresses
 */
export class InterfacePingService {
  private readonly logContext = 'InterfacePingService';
  private readonly timeout = 1500; // 1.5 second timeout for faster response

  /**
   * Fast ping test - just check if the host responds quickly
   */
  async pingHost(host: string): Promise<PingResult> {
    const startTime = Date.now();
    
    try {
      // Try the most likely port first (FreeShow default)
      const testPorts = [5505, 80, 443]; // FreeShow first, then common web ports
      
      // Try ports one by one, but with short timeout for speed
      for (const port of testPorts) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 800); // Very short timeout per port

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
