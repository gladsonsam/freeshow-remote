import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';

class FreeShowService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  connect(host: string, port: number = 5505): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const url = `http://${host}:${port}`;
        console.log('🔌 Attempting to connect to FreeShow at:', url);
        console.log('📱 Platform:', Platform.OS);
        
        // Test basic HTTP connectivity first
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        fetch(url, { 
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        })
        .then(response => {
          clearTimeout(timeoutId);
          console.log('✅ HTTP test successful:', response.status);
        })
        .catch(httpError => {
          clearTimeout(timeoutId);
          console.warn('⚠️ HTTP test failed:', httpError.message);
        });
        
        this.socket = io(url, {
          timeout: 15000,
          transports: ['websocket', 'polling'], // Add polling as fallback
          forceNew: true,
          upgrade: true,
          rememberUpgrade: false,
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
          console.log('✅ Connected to FreeShow');
          this.isConnected = true;
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          console.log('❌ Disconnected from FreeShow');
          this.isConnected = false;
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }



  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners = {};
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Remote Control Methods
  nextSlide(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('NEXT');
    }
  }

  previousSlide(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('PREVIOUS');
    }
  }

  clearOutput(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('CLEAR_OUTPUT');
    }
  }

  clearAll(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('CLEAR_ALL');
    }
  }

  clearSlide(): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('CLEAR_SLIDE');
    }
  }

  // Event system for listening to socket events
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Remove event listeners
  removeListener(type: string, callback?: (data: any) => void): void {
    if (!this.listeners[type]) return;
    
    if (callback) {
      const index = this.listeners[type].indexOf(callback);
      if (index > -1) {
        this.listeners[type].splice(index, 1);
      }
    } else {
      this.listeners[type] = [];
    }
  }

  removeAllListeners(): void {
    this.listeners = {};
  }
}

export const freeShowService = new FreeShowService();
