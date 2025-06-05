/**
 * WebSocket-based script to populate task 620 with demo data
 * 
 * This script uses our WebSocket infrastructure to broadcast task updates
 * after directly populating the task with demo data in the database.
 */

const { db } = require('./db');
const { eq } = require('drizzle-orm');
const { tasks, kyb_responses, ky3p_responses, open_banking_responses } = require('./db/schema');
const WebSocket = require('ws');

// Create a WebSocket server to broadcast task updates
const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({ 
  port: 3001, 
  path: '/ws-populate'
});

// Function to broadcast task updates to all connected clients
function broadcastTaskUpdate(taskId, status, progress) {
  const message = JSON.stringify({
    type: 'task_updated',
    payload: {
      id: taskId,
      status: status,
      progress: progress,
      metadata: {
        lastUpdate: new Date().toISOString()
      }
    }
  });
  
  // Broadcast to all connected clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  
  console.log(`[WS Populate] Broadcasted task update: ${message}`);
}

async function populateTaskWithDemoData(taskId) {
  console.log(`[WS Populate] Starting to populate task ID ${taskId} with demo data`);
  
  try {
    // 1. First, determine the task type
    const [task] = await db
      .select({
        id: tasks.id,
        title: tasks.title, 
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(eq(tasks.id, taskId));
    
    if (!task) {
      console.error(`[WS Populate] Task ID ${taskId} not found`);
      return;
    }
    
    console.log(`[WS Populate] Found task: ${task.title} (${task.task_type})`);
    console.log(`[WS Populate] Task metadata:`, task.metadata);
    
    // 2. Generate and insert demo data based on the task type
    if (task.task_type === 'company_kyb') {
      await populateKybResponses(taskId);
    } else if (task.task_type === 'ky3p' || task.task_type === 'security_assessment') {
      await populateKy3pResponses(taskId);
    } else if (task.task_type === 'open_banking') {
      await populateOpenBankingResponses(taskId);
    } else {
      console.error(`[WS Populate] Unsupported task type: ${task.task_type}`);
      return;
    }
    
    // 3. Broadcast progress updates at intervals to simulate real-time progress
    for (let progress = 25; progress <= 100; progress += 25) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between updates
      
      const status = progress < 100 ? 'in_progress' : 'submitted';
      
      // Update the task status and progress in the database
      await db
        .update(tasks)
        .set({
          status: status,
          progress: progress,
          metadata: {
            ...task.metadata,
            lastProgressUpdate: new Date().toISOString(),
            submitted: progress === 100,
            submitted_at: progress === 100 ? new Date().toISOString() : null
          }
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast the update
      broadcastTaskUpdate(taskId, status, progress);
      
      console.log(`[WS Populate] Updated task progress: ${progress}%`);
    }
    
    console.log(`[WS Populate] Task ID ${taskId} successfully populated with demo data`);
    
  } catch (error) {
    console.error(`[WS Populate] Error:`, error);
  }
}

// KYB demo data generator
async function populateKybResponses(taskId) {
  console.log(`[WS Populate] Populating KYB responses for task ID ${taskId}`);
  
  const demoData = [
    { field_id: 'corporateRegistration', value: 'Yes', task_id: taskId },
    { field_id: 'registrationNumber', value: 'CRN-12345678', task_id: taskId },
    { field_id: 'registrationDate', value: '2020-01-15', task_id: taskId },
    { field_id: 'registrationAuthority', value: 'Companies House UK', task_id: taskId },
    { field_id: 'goodStanding', value: 'Yes', task_id: taskId },
    { field_id: 'standingCertificate', value: 'https://example.com/cert.pdf', task_id: taskId },
    { field_id: 'standingCertificateDate', value: '2025-01-10', task_id: taskId },
    { field_id: 'regulatoryActions', value: 'No', task_id: taskId },
    { field_id: 'regulatoryActionDetails', value: '', task_id: taskId },
    { field_id: 'investigationsIncidents', value: 'No', task_id: taskId },
    { field_id: 'investigationDetails', value: '', task_id: taskId }
  ];
  
  // Delete any existing responses
  await db
    .delete(kyb_responses)
    .where(eq(kyb_responses.task_id, taskId));
  
  // Insert demo responses
  for (const response of demoData) {
    await db
      .insert(kyb_responses)
      .values(response);
  }
  
  console.log(`[WS Populate] Inserted ${demoData.length} KYB responses for task ID ${taskId}`);
}

// KY3P demo data generator
async function populateKy3pResponses(taskId) {
  console.log(`[WS Populate] Populating KY3P responses for task ID ${taskId}`);
  
  // Generate 30 demo responses as a sample
  const demoData = [];
  
  // Sample field IDs for KY3P
  const fieldIds = [
    'securityPolicy_1', 'securityPolicy_2', 'securityPolicy_3',
    'accessControl_1', 'accessControl_2', 'accessControl_3',
    'dataEncryption_1', 'dataEncryption_2', 'dataEncryption_3',
    'networkSecurity_1', 'networkSecurity_2', 'networkSecurity_3',
    'incidentResponse_1', 'incidentResponse_2', 'incidentResponse_3',
    'businessContinuity_1', 'businessContinuity_2', 'businessContinuity_3',
    'vulnerabilityManagement_1', 'vulnerabilityManagement_2', 'vulnerabilityManagement_3',
    'securityAwareness_1', 'securityAwareness_2', 'securityAwareness_3',
    'physicalSecurity_1', 'physicalSecurity_2', 'physicalSecurity_3',
    'thirdPartyManagement_1', 'thirdPartyManagement_2', 'thirdPartyManagement_3'
  ];
  
  // Generate responses for each field ID
  for (const fieldId of fieldIds) {
    demoData.push({
      field_id: fieldId,
      value: 'Comprehensive controls in place',
      task_id: taskId,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  // Delete any existing responses
  await db
    .delete(ky3p_responses)
    .where(eq(ky3p_responses.task_id, taskId));
  
  // Insert demo responses
  for (const response of demoData) {
    await db
      .insert(ky3p_responses)
      .values(response);
  }
  
  console.log(`[WS Populate] Inserted ${demoData.length} KY3P responses for task ID ${taskId}`);
}

// Open Banking demo data generator
async function populateOpenBankingResponses(taskId) {
  console.log(`[WS Populate] Populating Open Banking responses for task ID ${taskId}`);
  
  // Generate 15 demo responses as a sample
  const demoData = [];
  
  // Sample field IDs for Open Banking
  const fieldIds = [
    'apiCapabilities_1', 'apiCapabilities_2', 'apiCapabilities_3',
    'standardsCompliance_1', 'standardsCompliance_2', 'standardsCompliance_3',
    'securityFeatures_1', 'securityFeatures_2', 'securityFeatures_3',
    'dataProtection_1', 'dataProtection_2', 'dataProtection_3',
    'supportServices_1', 'supportServices_2', 'supportServices_3'
  ];
  
  // Generate responses for each field ID
  for (const fieldId of fieldIds) {
    demoData.push({
      field_id: fieldId,
      value: 'Fully compliant with latest standards',
      task_id: taskId,
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  // Delete any existing responses
  await db
    .delete(open_banking_responses)
    .where(eq(open_banking_responses.task_id, taskId));
  
  // Insert demo responses
  for (const response of demoData) {
    await db
      .insert(open_banking_responses)
      .values(response);
  }
  
  console.log(`[WS Populate] Inserted ${demoData.length} Open Banking responses for task ID ${taskId}`);
}

// Run the script for task ID 620
wss.on('listening', () => {
  console.log('[WS Populate] WebSocket server started on port 3001');
  
  populateTaskWithDemoData(620)
    .then(() => {
      console.log('[WS Populate] Script completed');
      
      // Close the WebSocket server after 5 seconds
      setTimeout(() => {
        wss.close();
        console.log('[WS Populate] WebSocket server closed');
        process.exit(0);
      }, 5000);
    })
    .catch(error => {
      console.error('[WS Populate] Unhandled error:', error);
      process.exit(1);
    });
});

wss.on('error', (error) => {
  console.error('[WS Populate] WebSocket server error:', error);
  process.exit(1);
});