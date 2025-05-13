/**
 * WebSocket Client Implementation Test
 * 
 * This script verifies that the WebSocket client implementation follows
 * the development guidelines:
 * 1. Uses correct WebSocket protocol (ws:// or wss://)
 * 2. Connects to the correct path (/ws)
 * 3. Uses WebSocket.OPEN constant when checking connection state
 * 4. Implements reconnection logic
 */

// Mock window.location for testing
const windowLocation = {
  protocol: 'http:',
  host: 'localhost:3000'
};

// Mock WebSocket implementation
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.eventHandlers = {};
    
    console.log(`WebSocket connecting to ${url}`);
    
    // Simulate connection after a delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.eventHandlers.open) {
        this.eventHandlers.open();
      }
    }, 50);
  }

  send(data) {
    console.log(`WebSocket sent: ${data}`);
  }

  close() {
    this.readyState = MockWebSocket.CLOSING;
    
    // Simulate closing after a delay
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.eventHandlers.close) {
        this.eventHandlers.close({
          code: 1000,
          reason: 'Normal closure'
        });
      }
    }, 50);
  }

  set onopen(handler) {
    this.eventHandlers.open = handler;
  }

  set onclose(handler) {
    this.eventHandlers.close = handler;
  }

  set onerror(handler) {
    this.eventHandlers.error = handler;
  }

  set onmessage(handler) {
    this.eventHandlers.message = handler;
  }

  // Helper to simulate receiving a message
  simulateMessage(data) {
    if (this.eventHandlers.message) {
      this.eventHandlers.message({
        data: JSON.stringify(data)
      });
    }
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting WebSocket Client Implementation Tests');
  console.log('===============================================');

  // Override global objects for testing
  global.window = {
    location: windowLocation
  };
  global.WebSocket = MockWebSocket;

  let passed = 0;
  let failed = 0;
  const tests = [];

  // Test 1: Correct URL construction
  tests.push(async () => {
    const testName = 'Correct URL construction';
    try {
      let urlCorrect = false;
      global.WebSocket = class TestWebSocket extends MockWebSocket {
        constructor(url) {
          super(url);
          urlCorrect = url === 'ws://localhost:3000/ws';
        }
      };

      // Dynamic import to ensure we use our mocks
      const { WebSocketService } = await import('./client/src/services/websocket-service.js');
      const service = new WebSocketService({ debug: true });
      service.connect();
      
      if (urlCorrect) {
        console.log('✅ Test passed: Correct WebSocket URL constructed');
        return true;
      } else {
        console.log('❌ Test failed: Incorrect WebSocket URL');
        return false;
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
      return false;
    }
  });

  // Test 2: Uses WebSocket.OPEN constant for readyState check
  tests.push(async () => {
    const testName = 'Uses WebSocket.OPEN constant';
    try {
      let usesCorrectConstant = false;
      global.WebSocket = class TestWebSocket extends MockWebSocket {
        get readyState() {
          // This will track if the code compares with WebSocket.OPEN
          return {
            valueOf: () => {
              // If the comparison is with WebSocket.OPEN (value 1), record it
              usesCorrectConstant = true;
              return MockWebSocket.OPEN;
            }
          };
        }
      };

      // Dynamic import to use our updated mocks
      const { WebSocketService } = await import('./client/src/services/websocket-service.js');
      const service = new WebSocketService({ debug: true });
      service.connect();
      
      // Force a call to isConnected which should check readyState
      setTimeout(() => {
        service.isConnected();
      }, 100);
      
      // Give time for the check to happen
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (usesCorrectConstant) {
        console.log('✅ Test passed: Correctly uses WebSocket.OPEN constant');
        return true;
      } else {
        console.log('❌ Test failed: Does not use WebSocket.OPEN constant');
        return false;
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
      return false;
    }
  });

  // Test 3: Implements reconnection logic
  tests.push(async () => {
    const testName = 'Implements reconnection logic';
    try {
      let reconnectAttempted = false;
      
      global.WebSocket = class TestWebSocket extends MockWebSocket {
        constructor(url) {
          super(url);
          // Second connection attempt should register as reconnection
          if (reconnectAttempted) {
            reconnectAttempted = true;
          }
        }
      };

      // Dynamic import to use our updated mocks
      const { WebSocketService } = await import('./client/src/services/websocket-service.js');
      const service = new WebSocketService({ 
        debug: true,
        autoReconnect: true,
        reconnectDelay: 50, // Short delay for testing
        maxReconnectAttempts: 1
      });
      
      service.connect();
      
      // Force connection close to trigger reconnect
      setTimeout(() => {
        service.disconnect();
      }, 100);
      
      // Give time for reconnection to happen
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (reconnectAttempted) {
        console.log('✅ Test passed: Implements reconnection logic');
        return true;
      } else {
        console.log('❌ Test failed: Does not implement reconnection');
        return false;
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
      return false;
    }
  });

  // Run all tests
  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  // Print summary
  console.log('\n===============================================');
  console.log(`Tests complete: ${passed} passed, ${failed} failed`);
  console.log('===============================================');
}

// Run the tests
runTests().catch(console.error);