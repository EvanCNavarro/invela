// force-unlock-file-vault-direct.js
// This script directly updates the company record to include 'file-vault' in the available_tabs
// It then broadcasts a WebSocket message to notify clients to refresh company data
// To run: node force-unlock-file-vault-direct.js [companyId]

// Get company ID from command line or default to 200
const companyId = process.argv[2] ? parseInt(process.argv[2]) : 200;

// Require dependencies
const { Pool } = require('pg');
const WebSocket = require('ws');

// Setup PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Create WebSocket client
function createWebSocketClient() {
  // Determine the protocol based on the DATABASE_URL
  const protocol = process.env.DATABASE_URL.startsWith('postgres:') ? 'ws:' : 'wss:';
  const host = '0.0.0.0:5000'; // Since we're running locally
  const wsUrl = `${protocol}//${host}/ws`;
  
  console.log(`Connecting to WebSocket at ${wsUrl}`);
  
  return new WebSocket(wsUrl);
}

// Function to update the company record
async function unlockFileVault(companyId) {
  console.log(`\n🔐 Force unlocking file vault for company ${companyId}...`);
  
  try {
    // First get current company data
    const { rows: beforeRows } = await pool.query(
      'SELECT id, name, available_tabs FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (beforeRows.length === 0) {
      console.error(`❌ Company ${companyId} not found`);
      return null;
    }
    
    const company = beforeRows[0];
    console.log(`Current company: ${company.name} (ID: ${company.id})`);
    console.log(`Current tabs:`, company.available_tabs);
    
    // Check if file-vault already exists
    const hasFileVault = company.available_tabs && 
                         company.available_tabs.includes('file-vault');
    
    if (hasFileVault) {
      console.log(`✅ File vault is already unlocked for company ${companyId}`);
      return company;
    }
    
    // Prepare new tabs array
    const newTabs = company.available_tabs 
      ? [...company.available_tabs, 'file-vault'] 
      : ['task-center', 'file-vault'];
    
    // Update company record
    console.log(`Updating company ${companyId} with new tabs:`, newTabs);
    
    const { rows } = await pool.query(
      'UPDATE companies SET available_tabs = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newTabs, companyId]
    );
    
    if (rows.length === 0) {
      console.error(`❌ Failed to update company ${companyId}`);
      return null;
    }
    
    const updatedCompany = rows[0];
    console.log(`✅ Successfully updated company ${companyId}:`);
    console.log(`New tabs:`, updatedCompany.available_tabs);
    
    return updatedCompany;
  } catch (error) {
    console.error(`❌ Database error:`, error);
    return null;
  }
}

// Function to broadcast WebSocket message
function broadcastWebSocketMessage(companyId, availableTabs) {
  return new Promise((resolve, reject) => {
    console.log(`\n📡 Broadcasting company_tabs_updated message...`);
    
    const ws = createWebSocketClient();
    let timeoutId;
    
    // Set a timeout to avoid hanging indefinitely
    timeoutId = setTimeout(() => {
      ws.terminate();
      reject(new Error('WebSocket connection timeout'));
    }, 10000);
    
    ws.on('open', () => {
      console.log(`🔌 WebSocket connected`);
      
      // Send message
      const message = {
        type: 'company_tabs_updated',
        payload: {
          companyId,
          availableTabs,
          cache_invalidation: true,
          timestamp: new Date().toISOString(),
          source: 'force-unlock-file-vault-direct'
        }
      };
      
      console.log(`📤 Sending message:`, message);
      ws.send(JSON.stringify(message));
      
      // Wait briefly before closing to ensure message is sent
      setTimeout(() => {
        ws.close();
        clearTimeout(timeoutId);
        console.log(`🔌 WebSocket closed`);
        resolve(true);
      }, 1000);
    });
    
    ws.on('message', (data) => {
      console.log(`📥 Received:`, data.toString());
    });
    
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error:`, error);
      clearTimeout(timeoutId);
      reject(error);
    });
    
    ws.on('close', () => {
      clearTimeout(timeoutId);
      console.log(`🔌 WebSocket connection closed`);
    });
  });
}

// Main function
async function main() {
  console.log(`🚀 Starting file vault force unlock for company ${companyId}`);
  
  try {
    // Step 1: Update the company record
    const updatedCompany = await unlockFileVault(companyId);
    
    if (!updatedCompany) {
      console.error(`\n❌ Failed to update company record`);
      process.exit(1);
    }
    
    // Step 2: Broadcast WebSocket message
    try {
      await broadcastWebSocketMessage(companyId, updatedCompany.available_tabs);
      console.log(`\n✅ WebSocket broadcast completed`);
    } catch (wsError) {
      console.error(`\n⚠️ WebSocket broadcast failed, but database was updated:`, wsError);
    }
    
    console.log(`\n✅ File vault should now be unlocked for company ${companyId}`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Unhandled error:`, error);
    process.exit(1);
  }
}

// Run the main function
main();