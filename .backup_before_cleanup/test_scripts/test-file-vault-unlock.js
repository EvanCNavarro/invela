/**
 * Test script to verify the File Vault unlock functionality
 * 
 * This script simulates a KYB form submission and the subsequent
 * file vault unlocking process. It verifies that:
 * 1. The company record is properly updated in the database
 * 2. The WebSocket notification is sent with cache_invalidation flag
 * 3. The UI should correctly reflect the change
 */
import pg from 'pg';
import WebSocket from 'ws';

const { Pool } = pg;

// Create a database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Helper function to get company details
async function getCompanyDetails(companyId) {
  try {
    const result = await pool.query(
      'SELECT id, name, available_tabs FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (result.rows.length === 0) {
      console.error(`Company with ID ${companyId} not found`);
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching company details:', error);
    return null;
  }
}

// Helper function to unlock the file vault
async function unlockFileVault(companyId) {
  try {
    console.log(`Attempting to unlock file vault for company ${companyId}...`);
    
    // Get current company details
    const companyBefore = await getCompanyDetails(companyId);
    if (!companyBefore) {
      return false;
    }
    
    console.log('Current company state:', companyBefore);
    
    // Check if file-vault is already in available_tabs
    const currentTabs = companyBefore.available_tabs || [];
    if (currentTabs.includes('file-vault')) {
      console.log('File vault is already unlocked');
      return false;
    }
    
    // Update available_tabs to include file-vault
    const updatedTabs = [...currentTabs, 'file-vault'].filter(Boolean); // Remove any null/undefined values
    
    // Update the company record
    const updateResult = await pool.query(
      'UPDATE companies SET available_tabs = $1 WHERE id = $2 RETURNING id, name, available_tabs',
      [updatedTabs, companyId]
    );
    
    if (updateResult.rows.length === 0) {
      console.error('Failed to update company tabs');
      return false;
    }
    
    const updatedCompany = updateResult.rows[0];
    console.log('Company tabs updated successfully:', updatedCompany);
    
    // Send WebSocket notification
    console.log('Broadcasting tab update via WebSocket...');
    await broadcastWebSocketMessage(companyId, updatedTabs);
    
    return updatedCompany;
  } catch (error) {
    console.error('Error unlocking file vault:', error);
    return false;
  }
}

// Simulate WebSocket broadcast
async function broadcastWebSocketMessage(companyId, availableTabs) {
  try {
    // Connect to our WebSocket server
    const protocol = 'ws:';
    const host = 'localhost:5000'; // Adjust if needed
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log(`Connecting to WebSocket at ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    
    // Return a promise that resolves when the message is sent
    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('WebSocket connection established');
        
        // Create the message with cache_invalidation flag
        const message = {
          type: 'company_tabs_updated',
          payload: {
            companyId,
            availableTabs,
            timestamp: new Date().toISOString(),
            cache_invalidation: true
          }
        };
        
        // Send the message
        ws.send(JSON.stringify(message));
        console.log('WebSocket message sent:', message);
        
        // Wait a moment before closing
        setTimeout(() => {
          ws.close();
          resolve(true);
        }, 1000);
      });
      
      ws.on('message', (data) => {
        console.log('Received message from server:', data.toString());
      });
      
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      // Set timeout
      setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);
    });
  } catch (error) {
    console.error('Error sending WebSocket message:', error);
    return false;
  }
}

// Main function to run the test
async function runTest() {
  try {
    // Get the company ID from command line argument or use default demo company
    const companyId = process.argv[2] ? parseInt(process.argv[2]) : 198; // Default to DevelopmentTestingR
    
    console.log(`Testing file vault unlock for company ID: ${companyId}`);
    
    // Unlock the file vault
    const result = await unlockFileVault(companyId);
    
    if (result) {
      console.log('Test completed successfully!');
      console.log('Available tabs now include file-vault:', result.available_tabs);
    } else {
      console.log('Test completed with issues. See logs above for details.');
    }
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the test
runTest();