/**
 * Tab Unlocking Process Monitor
 * 
 * This script monitors the tab unlocking process for a specific company,
 * providing detailed visibility into the state before and after submitting a form.
 * It helps diagnose issues with the File Vault tab not appearing after submission.
 * 
 * Usage: 
 * node monitor-tab-unlocking.js [companyId]
 */

require('dotenv').config();
const { Pool } = require('pg');
const WebSocket = require('ws');
const colors = require('./server/utils/console-colors');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configuration
const companyId = process.argv[2] ? parseInt(process.argv[2], 10) : 274; // Default to company 274
const taskId = process.argv[3] ? parseInt(process.argv[3], 10) : 766; // Default to task 766

// WebSocket setup
let ws = null;
const wsUrl = 'ws://localhost:3000/ws';

// Get the protocol and host based on environment
function getWebSocketUrl() {
  const host = process.env.REPLIT_URL || 'localhost:3000';
  const protocol = host.includes('replit') ? 'wss' : 'ws';
  const baseUrl = host.includes('replit') ? host : 'localhost:3000';
  return `${protocol}://${baseUrl}/ws`;
}

/**
 * Log message with color
 */
function log(message, color = colors.reset) {
  console.log(color, message, colors.reset);
}

/**
 * Connect to WebSocket server
 */
function connectWebSocket() {
  const url = getWebSocketUrl();
  log(`Connecting to WebSocket at ${url}...`, colors.yellow);
  
  return new Promise((resolve, reject) => {
    try {
      ws = new WebSocket(url);
      
      ws.on('open', () => {
        log('WebSocket connection established! ✅', colors.green);
        resolve(ws);
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          
          // Filter for messages related to our company
          if (message.companyId === companyId || 
              (message.metadata && message.metadata.companyId === companyId)) {
            log('Received message related to our company:', colors.cyan);
            console.log(JSON.stringify(message, null, 2));
            
            // If this is a tab update, show it prominently
            if (message.type === 'company_tabs_updated' || 
                (message.metadata && message.metadata.unlockedTabs)) {
              log('🔔 TAB UPDATE DETECTED! 🔔', colors.green);
              console.log('Available tabs:', message.availableTabs || 
                         (message.metadata && message.metadata.unlockedTabs) || 
                         'None specified in message');
            }
          }
        } catch (err) {
          log(`Error parsing WebSocket message: ${err.message}`, colors.red);
        }
      });
      
      ws.on('error', (error) => {
        log(`WebSocket error: ${error.message}`, colors.red);
        reject(error);
      });
      
      ws.on('close', () => {
        log('WebSocket connection closed', colors.yellow);
      });
    } catch (error) {
      log(`Error creating WebSocket: ${error.message}`, colors.red);
      reject(error);
    }
  });
}

/**
 * Get company tabs from database
 */
async function getCompanyTabs() {
  try {
    const client = await pool.connect();
    
    log(`Checking tabs for company ${companyId}...`, colors.cyan);
    
    const query = `
      SELECT 
        id, 
        name, 
        available_tabs,
        updated_at
      FROM companies 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [companyId]);
    client.release();
    
    if (result.rows.length === 0) {
      log(`Company with ID ${companyId} not found`, colors.red);
      return null;
    }
    
    const company = result.rows[0];
    log(`Company: ${company.name} (ID: ${company.id})`, colors.green);
    log(`Available tabs: ${JSON.stringify(company.available_tabs || [])}`, colors.yellow);
    log(`Last updated: ${company.updated_at}`, colors.cyan);
    
    // Check if file-vault tab is available
    const hasFileVault = (company.available_tabs || []).includes('file-vault');
    if (hasFileVault) {
      log('✅ File Vault tab is AVAILABLE', colors.green);
    } else {
      log('❌ File Vault tab is NOT available', colors.red);
    }
    
    return company;
  } catch (error) {
    log(`Error fetching company tabs: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Get task information from database
 */
async function getTaskInfo() {
  try {
    const client = await pool.connect();
    
    log(`Checking task ${taskId}...`, colors.cyan);
    
    const query = `
      SELECT 
        id, 
        name, 
        status,
        progress,
        submitted_at,
        submitted,
        company_id
      FROM tasks 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [taskId]);
    client.release();
    
    if (result.rows.length === 0) {
      log(`Task with ID ${taskId} not found`, colors.red);
      return null;
    }
    
    const task = result.rows[0];
    log(`Task: ${task.name} (ID: ${task.id})`, colors.green);
    log(`Status: ${task.status}, Progress: ${task.progress}%`, colors.yellow);
    log(`Submitted: ${task.submitted ? 'Yes' : 'No'}, Submitted at: ${task.submitted_at || 'N/A'}`, colors.cyan);
    
    // Verification
    if (task.company_id !== companyId) {
      log(`⚠️ WARNING: Task belongs to company ${task.company_id}, not the specified company ${companyId}`, colors.red);
    }
    
    return task;
  } catch (error) {
    log(`Error fetching task info: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Main monitoring function
 */
async function monitorTabUnlocking() {
  try {
    log('📊 Tab Unlocking Process Monitor 📊', colors.magenta);
    log('---------------------------------------', colors.magenta);
    
    // Check initial company tabs
    log('\n📋 INITIAL STATE:', colors.blue);
    await getCompanyTabs();
    await getTaskInfo();
    
    // Connect to WebSocket to listen for updates
    log('\n🔌 CONNECTING TO WEBSOCKET...', colors.blue);
    await connectWebSocket();
    
    log('\n🔍 MONITORING FOR TAB UPDATES...', colors.blue);
    log('Please submit the form now to trigger tab unlocking.', colors.yellow);
    log('This script will listen for WebSocket events and check the database.', colors.yellow);
    
    // Schedule periodic checks
    const checkInterval = setInterval(async () => {
      log('\n📊 PERIODIC CHECK:', colors.blue);
      log(`Timestamp: ${new Date().toISOString()}`, colors.cyan);
      await getCompanyTabs();
      await getTaskInfo();
    }, 10000); // Check every 10 seconds
    
    // Keep script running for monitoring
    setTimeout(() => {
      clearInterval(checkInterval);
      if (ws) ws.close();
      log('\n📊 MONITORING COMPLETE', colors.magenta);
      process.exit(0);
    }, 5 * 60 * 1000); // Run for 5 minutes max
    
  } catch (error) {
    log(`Error in monitoring: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Run the monitor
monitorTabUnlocking();