/**
 * Broadcasts a tab update to all WebSocket clients for Affirm
 */

import WebSocket from 'ws';

// Get the WebSocket server from global scope
const wss = global.wss;

if (!wss) {
  console.error('WebSocket server not found in global scope');
  process.exit(1);
}

const COMPANY_ID = 8; // Affirm
const AVAILABLE_TABS = ["task-center", "dashboard", "network", "file-vault", "insights", "builder"];

// Prepare the message
const message = JSON.stringify({
  type: 'company_update',
  payload: {
    companyId: COMPANY_ID,
    availableTabs: AVAILABLE_TABS,
    cache_invalidation: true
  }
});

// Broadcast to all connected clients
let broadcastCount = 0;
wss.clients.forEach(client => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(message);
    broadcastCount++;
  }
});

console.log(`WebSocket message broadcast to ${broadcastCount} clients`);