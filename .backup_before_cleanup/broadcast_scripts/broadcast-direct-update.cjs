/**
 * Direct broadcast script for company tabs update
 * Uses the application's built-in WebSocket service
 */

// Import the WebSocket service module
const { broadcastCompanyTabsUpdate } = require('./server/services/websocket');

// Define the company ID and tabs to broadcast
const companyId = 255;
const availableTabs = ['task-center', 'file-vault'];

// Execute the broadcast
console.log(`Broadcasting tabs update for company ${companyId}:`, availableTabs);
const result = broadcastCompanyTabsUpdate(companyId, availableTabs);

console.log('Broadcast result:', result);
console.log('Broadcast complete!');