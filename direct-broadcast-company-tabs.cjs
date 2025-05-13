/**
 * Direct broadcast for company tabs update
 *
 * This script triggers a company tabs update broadcast using the server's API endpoint
 * rather than trying to access the WebSocket server directly.
 */

const { Client } = require('pg');
const fetch = require('node-fetch');

// Get environment variables
const DATABASE_URL = process.env.DATABASE_URL;

async function broadcastCompanyTabsUpdate() {
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

    // Print current tabs state
    for (const company of result.rows) {
      console.log(`[TabsBroadcast] Company ${company.id} (${company.name}) has tabs: ${company.available_tabs.join(', ')}`);
    }

    // For each company, make a direct API call to broadcast the update
    for (const company of result.rows) {
      console.log(`[TabsBroadcast] Broadcasting update for company ${company.id} (${company.name})`);
      
      try {
        // Call the internal API endpoint that handles broadcasting
        const response = await fetch(`http://localhost:5000/api/companies/${company.id}/broadcast-tabs-update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            companyId: company.id,
            availableTabs: company.available_tabs,
            source: 'builder_tab_removal'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`[TabsBroadcast] Broadcast successful: ${JSON.stringify(data)}`);
        } else {
          console.error(`[TabsBroadcast] Broadcast failed with status ${response.status}`);
          console.error(await response.text());
        }
      } catch (error) {
        console.error(`[TabsBroadcast] Error broadcasting for company ${company.id}:`, error);
      }
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