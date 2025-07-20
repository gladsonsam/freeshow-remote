import { io, Socket } from 'socket.io-client';
import { FreeShowShow, FreeShowOutput } from '../types';

class FreeShowService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  connect(host: string, port: number = 5505): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        const url = `http://${host}:${port}`;
        
        this.socket = io(url, {
          timeout: 10000,
          transports: ['websocket'],
          forceNew: true
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          console.log('Connected to FreeShow at', url);
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
          console.log('Disconnected from FreeShow');
        });

        this.socket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          reject(error);
        });

        // Handle API response events
        this.socket.on('response', (data) => {
          console.log('FreeShow API Response (response event):', data);
          this.handleApiResponse(data);
        });

        // Also listen for direct data events
        this.socket.on('data', (data) => {
          console.log('FreeShow API Response (data event):', data);
          this.handleApiResponse(data);
        });

        // Listen for other possible response formats
        this.socket.on('api_response', (data) => {
          console.log('FreeShow API Response (api_response event):', data);
          this.handleApiResponse(data);
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

  private handleApiResponse(data: any): void {
    console.log('Raw FreeShow API Response:', data);
    
    // Handle different response formats
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.warn('Failed to parse response as JSON:', data);
        return;
      }
    }

    // Extract response type and content
    let type: string;
    let content: any;

    if (data.action) {
      // Response format: { action: 'get_shows', data: [...] }
      type = data.action;
      content = data.data || data;
    } else if (data.type) {
      // Response format: { type: 'shows', content: [...] }
      type = data.type;
      content = data.content || data;
    } else {
      // Direct data response
      type = 'unknown';
      content = data;
    }

    console.log('Processed response - Type:', type, 'Content:', content);

    // Map API response types to our event system
    const typeMapping: { [key: string]: string } = {
      'get_shows': 'shows',
      'get_show': 'show',
      'get_output': 'output',
      'get_output_slide_text': 'slide_text'
    };

    const mappedType = typeMapping[type] || type;

    // Convert shows object to array if needed
    if (mappedType === 'shows' && content && typeof content === 'object' && !Array.isArray(content)) {
      console.log('Converting shows object to array');
      const showsArray = Object.keys(content).map(id => ({
        id,
        name: content[id].name || content[id].title || `Show ${id}`,
        category: content[id].category || 'song',
        slides: content[id].slides ? Object.keys(content[id].slides).map(slideId => ({
          id: slideId,
          group: content[id].slides[slideId].group || '',
          items: content[id].slides[slideId].items || []
        })) : [],
        ...content[id]
      }));
      content = showsArray;
      console.log('Converted shows to array:', content);
    }

    // Convert individual show slides object to array if needed
    if (mappedType === 'show' && content && typeof content === 'object') {
      console.log('Converting show slides to array');
      if (content.slides && typeof content.slides === 'object' && !Array.isArray(content.slides)) {
        content.slides = Object.keys(content.slides).map(slideId => ({
          id: slideId,
          group: content.slides[slideId].group || '',
          items: content.slides[slideId].items || [],
          ...content.slides[slideId]
        }));
        console.log('Converted show slides to array:', content.slides);
      }
    }

    if (this.listeners[mappedType]) {
      this.listeners[mappedType].forEach(callback => callback(content));
    }
  }

  private sendApiRequest(action: string, data: any = {}): void {
    if (this.socket && this.isConnected) {
      const requestData = { action, ...data };
      console.log('Sending API request:', requestData);
      this.socket.emit('data', JSON.stringify(requestData));
    } else {
      console.warn('Cannot send API request: not connected to FreeShow');
    }
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

  // API Methods based on FreeShow documentation
  
  // GET Actions
  getShows(): void {
    this.sendApiRequest('get_shows');
  }

  getShow(id: string): void {
    this.sendApiRequest('get_show', { id });
  }

  getCurrentOutput(): void {
    this.sendApiRequest('get_output');
  }

  getOutputSlideText(): void {
    this.sendApiRequest('get_output_slide_text');
  }

  // PRESENTATION Actions
  nextSlide(): void {
    this.sendApiRequest('next_slide');
  }

  previousSlide(): void {
    this.sendApiRequest('previous_slide');
  }

  selectSlideByIndex(index: number, showId?: string, layoutId?: string): void {
    this.sendApiRequest('index_select_slide', { 
      index,
      ...(showId && { showId }),
      ...(layoutId && { layoutId })
    });
  }

  selectSlideByName(name: string): void {
    this.sendApiRequest('name_select_slide', { value: name });
  }

  selectGroup(id: string): void {
    this.sendApiRequest('id_select_group', { id });
  }

  // SHOWS Actions
  selectShowByName(name: string): void {
    this.sendApiRequest('name_select_show', { value: name });
  }

  startShow(id: string): void {
    this.sendApiRequest('start_show', { id });
  }

  // CLEAR Actions
  clearAll(): void {
    this.sendApiRequest('clear_all');
  }

  clearSlide(): void {
    this.sendApiRequest('clear_slide');
  }

  clearBackground(): void {
    this.sendApiRequest('clear_background');
  }

  restoreOutput(): void {
    this.sendApiRequest('restore_output');
  }

  // Event Listeners
  onShows(callback: (shows: FreeShowShow[]) => void): void {
    this.addListener('shows', callback);
  }

  onShow(callback: (show: FreeShowShow) => void): void {
    this.addListener('show', callback);
  }

  onOutput(callback: (output: FreeShowOutput) => void): void {
    this.addListener('output', callback);
  }

  onSlideText(callback: (text: string) => void): void {
    this.addListener('slide_text', callback);
  }

  private addListener(type: string, callback: (data: any) => void): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
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
