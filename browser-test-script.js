/**
 * Test script to run in browser console to verify WebSocket tab updates
 * 
 * Copy and paste this script into your browser console to log all WebSocket 
 * messages and test sidebar tab update handling 
 */

// Override the WebSocket class to monitor all messages
const OriginalWebSocket = window.WebSocket;
window.WebSocket = function(url, protocols) {
  console.log('WebSocket constructor called with URL:', url);
  
  // Create the original WebSocket
  const ws = new OriginalWebSocket(url, protocols);
  
  // Override onmessage
  const originalOnMessage = ws.onmessage;
  ws.onmessage = function(event) {
    try {
      const data = JSON.parse(event.data);
      if (data.type && 
          (data.type === 'company_tabs_update' || 
           data.type === 'company_tabs_updated')) {
        console.log('INTERCEPTED TAB UPDATE:', data);
      }
    } catch (e) {
      // Not JSON or error parsing
    }
    
    // Call original handler
    if (originalOnMessage) {
      originalOnMessage.call(this, event);
    }
  };
  
  // Override send
  const originalSend = ws.send;
  ws.send = function(data) {
    try {
      const parsedData = JSON.parse(data);
      console.log('WebSocket sending:', parsedData);
    } catch (e) {
      // Not JSON or error parsing
    }
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  return ws;
};

// Create a test function to simulate a WebSocket company tabs update event
function testCompanyTabsUpdate() {
  // Dispatch a custom event to simulate WebSocket message
  const testEvent = new CustomEvent('websocket-message', {
    detail: {
      type: 'company_tabs_update',
      payload: {
        companyId: 255,
        availableTabs: ['task-center', 'file-vault', 'dashboard'],
        timestamp: new Date().toISOString(),
        cache_invalidation: true
      }
    }
  });
  
  document.dispatchEvent(testEvent);
  console.log('Test event dispatched!', testEvent.detail);
  
  // Also try to send a message if WebSocket is already connected
  if (window.wsService && window.wsService._ws && 
      window.wsService._ws.readyState === WebSocket.OPEN) {
    
    // Directly call the message handler if available
    if (window.wsService._messageHandlers && 
        window.wsService._messageHandlers.company_tabs_update) {
      
      console.log('Calling company_tabs_update handler directly');
      window.wsService._messageHandlers.company_tabs_update({
        companyId: 255,
        availableTabs: ['task-center', 'file-vault', 'dashboard'],
        timestamp: new Date().toISOString(),
        cache_invalidation: true
      });
    }
    
    if (window.wsService._messageHandlers && 
        window.wsService._messageHandlers.company_tabs_updated) {
      
      console.log('Calling company_tabs_updated handler directly');
      window.wsService._messageHandlers.company_tabs_updated({
        companyId: 255,
        availableTabs: ['task-center', 'file-vault', 'dashboard'],
        timestamp: new Date().toISOString(),
        cache_invalidation: true
      });
    }
  }
}

// Export test function to global scope so it can be called from console
window.testCompanyTabsUpdate = testCompanyTabsUpdate;

console.log('WebSocket monitoring initialized!');
console.log('Call testCompanyTabsUpdate() to test company tabs update handling');

// Run test after 3 seconds
setTimeout(testCompanyTabsUpdate, 3000);