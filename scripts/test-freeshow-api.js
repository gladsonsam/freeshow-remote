const { io } = require('socket.io-client');

// Test FreeShow API connection
async function testFreeShowAPI() {
  console.log('Testing FreeShow API connection...');

  // Try different ports that FreeShow might be using
  const possiblePorts = [5506, 5505];

  for (const port of possiblePorts) {
    console.log(`\nTrying port ${port}...`);

    try {
      const socket = io(`http://localhost:${port}`, {
        transports: ['websocket'],
        timeout: 5000,
        reconnection: false
      });

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.disconnect();
          reject(new Error(`Connection timeout on port ${port}`));
        }, 5000);

        socket.on('connect', () => {
          clearTimeout(timeout);
          console.log(`✅ Connected to FreeShow on port ${port}`);

          // Send get_shows command
          console.log('📤 Sending get_shows command...');
          socket.emit('data', JSON.stringify({ action: 'get_shows' }));

          // Listen for response
          socket.on('data', (data) => {
            console.log(`📥 Received response on port ${port}:`, data);
            socket.disconnect();
            resolve(data);
          });

          // Timeout for response
          setTimeout(() => {
            console.log(`❌ No response received on port ${port}`);
            socket.disconnect();
            reject(new Error(`No response on port ${port}`));
          }, 3000);
        });

        socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // If we get here, we got a response
      return;

    } catch (error) {
      console.log(`❌ Failed on port ${port}:`, error.message);
    }
  }

  console.log('\n❌ Could not connect to FreeShow on any tested port');
  console.log('Make sure FreeShow is running and the API is enabled');
}

testFreeShowAPI().catch(console.error);
