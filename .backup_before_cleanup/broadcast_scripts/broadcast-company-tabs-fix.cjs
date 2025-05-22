/**
 * Critical fix for company tabs update broadcasting
 * 
 * This script:
 * 1. Fetches the company's current available_tabs from the database
 * 2. Ensures it's stored as a proper PostgreSQL array
 * 3. Broadcasts the update via both company_tabs_update and company_tabs_updated events
 * to ensure all clients receive the update
 */

const { Pool } = require('pg');

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Import ws for WebSocket
const WebSocket = require('ws');
const http = require('http');
const express = require('express');

// Create a simple Express server
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

// Setup WebSocket server
wss.on('connection', (ws) => {
  console.log('Client connected');
});

async function fixAndBroadcastTabs(companyId = 255) {
  try {
    console.log(`Fixing and broadcasting tabs for company ID: ${companyId}`);
    
    // First, get the current tabs from the database
    const result = await pool.query(`
      SELECT id, name, category, available_tabs 
      FROM companies 
      WHERE id = $1
    `, [companyId]);
    
    if (result.rows.length === 0) {
      console.error(`Company with ID ${companyId} not found`);
      return;
    }
    
    const company = result.rows[0];
    console.log('Company found in database:');
    console.log({
      id: company.id,
      name: company.name,
      category: company.category,
      available_tabs: company.available_tabs
    });
    
    // Ensure available_tabs is an array
    let currentTabs = ['task-center', 'file-vault']; // Default tabs
    
    if (company.available_tabs) {
      if (Array.isArray(company.available_tabs)) {
        currentTabs = company.available_tabs;
        console.log('Using existing array from database:', currentTabs);
      } else if (typeof company.available_tabs === 'string') {
        try {
          // Try to parse as JSON first
          currentTabs = JSON.parse(company.available_tabs);
          console.log('Parsed JSON string from database:', currentTabs);
        } catch (e) {
          // If that fails, try to parse as PostgreSQL array format
          const pgArrayStr = company.available_tabs.trim();
          if (pgArrayStr.startsWith('{') && pgArrayStr.endsWith('}')) {
            const innerStr = pgArrayStr.substring(1, pgArrayStr.length - 1);
            currentTabs = innerStr.split(',').map(s => s.trim());
            console.log('Parsed PostgreSQL array format:', currentTabs);
          } else {
            console.log('Could not parse as JSON or PostgreSQL array, using default tabs');
          }
        }
      }
    }
    
    // Normalize tabs - ensure we have both task-center and file-vault
    if (!currentTabs.includes('task-center')) {
      currentTabs.push('task-center');
    }
    
    if (!currentTabs.includes('file-vault')) {
      currentTabs.push('file-vault');
    }
    
    console.log('Final tabs to set:', currentTabs);
    
    // Update the company record to ensure tabs are stored as native PostgreSQL array
    const updateResult = await pool.query(`
      UPDATE companies
      SET available_tabs = $1
      WHERE id = $2
      RETURNING id, name, available_tabs
    `, [currentTabs, companyId]);
    
    console.log('Company updated in database:', updateResult.rows[0]);
    
    // Now broadcast the updated tabs to all connected clients
    broadcastTabsUpdate(companyId, currentTabs);
    
    return currentTabs;
  } catch (error) {
    console.error('Error fixing and broadcasting tabs:', error);
  } finally {
    // Close database connection
    await pool.end();
  }
}

function broadcastTabsUpdate(companyId, availableTabs) {
  const timestamp = new Date().toISOString();
  const clientCount = broadcastToAll({
    type: 'company_tabs_update',
    payload: {
      companyId,
      availableTabs,
      timestamp,
      cache_invalidation: true
    }
  });
  
  // Also broadcast using the alternative event name
  const clientCount2 = broadcastToAll({
    type: 'company_tabs_updated',
    payload: {
      companyId,
      availableTabs,
      timestamp,
      cache_invalidation: true
    }
  });
  
  console.log(`Broadcast company_tabs_update to ${clientCount} clients`);
  console.log(`Broadcast company_tabs_updated to ${clientCount2} clients`);
}

function broadcastToAll(data) {
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  let clientCount = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
      clientCount++;
    }
  });
  
  return clientCount;
}

// Start the server and run the fix
const PORT = 3300;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Run the fix with default company ID
  fixAndBroadcastTabs().then(() => {
    console.log('Fix completed');
    
    // Keep the server running for a short period to allow broadcasts to complete
    setTimeout(() => {
      console.log('Shutting down server...');
      server.close();
      process.exit(0);
    }, 10000); // Wait 10 seconds
  });
});