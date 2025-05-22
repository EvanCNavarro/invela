/**
 * Force unlock file vault for a specific company
 * 
 * This script directly updates the company record in the database
 * and can be used to verify and debug the WebSocket events
 */

import pg from 'pg';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Company ID to update (from the screenshot)
const COMPANY_ID = 191; // DevelopmentTestingK company ID

// Setup database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function unlockFileVault(companyId) {
  console.log(`[UNLOCK] Starting file vault unlock for company ID ${companyId}...`);
  
  try {
    // 1. Get the current company data
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyResult.rows.length === 0) {
      console.error(`[UNLOCK] ERROR: Company ID ${companyId} not found`);
      return false;
    }
    
    const company = companyResult.rows[0];
    console.log(`[UNLOCK] Found company: ${company.name} (ID: ${company.id})`);
    
    // 2. Check if file-vault is already in available_tabs
    const currentTabs = company.available_tabs || ['task-center'];
    console.log(`[UNLOCK] Current tabs: ${JSON.stringify(currentTabs)}`);
    
    // If file-vault is already included, don't add it again
    if (currentTabs.includes('file-vault')) {
      console.log(`[UNLOCK] File vault already unlocked for company ${company.name}`);
      
      // But let's force a WebSocket message to test client handling
      console.log(`[UNLOCK] Force triggering a WebSocket update event...`);
      
      // Make HTTP request to API endpoint to trigger WebSocket event
      await triggerWebSocketEvent(companyId, currentTabs);
      
      return true;
    }
    
    // 3. Update the company with file-vault tab
    const updatedTabs = [...currentTabs, 'file-vault'];
    
    const updateResult = await pool.query(
      'UPDATE companies SET available_tabs = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [updatedTabs, companyId]
    );
    
    if (updateResult.rows.length === 0) {
      console.error(`[UNLOCK] ERROR: Failed to update company ${companyId}`);
      return false;
    }
    
    const updatedCompany = updateResult.rows[0];
    
    console.log(`[UNLOCK] Successfully updated company tabs:`, {
      company: updatedCompany.name,
      previousTabs: currentTabs,
      newTabs: updatedCompany.available_tabs
    });
    
    // 4. Trigger WebSocket event through API
    console.log(`[UNLOCK] Triggering WebSocket event for tab update...`);
    await triggerWebSocketEvent(companyId, updatedCompany.available_tabs);
    
    console.log(`[UNLOCK] File vault successfully unlocked for company ${company.name}`);
    return true;
  } catch (error) {
    console.error(`[UNLOCK] ERROR unlocking file vault:`, error);
    return false;
  } finally {
    // Close db pool
    await pool.end();
  }
}

// Function to trigger WebSocket event via direct API call
async function triggerWebSocketEvent(companyId, availableTabs) {
  return new Promise((resolve, reject) => {
    // Prepare the request data
    const data = JSON.stringify({
      addTabs: ['file-vault'],
      sendWebSocketEvent: true
    });
    
    // Configure the request options
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api/companies/${companyId}/update-tabs`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    // Create and send the request
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[UNLOCK] API response: ${responseData}`);
          resolve();
        } else {
          console.error(`[UNLOCK] API error: ${res.statusCode} - ${responseData}`);
          reject(new Error(`API returned status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`[UNLOCK] Request error:`, error);
      reject(error);
    });
    
    // Write data to request body
    req.write(data);
    req.end();
  });
}

// Run the unlock function
unlockFileVault(COMPANY_ID)
  .then(success => {
    if (success) {
      console.log(`[UNLOCK] Unlock operation completed successfully`);
    } else {
      console.log(`[UNLOCK] Unlock operation failed`);
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`[UNLOCK] Unhandled error:`, error);
    process.exit(1);
  });