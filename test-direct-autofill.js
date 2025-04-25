/**
 * Direct Test Script for Demo Auto-Fill
 * 
 * This script bypasses Express and directly calls the AtomicDemoAutoFillService
 * to test demo auto-fill functionality.
 */

// Import the ESM modules with require syntax
const { createRequire } = require('module');
const require = createRequire(import.meta.url);

// Run the script
async function run() {
  try {
    // Dynamically import modules (ESM style)
    const { AtomicDemoAutoFillService } = await import('./server/services/atomic-demo-autofill.js');
    const websocketService = await import('./server/services/websocket.js');
    
    console.log('[Test] Creating atomic demo auto-fill service...');
    const service = new AtomicDemoAutoFillService(websocketService);
    
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
    
    // Give time for WebSocket messages to be sent
    console.log('[Test] Sleeping for 5 seconds to let WebSocket messages finish...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('[Test] Test completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('[Test] Error testing demo auto-fill:', error);
    process.exit(1);
  }
}

// Run as a module
run();