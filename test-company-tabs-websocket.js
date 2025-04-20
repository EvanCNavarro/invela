/**
 * Test WebSocket functionality for company tab updates
 * This script directly updates the database and then sends a WebSocket event
 */

// Import postgres
import pg from 'pg';
import { WebSocket } from 'ws';
const { Pool } = pg;

// Company IDs to update from screenshots
const COMPANY_IDS = [191, 173, 185, 192];

// Create a PostgreSQL pool for database operations
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to update company tabs directly in the database
async function updateCompanyTabs(companyId) {
  console.log(`[DB] Updating company ${companyId} to include file-vault tab`);
  
  try {
    // First check current tabs
    const { rows: companies } = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companies.length === 0) {
      console.error(`[DB] Company ID ${companyId} not found`);
      return false;
    }
    
    const company = companies[0];
    
    // Get current tabs or default to task-center only
    const currentTabs = company.available_tabs || ['task-center'];
    console.log(`[DB] Company ${company.name} (${companyId}) current tabs: ${JSON.stringify(currentTabs)}`);
    
    // Add file-vault if not present
    if (!currentTabs.includes('file-vault')) {
      const newTabs = [...currentTabs, 'file-vault'];
      
      // Update the database
      const { rows: updated } = await pool.query(
        'UPDATE companies SET available_tabs = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [newTabs, companyId]
      );
      
      if (updated.length > 0) {
        console.log(`[DB] Successfully updated tabs for company ${company.name}:`, newTabs);
        return true;
      } else {
        console.error(`[DB] Failed to update tabs for company ${companyId}`);
        return false;
      }
    } else {
      console.log(`[DB] Company ${company.name} already has file-vault tab`);
      return false;
    }
  } catch (error) {
    console.error(`[DB] Error updating company tabs:`, error);
    return false;
  }
}

// Function to send WebSocket message
function sendWebSocketMessage(companyId) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[WS] Creating WebSocket connection to ws://localhost:5000/ws`);
      const ws = new WebSocket('ws://localhost:5000/ws');
      
      ws.on('open', () => {
        console.log(`[WS] WebSocket connection established`);
        
        // Get current tabs from database
        pool.query(
          'SELECT * FROM companies WHERE id = $1',
          [companyId]
        ).then(({ rows }) => {
          if (rows.length === 0) {
            console.error(`[WS] Company ${companyId} not found`);
            ws.close();
            reject(new Error(`Company ${companyId} not found`));
            return;
          }
          
          const company = rows[0];
          const tabs = company.available_tabs || ['task-center'];
          
          // Create and send message
          const message = JSON.stringify({
            type: 'company_tabs_updated',
            data: {
              companyId,
              availableTabs: tabs,
              timestamp: new Date().toISOString()
            }
          });
          
          console.log(`[WS] Sending message:`, message);
          ws.send(message);
          
          // Wait and close
          setTimeout(() => {
            console.log(`[WS] Closing WebSocket connection for company ${companyId}`);
            ws.close();
            resolve(true);
          }, 500);
        }).catch(err => {
          console.error(`[WS] Database error:`, err);
          ws.close();
          reject(err);
        });
      });
      
      ws.on('message', (data) => {
        console.log(`[WS] Received message:`, data.toString());
      });
      
      ws.on('error', (err) => {
        console.error(`[WS] WebSocket error:`, err);
        reject(err);
      });
      
      ws.on('close', () => {
        console.log(`[WS] WebSocket connection closed for company ${companyId}`);
      });
    } catch (error) {
      console.error(`[WS] Error creating WebSocket:`, error);
      reject(error);
    }
  });
}

// Main function to process all companies
async function processAllCompanies() {
  try {
    console.log(`[MAIN] Starting tab update for ${COMPANY_IDS.length} companies`);
    
    // Process each company
    for (const companyId of COMPANY_IDS) {
      console.log(`\n[MAIN] Processing company ${companyId}...`);
      
      // First update in database
      const updated = await updateCompanyTabs(companyId);
      
      // Then send WebSocket message (even if not updated, to force refresh)
      console.log(`[MAIN] Sending WebSocket message for company ${companyId}`);
      await sendWebSocketMessage(companyId);
      
      console.log(`[MAIN] Finished processing company ${companyId} (DB updated: ${updated})`);
    }
    
    console.log(`\n[MAIN] All companies processed successfully`);
  } catch (error) {
    console.error(`[MAIN] Error processing companies:`, error);
  } finally {
    // Close the database pool
    await pool.end();
    console.log(`[MAIN] Database connection closed`);
    process.exit(0);
  }
}

// Run the main function
console.log(`[MAIN] Starting company tabs update script`);
processAllCompanies();