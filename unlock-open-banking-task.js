/**
 * Simple script to directly unlock the Open Banking Survey task
 * Usage: node unlock-open-banking-task.js
 */

import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, or } from 'drizzle-orm';

async function unlockOpenBankingTask() {
  try {
    console.log('=== Unlocking Open Banking Survey task ===');
    
    // Find Open Banking Survey tasks
    const openBankingTasks = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'open_banking_survey'),
          or(
            eq(tasks.status, 'locked'),
            eq(tasks.status, null)
          )
        )
      );
    
    console.log(`Found ${openBankingTasks.length} locked Open Banking Survey tasks:`);
    console.log(openBankingTasks.map(t => ({ 
      id: t.id, 
      title: t.title, 
      company_id: t.company_id,
      status: t.status,
      metadata: {
        locked: t.metadata?.locked,
        prerequisite_completed: t.metadata?.prerequisite_completed
      }
    })));
    
    // Unlock each task
    for (const task of openBankingTasks) {
      await db.update(tasks)
        .set({
          status: 'not_started',
          metadata: {
            ...task.metadata,
            locked: false,
            prerequisite_completed: true,
            prerequisite_completed_at: new Date().toISOString(),
            unlocked_by: 'unlock_script'
          },
          updated_at: new Date()
        })
        .where(eq(tasks.id, task.id));
      
      console.log(`Successfully unlocked task ${task.id}: ${task.title}`);
    }
    
    // Double-check the task status after updating
    if (openBankingTasks.length > 0) {
      const updatedTasks = await db.select()
        .from(tasks)
        .where(
          eq(tasks.id, openBankingTasks[0].id)
        );
      
      console.log('Task status after update:', {
        id: updatedTasks[0].id,
        status: updatedTasks[0].status,
        metadata: {
          locked: updatedTasks[0].metadata?.locked,
          prerequisite_completed: updatedTasks[0].metadata?.prerequisite_completed
        }
      });
    }
    
    // Broadcast a refresh notification via websocket
    // This would normally be done through the WebSocket service
    
    console.log('Unlocking completed!');
    console.log('Please refresh the task center to see the unlocked task.');
  } catch (error) {
    console.error('Error unlocking Open Banking tasks:', error);
  }
}

// Execute the function
unlockOpenBankingTask()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed with error:', error);
    process.exit(1);
  });