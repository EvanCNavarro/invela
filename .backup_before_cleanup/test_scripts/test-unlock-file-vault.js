/**
 * Test script to unlock file vault access for a company
 * 
 * This script simulates the form submission process by:
 * 1. Directly updating the company's available_tabs in the database
 * 2. Broadcasting the WebSocket notification
 */

import pg from 'pg';
import WebSocket from 'ws';

const { Client } = pg;

// Constants - modify these as needed
const COMPANY_ID = 193;  // The company to update (DevelopmentTestingM)
const DATABASE_URL = process.env.DATABASE_URL;
const SERVER_URL = 'http://localhost:5000';
const WS_URL = 'ws://localhost:5000/ws';

// Create PostgreSQL client
const client = new Client({
  connectionString: DATABASE_URL
});

async function unlockFileVault(companyId) {
  try {
    // Connect to database
    await client.connect();
    console.log('[DB] Successfully connected to PostgreSQL');
    
    // First, get current company data
    const companyResult = await client.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyResult.rows.length === 0) {
      console.error(`[ERROR] Company ${companyId} not found in database`);
      return false;
    }
    
    const company = companyResult.rows[0];
    const currentTabs = company.available_tabs || ['task-center'];
    
    // Check if file-vault is already present
    if (currentTabs.includes('file-vault')) {
      console.log(`[DB] Company ${companyId} already has file-vault tab`);
      
      // Even if already unlocked, let's broadcast a WebSocket event
      await broadcastWebSocketEvent(companyId, currentTabs);
      return true;
    }
    
    // Add file-vault tab
    const updatedTabs = [...currentTabs, 'file-vault'];
    console.log(`[DB] Updating tabs for company ${companyId}:`, {
      from: currentTabs,
      to: updatedTabs
    });
    
    // Update the company record
    const updateResult = await client.query(
      'UPDATE companies SET available_tabs = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [updatedTabs, new Date(), companyId]
    );
    
    if (updateResult.rows.length === 0) {
      console.error(`[ERROR] Failed to update company ${companyId}`);
      return false;
    }
    
    console.log(`[DB] Successfully updated company ${companyId} tabs`);
    const updatedCompany = updateResult.rows[0];
    
    // Broadcast WebSocket event
    await broadcastWebSocketEvent(companyId, updatedCompany.available_tabs);
    
    return true;
  } catch (error) {
    console.error('[ERROR] Failed to unlock file vault:', error);
    return false;
  } finally {
    await client.end();
    console.log('[DB] Database connection closed');
  }
}

async function broadcastWebSocketEvent(companyId, availableTabs) {
  return new Promise((resolve, reject) => {
    try {
      console.log(`[WS] Connecting to WebSocket server at ${WS_URL}`);
      const ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        console.log('[WS] WebSocket connection established');
        
        // Send the company_tabs_updated message
        const message = JSON.stringify({
          type: 'company_tabs_updated',
          data: {
            companyId,
            availableTabs,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log(`[WS] Sending company tabs update:`, {
          companyId,
          availableTabs,
          timestamp: new Date().toISOString()
        });
        
        ws.send(message);
        
        // Wait a moment to allow the message to be sent
        setTimeout(() => {
          ws.close();
          console.log('[WS] WebSocket connection closed');
          resolve(true);
        }, 1000);
      });
      
      ws.on('message', (data) => {
        console.log('[WS] Received message:', JSON.parse(data.toString()));
      });
      
      ws.on('error', (error) => {
        console.error('[WS] WebSocket error:', error);
        reject(error);
      });
      
      ws.on('close', (code, reason) => {
        if (code !== 1000) {
          console.warn(`[WS] WebSocket closed with code ${code} and reason: ${reason}`);
        }
      });
    } catch (error) {
      console.error('[WS] Error in WebSocket communication:', error);
      reject(error);
    }
  });
}

// Run the main function
(async () => {
  console.log(`[MAIN] Starting file vault unlock for company ${COMPANY_ID}`);
  const success = await unlockFileVault(COMPANY_ID);
  console.log(`[MAIN] File vault unlock ${success ? 'succeeded' : 'failed'}`);
})();