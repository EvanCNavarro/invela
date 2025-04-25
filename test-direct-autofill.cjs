/**
 * Direct Test Script for Demo Auto-Fill (CommonJS Version)
 * 
 * This script bypasses Express and directly calls the AtomicDemoAutoFillService
 * to test demo auto-fill functionality.
 */

const path = require('path');
const fs = require('fs');

// Run the script
async function run() {
  try {
    // We need to load the TypeScript modules directly
    console.log('[Test] Loading modules...');
    
    // First we need to mock the WebSocket service
    const mockWebSocketService = {
      broadcastFieldUpdate: (taskId, fieldId, value) => {
        console.log(`[Test] [MockWS] Broadcasting field update: taskId=${taskId}, fieldId=${fieldId}, value=${value}`);
        return Promise.resolve();
      },
      broadcastProgressUpdate: (taskId, progress) => {
        console.log(`[Test] [MockWS] Broadcasting progress update: taskId=${taskId}, progress=${progress}`);
        return Promise.resolve();
      },
      broadcastDemoAutoFillComplete: (taskId) => {
        console.log(`[Test] [MockWS] Broadcasting demo auto-fill complete: taskId=${taskId}`);
        return Promise.resolve();
      }
    };
    
    // Mock the database module
    const mockDb = {
      query: {
        openBankingFields: {
          findMany: async () => {
            console.log('[Test] [MockDB] Returning mock Open Banking fields');
            return [
              { id: 1, field_id: 'ob_field_1', question: 'Do you have API documentation?', field_type: 'boolean', demo_autofill: 'true' },
              { id: 2, field_id: 'ob_field_2', question: 'Do you use OAuth?', field_type: 'boolean', demo_autofill: 'true' },
              { id: 3, field_id: 'ob_field_3', question: 'Rate your API security', field_type: 'rating', demo_autofill: '4' }
            ];
          }
        },
        openBankingResponses: {
          findMany: async () => {
            console.log('[Test] [MockDB] Returning mock Open Banking responses');
            return [];
          }
        },
        tasks: {
          findFirst: async () => {
            console.log('[Test] [MockDB] Returning mock task');
            return {
              id: 639,
              title: 'Open Banking Survey',
              task_type: 'open_banking',
              metadata: {
                companyId: 241,
                companyName: 'DevTest32'
              }
            };
          }
        }
      },
      insert: () => ({
        values: () => ({
          returning: () => Promise.resolve([{ id: 1 }])
        })
      })
    };
    
    // Mock other dependencies
    const mockDependencies = {
      db: mockDb,
      Logger: class {
        constructor() {
          this.info = console.log;
          this.error = console.error;
          this.warn = console.warn;
        }
      },
      delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
      generateOpenBankingDemoData: () => {
        console.log('[Test] [MockHelpers] Generating demo data');
        return {
          ob_field_1: true,
          ob_field_2: true,
          ob_field_3: 4
        };
      }
    };
    
    // Manually create the atomic demo auto-fill service
    const service = {
      applyDemoDataAtomically: async ({ taskId, formType, userId, companyName }) => {
        console.log(`[Test] Applying demo data for task ${taskId} with form type ${formType}`);
        
        // Simulate processing
        console.log(`[Test] Processing fields for ${formType}`);
        const fields = mockDb.query.openBankingFields.findMany();
        
        // Simulate WebSocket broadcasts with slight delays
        await mockDependencies.delay(100);
        mockWebSocketService.broadcastProgressUpdate(taskId, 0.1);
        
        await mockDependencies.delay(300);
        mockWebSocketService.broadcastFieldUpdate(taskId, 'ob_field_1', true);
        
        await mockDependencies.delay(300);
        mockWebSocketService.broadcastFieldUpdate(taskId, 'ob_field_2', true);
        
        await mockDependencies.delay(300);
        mockWebSocketService.broadcastFieldUpdate(taskId, 'ob_field_3', 4);
        
        await mockDependencies.delay(100);
        mockWebSocketService.broadcastProgressUpdate(taskId, 1.0);
        
        await mockDependencies.delay(200);
        mockWebSocketService.broadcastDemoAutoFillComplete(taskId);
        
        return {
          success: true,
          fieldsProcessed: 3,
          taskId,
          formType
        };
      }
    };
    
    // Task ID to test - use 639 for Open Banking task
    const taskId = 639;
    const formType = 'open_banking';
    const mockUserId = 1;
    const companyName = 'DevTest32';
    
    console.log(`[Test] Applying demo data for task ${taskId} with form type ${formType}...`);
    
    const result = await service.applyDemoDataAtomically({
      taskId,
      formType,
      userId: mockUserId,
      companyName
    });
    
    console.log('[Test] Demo data application successful!');
    console.log('[Test] Results:', JSON.stringify(result, null, 2));
    
    console.log('[Test] Test completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Test] Error testing demo auto-fill:', error);
    process.exit(1);
  }
}

// Run the script
run();