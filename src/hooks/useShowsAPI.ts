import { useState, useRef, useCallback } from 'react';
import { Socket, io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorLogger } from '../services/ErrorLogger';

export interface Show {
  id: string;
  name: string;
  category: string;
  timestamps: {
    created: number;
    modified: number;
    used: number | null;
  };
  quickAccess: Record<string, any>;
  detailsLoaded?: boolean;
  [key: string]: any;
}

export const useShowsAPI = (connectionHost: string, currentShowPorts?: any) => {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loadingShowDetails, setLoadingShowDetails] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);

  // Connect to FreeShow API WebSocket
  const connectToAPI = useCallback(() => {
    if (!connectionHost) return;

    const configuredApiPort = currentShowPorts?.api;
    const possiblePorts = configuredApiPort ? [configuredApiPort, 5506, 5505] : [5506, 5505];
    const uniquePorts = [...new Set(possiblePorts)];

    ErrorLogger.info('Attempting to connect to FreeShow API WebSocket', 'useShowsAPI', {
      connectionHost,
      configuredApiPort,
      possiblePorts: uniquePorts
    });

    const tryConnectToPort = (portIndex: number) => {
      if (portIndex >= uniquePorts.length) {
        ErrorLogger.error('Failed to connect to any FreeShow API port', 'useShowsAPI');
        return;
      }

      const port = uniquePorts[portIndex];
      const socketUrl = `http://${connectionHost}:${port}`;

      ErrorLogger.info(`Trying port ${port}`, 'useShowsAPI', { socketUrl });

      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      socketRef.current = io(socketUrl, {
        transports: ['websocket'],
        timeout: 10000,
        reconnection: false,
      });

      socketRef.current.on('connect', () => {
        ErrorLogger.info(`FreeShow API WebSocket connected successfully on port ${port}`, 'useShowsAPI');
        setSocketConnected(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        ErrorLogger.info('FreeShow API WebSocket disconnected', 'useShowsAPI', { reason, port });
        setSocketConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        ErrorLogger.error(`FreeShow API WebSocket connection error on port ${port}`, 'useShowsAPI', error);
        tryConnectToPort(portIndex + 1);
      });

      // Add general data listener for debugging
      socketRef.current.on('data', (data) => {
        ErrorLogger.debug('Raw WebSocket data received', 'useShowsAPI', {
          dataType: typeof data,
          dataLength: typeof data === 'string' ? data.length : 'N/A',
          dataPreview: typeof data === 'string' ? data.substring(0, 100) : JSON.stringify(data).substring(0, 100)
        });
      });
    };

    tryConnectToPort(0);
  }, [connectionHost, currentShowPorts]);

  // Disconnect from API
  const disconnectFromAPI = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setSocketConnected(false);
    }
  }, []);

  // Load shows from local storage
  const loadShowsFromStorage = useCallback(async () => {
    try {
      const storedShows = await AsyncStorage.getItem('@freeshow_shows');
      if (storedShows) {
        const parsedShows = JSON.parse(storedShows);
        if (Array.isArray(parsedShows) && parsedShows.length > 0) {
          const validShows = parsedShows.filter((show: any) =>
            show && typeof show === 'object' && show.id && show.name
          );
          setShows(validShows);
        }
      }
    } catch (error) {
      ErrorLogger.error('Failed to load shows from storage', 'useShowsAPI', error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  // Save shows to local storage
  const saveShowsToStorage = useCallback(async (showsData: Show[]) => {
    try {
      await AsyncStorage.setItem('@freeshow_shows', JSON.stringify(showsData));
    } catch (error) {
      ErrorLogger.error('Failed to save shows to storage', 'useShowsAPI', error instanceof Error ? error : new Error(String(error)));
    }
  }, []);

  // Load shows from API
  const loadShows = useCallback(async (): Promise<boolean> => {
    if (!socketConnected || !socketRef.current) {
      ErrorLogger.warn('Cannot load shows - socket not connected', 'useShowsAPI');
      return false;
    }

    setLoading(true);
    ErrorLogger.info('Loading shows from FreeShow API', 'useShowsAPI');

    try {
      const command = { action: 'get_shows' };
      ErrorLogger.debug('Sending get_shows command', 'useShowsAPI', command);
      socketRef.current.emit('data', JSON.stringify(command));

      return new Promise((resolve) => {
        const responseTimeout = setTimeout(() => {
          setLoading(false);
          ErrorLogger.warn('API response timeout - no shows received', 'useShowsAPI');
          resolve(false);
        }, 8000);

        let responseProcessed = false;
        const handleApiResponse = (data: any) => {
          if (responseProcessed) return;

          try {
            let responseData = data;

            if (typeof data === 'string') {
              try {
                responseData = JSON.parse(data);
              } catch (parseError) {
                ErrorLogger.warn('Failed to parse string data as JSON', 'useShowsAPI', undefined, { 
                  data: data.substring(0, 100),
                  error: parseError 
                });
                return;
              }
            } else if (data && typeof data === 'object') {
              responseData = data;
            } else {
              ErrorLogger.warn('Unexpected data type received from API', 'useShowsAPI', undefined, { 
                dataType: typeof data,
                data: data 
              });
              return;
            }

            ErrorLogger.debug('Processing parsed API response', 'useShowsAPI', {
              responseType: typeof responseData,
              isObject: typeof responseData === 'object',
              keys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'N/A',
              responsePreview: JSON.stringify(responseData).substring(0, 300)
            });

            if (responseData && responseData.action === 'get_shows' && responseData.data) {
              responseProcessed = true;
              clearTimeout(responseTimeout);

              const showsData = responseData.data;
              const showsArray: Show[] = Object.entries(showsData).map(([id, showData]: [string, any]) => ({
                id,
                name: showData.name || 'Untitled Show',
                category: showData.category || '',
                timestamps: showData.timestamps || { created: Date.now(), modified: Date.now(), used: null },
                quickAccess: showData.quickAccess || {},
                ...showData
              }));

              ErrorLogger.info(`Successfully loaded ${showsArray.length} shows from API`, 'useShowsAPI');
              setShows(showsArray);
              saveShowsToStorage(showsArray);
              setLoading(false);

              socketRef.current?.off('data', handleApiResponse);
              resolve(true);
            } else {
              ErrorLogger.warn('Received empty or invalid shows response', 'useShowsAPI', undefined, {
                responseData,
                keys: responseData ? Object.keys(responseData) : 'N/A'
              });
            }
          } catch (parseError) {
            ErrorLogger.error('Failed to process API response', 'useShowsAPI', undefined, { 
              error: parseError,
              data: typeof data === 'string' ? data.substring(0, 200) : data
            });
          }
        };

        socketRef.current?.on('data', handleApiResponse);
      });

    } catch (error) {
      ErrorLogger.error('Failed to load shows from API', 'useShowsAPI', error instanceof Error ? error : new Error(String(error)));
      setLoading(false);
      return false;
    }
  }, [socketConnected, saveShowsToStorage]);

  // Load show details
  const loadShowDetails = useCallback(async (showId: string): Promise<any> => {
    if (!socketConnected || !socketRef.current) {
      ErrorLogger.warn('Cannot load show details - socket not connected', 'useShowsAPI');
      return null;
    }

    setLoadingShowDetails(true);
    ErrorLogger.info(`Loading details for show ${showId}`, 'useShowsAPI');

    try {
      const command = { action: 'get_show', id: showId };
      ErrorLogger.debug('Sending get_show command', 'useShowsAPI', command);
      socketRef.current.emit('data', JSON.stringify(command));

      return new Promise((resolve) => {
        const responseTimeout = setTimeout(() => {
          setLoadingShowDetails(false);
          ErrorLogger.warn('Show details response timeout', 'useShowsAPI');
          resolve(null);
        }, 8000);

        let responseProcessed = false;
        const handleShowDetailsResponse = (data: any) => {
          if (responseProcessed) return;

          try {
            let responseData = data;

            if (typeof data === 'string') {
              try {
                responseData = JSON.parse(data);
              } catch (parseError) {
                ErrorLogger.warn('Failed to parse show details response', 'useShowsAPI', undefined, { 
                  data: data.substring(0, 100),
                  error: parseError 
                });
                return;
              }
            }

            ErrorLogger.debug('Processing show details response', 'useShowsAPI', {
              responseType: typeof responseData,
              hasAction: responseData?.action,
              hasData: !!responseData?.data
            });

            if (responseData && responseData.action === 'get_show' && responseData.data) {
              responseProcessed = true;
              clearTimeout(responseTimeout);

              const showData = responseData.data;
              setLoadingShowDetails(false);

              // Update the show in local storage with the detailed data
              setShows(currentShows => {
                const updatedShows = currentShows.map(show => 
                  show.id === showId 
                    ? { ...show, ...showData, detailsLoaded: true }
                    : show
                );
                console.log('Updated show with detailsLoaded=true:', updatedShows.find(s => s.id === showId));
                saveShowsToStorage(updatedShows);
                return updatedShows;
              });

              ErrorLogger.info(`Successfully loaded details for show ${showId}`, 'useShowsAPI');
              socketRef.current?.off('data', handleShowDetailsResponse);
              resolve(showData);
            }
          } catch (parseError) {
            ErrorLogger.error('Failed to process show details response', 'useShowsAPI', undefined, { 
              error: parseError,
              data: typeof data === 'string' ? data.substring(0, 200) : data
            });
          }
        };

        socketRef.current?.on('data', handleShowDetailsResponse);
      });

    } catch (error) {
      ErrorLogger.error('Failed to load show details', 'useShowsAPI', error instanceof Error ? error : new Error(String(error)));
      setLoadingShowDetails(false);
      return null;
    }
  }, [socketConnected, saveShowsToStorage]);

  // Delete all shows
  const deleteAllShows = useCallback(async () => {
    setShows([]);
    await saveShowsToStorage([]);
    ErrorLogger.info('Deleted all local shows', 'useShowsAPI');
  }, [saveShowsToStorage]);

  // Resync shows
  const resyncShows = useCallback(async (): Promise<boolean> => {
    await saveShowsToStorage([]);
    setShows([]);
    return await loadShows();
  }, [saveShowsToStorage, loadShows]);

  // Set plain text for a show
  const setPlainText = useCallback(async (showId: string, value: string): Promise<boolean> => {
    if (!socketConnected || !socketRef.current) {
      ErrorLogger.warn('Cannot set plain text - socket not connected', 'useShowsAPI');
      return false;
    }

    ErrorLogger.info(`Setting plain text for show ${showId}`, 'useShowsAPI');

    try {
      const command = { action: 'set_plain_text', id: showId, value };
      ErrorLogger.debug('Sending set_plain_text command', 'useShowsAPI', { showId, valueLength: value.length });
      socketRef.current.emit('data', JSON.stringify(command));

      // Since FreeShow might not send a confirmation response, we'll assume success after sending
      // and just wait a short time to ensure the command was processed
      return new Promise((resolve) => {
        const successTimeout = setTimeout(() => {
          ErrorLogger.info(`Plain text set for show ${showId} (assuming success)`, 'useShowsAPI');
          resolve(true);
        }, 1000); // Short timeout since we're not waiting for a specific response

        // Optional: Listen for any response that might indicate success or failure
        let responseProcessed = false;
        const handleSetPlainTextResponse = (data: any) => {
          if (responseProcessed) return;

          try {
            let responseData = data;

            if (typeof data === 'string') {
              try {
                responseData = JSON.parse(data);
              } catch (parseError) {
                // Not a JSON response, ignore
                return;
              }
            }

            // Check if this is a response to our set_plain_text command
            if (responseData && responseData.action === 'set_plain_text' && responseData.id === showId) {
              responseProcessed = true;
              clearTimeout(successTimeout);

              ErrorLogger.info(`Successfully set plain text for show ${showId}`, 'useShowsAPI');
              socketRef.current?.off('data', handleSetPlainTextResponse);
              resolve(true);
            }
          } catch (parseError) {
            // Ignore parsing errors for responses we don't care about
          }
        };

        socketRef.current?.on('data', handleSetPlainTextResponse);
      });

    } catch (error) {
      ErrorLogger.error('Failed to set plain text', 'useShowsAPI', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }, [socketConnected]);

  return {
    shows,
    setShows,
    loading,
    socketConnected,
    loadingShowDetails,
    connectToAPI,
    disconnectFromAPI,
    loadShowsFromStorage,
    saveShowsToStorage,
    loadShows,
    loadShowDetails,
    deleteAllShows,
    resyncShows,
    setPlainText,
  };
};
