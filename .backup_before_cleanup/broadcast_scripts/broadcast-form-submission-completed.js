/**
 * Broadcast Form Submission Completed
 * 
 * This script broadcasts a WebSocket message to notify clients that a form submission
 * has been completed. Use this to trigger the form submission success modal in the UI.
 */

import WebSocket from 'ws';
import dotenv from 'dotenv';

dotenv.config();

// Task parameters
const taskId = process.argv[2] ? parseInt(process.argv[2]) : 758;
const formType = process.argv[3] || 'kyb';
const companyId = process.argv[4] ? parseInt(process.argv[4]) : 272;

// Create a unique trace ID for debugging
const traceId = `form_completion_${taskId}_${Date.now()}`;

// Function to broadcast the form submission completed event
async function broadcastFormSubmissionCompleted() {
  return new Promise((resolve, reject) => {
    try {
      // Connect to the WebSocket server
      const wsUrl = 'ws://localhost:5000/ws';
      console.log(`Connecting to WebSocket server at ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      // Handle connection events
      ws.on('open', () => {
        console.log('WebSocket connection established');
        
        // Create the timestamp
        const timestamp = new Date().toISOString();
        
        // Create completed actions
        const completedActions = [
          {
            type: "task_completion",
            description: "Task marked as complete",
            data: {
              details: "Your form has been successfully submitted and the task is marked as complete."
            }
          },
          {
            type: "file_generation", 
            description: "File generated",
            data: {
              details: `A ${formType} file has been generated and saved to your file vault.`,
              fileId: 123 // Sample file ID
            }
          },
          {
            type: "tabs_unlocked",
            description: "New Access Granted",
            data: {
              details: "Unlocked tabs: file-vault",
              buttonText: "Go to File Vault",
              url: "/file-vault"
            }
          }
        ];
        
        // Create the form submission completed message
        const message = {
          type: 'form_submission_completed',
          payload: {
            formType,
            taskId,
            companyId,
            fileId: 123, // Sample file ID
            fileName: `${formType.toUpperCase()}_Report_${taskId}.pdf`,
            unlockedTabs: ['file-vault'],
            completedActions,
            status: 'success',
            submissionDate: timestamp,
            source: 'final_completion',
            metadata: {
              formSubmission: true,
              availableTabs: ['file-vault'],
              submissionComplete: true,
              finalCompletion: true,
              timestamp,
              source: 'final_completion'
            },
            timestamp,
            traceId
          }
        };
        
        console.log(`Broadcasting form submission completed for task ${taskId}:`, {
          taskId,
          formType,
          companyId,
          traceId
        });
        
        // Send the message
        ws.send(JSON.stringify(message));
        
        // Close the connection after a short delay
        setTimeout(() => {
          console.log('Closing WebSocket connection');
          ws.close();
          resolve({
            success: true,
            message: `Form submission completed for task ${taskId} broadcasted successfully`,
            traceId
          });
        }, 500);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject({
          success: false,
          error: error.message || 'Unknown WebSocket error',
          traceId
        });
      });
      
      // Set a timeout in case connection hangs
      setTimeout(() => {
        ws.close();
        reject({
          success: false,
          error: 'Connection timeout',
          traceId
        });
      }, 5000);
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      reject({
        success: false,
        error: error.message || 'Unknown error',
        traceId
      });
    }
  });
}

// Run the broadcast
console.log(`Preparing to broadcast form submission completed for task ${taskId} (type: ${formType}, company: ${companyId})`);

broadcastFormSubmissionCompleted()
  .then(result => {
    console.log('Broadcast completed:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Broadcast failed:', error);
    process.exit(1);
  });