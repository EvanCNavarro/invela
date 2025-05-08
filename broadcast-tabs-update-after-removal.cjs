/**
 * Broadcasts a tab update to all WebSocket clients after Builder tab removal
 * 
 * This script sends a WebSocket message to notify all connected clients
 * that the available_tabs for companies 1 and 5 have been updated.
 */

const { Client } = require('pg');
const WebSocket = require('ws');

// Get environment variables
const DATABASE_URL = process.env.DATABASE_URL;

async function broadcastTabsUpdate() {
  console.log('[TabsBroadcast] Starting tabs update broadcast process');

  // Initialize database client
  const dbClient = new Client({
    connectionString: DATABASE_URL
  });

  try {
    // Connect to the database
    await dbClient.connect();
    console.log('[TabsBroadcast] Connected to database');

    // Fetch updated tabs for companies 1 and 5
    const query = 'SELECT id, name, available_tabs FROM companies WHERE id IN (1, 5)';
    const result = await dbClient.query(query);
    
    if (!result.rows || result.rows.length === 0) {
      console.log('[TabsBroadcast] No companies found with IDs 1 and 5');
      return;
    }

    // Get the WebSocket server from global scope
    const wss = global.wss;

    if (!wss) {
      console.error('[TabsBroadcast] WebSocket server not found in global scope');
      return;
    }

    // Broadcast updates for each company
    let broadcastCount = 0;
    for (const company of result.rows) {
      console.log(`[TabsBroadcast] Preparing update for company ${company.id} (${company.name}): ${company.available_tabs.join(', ')}`);
      
      // Prepare the message
      const message = JSON.stringify({
        type: 'company_tabs_updated',
        payload: {
          companyId: company.id,
          availableTabs: company.available_tabs,
          cache_invalidation: true,
          timestamp: new Date().toISOString(),
          source: 'builder_tab_removal'
        }
      });

      // Broadcast to all connected clients
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
          broadcastCount++;
        }
      });
    }

    console.log(`[TabsBroadcast] WebSocket messages broadcast to ${broadcastCount} clients`);
  } catch (error) {
    console.error('[TabsBroadcast] Error:', error);
  } finally {
    // Close database connection
    await dbClient.end();
    console.log('[TabsBroadcast] Database connection closed');
  }
}

// Run the broadcast
broadcastTabsUpdate().catch(error => {
  console.error('[TabsBroadcast] Unhandled error:', error);
});