/**
 * Final company tabs broadcast script using recognized message type
 * 
 * This script creates a direct WebSocket connection and sends a recognized
 * message type to update company tabs.
 */

// Import required modules
const { Client } = require('pg');
const WebSocket = require('ws');

// Get environment variables
const DATABASE_URL = process.env.DATABASE_URL;

async function broadcastCompanyTabsUpdate() {
  console.log('[TabsBroadcast] Starting final company tabs broadcast');
  
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
    
    // Print current tabs state
    for (const company of result.rows) {
      console.log(`[TabsBroadcast] Company ${company.id} (${company.name}) has tabs: ${company.available_tabs.join(', ')}`);
      
      // Create and send a WebSocket message directly
      console.log(`[TabsBroadcast] Broadcasting tab update for company ${company.id}`);
      
      // Broadcast using a direct WebSocket connection
      const ws = new WebSocket('ws://localhost:5000/ws');
      
      ws.on('open', function open() {
        console.log(`[TabsBroadcast] WebSocket connection established for company ${company.id}`);
        
        // First authenticate
        const authMessage = JSON.stringify({
          type: 'authenticate',
          userId: 8, // Admin user ID
          companyId: company.id,
          timestamp: new Date().toISOString()
        });
        ws.send(authMessage);
        
        // Then send the update message
        setTimeout(() => {
          // Use 'company_updated' message type which is recognized by the server
          const message = JSON.stringify({
            type: 'company_updated',
            payload: {
              companyId: company.id,
              availableTabs: company.available_tabs,
              cache_invalidation: true,
              timestamp: new Date().toISOString(),
              source: 'builder_tab_removal'
            }
          });
          
          ws.send(message);
          console.log(`[TabsBroadcast] Tab update message sent for company ${company.id}`);
          
          // Close the connection after sending
          setTimeout(() => {
            ws.close();
            console.log(`[TabsBroadcast] WebSocket connection closed for company ${company.id}`);
          }, 1000);
        }, 1000);
      });
      
      ws.on('error', function error(err) {
        console.error(`[TabsBroadcast] WebSocket error for company ${company.id}:`, err);
      });
      
      // Wait for all WebSocket operations to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error('[TabsBroadcast] Error:', error);
  } finally {
    // Close database connection
    await dbClient.end();
    console.log('[TabsBroadcast] Database connection closed');
  }
}

// Run the broadcast
broadcastCompanyTabsUpdate().catch(error => {
  console.error('[TabsBroadcast] Unhandled error:', error);
});