/**
 * Direct fix for KY3P and Open Banking task status issues
 *
 * This script fixes two specific issues:
 * 1. KY3P task (#883) showing "Submitted" status but 0% progress - updates to 100% progress
 * 2. Open Banking task (#884) showing "Ready for Submission" when it should be "Submitted"
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastTaskUpdate } from './server/utils/unified-websocket';

async function fixTaskIssues() {
  try {
    console.log('Starting task status/progress fix...');
    const now = new Date();
    
    // 1. Fix KY3P task #883 - ensure it has 100% progress with "submitted" status
    console.log('Fixing KY3P task #883...');
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        completion_date: now,
        updated_at: now
      })
      .where(eq(tasks.id, 883));
    
    // 2. Fix Open Banking task #884 - change status from "ready_for_submission" to "submitted"
    console.log('Fixing Open Banking task #884...');
    await db.update(tasks)
      .set({
        status: 'submitted', 
        progress: 100,
        completion_date: now,
        updated_at: now,
        metadata: {
          // Preserve existing metadata
          ...(await db.query.tasks.findFirst({
            where: eq(tasks.id, 884)
          }))?.metadata,
          // Add submission metadata
          submittedAt: now.toISOString(),
          submissionDate: now.toISOString(),
          submitted: true,
          explicitlySubmitted: true
        }
      })
      .where(eq(tasks.id, 884));
    
    // 3. Verify the updates
    const [ky3pTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, 883));
    
    const [openBankingTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, 884));
    
    console.log('Updated KY3P task #883:', {
      status: ky3pTask.status,
      progress: ky3pTask.progress
    });
    
    console.log('Updated Open Banking task #884:', {
      status: openBankingTask.status,
      progress: openBankingTask.progress
    });
    
    // 4. Broadcast updates via WebSocket
    console.log('Broadcasting task updates via WebSocket...');
    
    // Broadcast KY3P task update
    await broadcastTaskUpdate({
      taskId: 883,
      status: 'submitted',
      progress: 100,
      metadata: {
        submitted: true, 
        submissionDate: now.toISOString()
      }
    });
    
    // Broadcast Open Banking task update
    await broadcastTaskUpdate({
      taskId: 884,
      status: 'submitted',
      progress: 100,
      metadata: {
        submitted: true, 
        submissionDate: now.toISOString()
      }
    });
    
    console.log('Task status fixes completed successfully!');
  } catch (error) {
    console.error('Error fixing task issues:', error);
  }
}

// Run the fix
fixTaskIssues().then(() => {
  console.log('Script execution completed');
  process.exit(0);
}).catch(error => {
  console.error('Script execution failed:', error);
  process.exit(1);
});