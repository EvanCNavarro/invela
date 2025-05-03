/**
 * Fix Task 694 Progress - Direct script to debug and fix progress updating issues
 * 
 * Usage: tsx fix-task-694-progress.ts
 */

import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';

async function fixTask694Progress() {
  console.log('Starting task 694 progress fix');
  
  try {
    // 1. First check the current state
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, 694));
      
    if (!task) {
      console.error('Task 694 not found!');
      return;
    }
    
    console.log('Current task state:', {
      id: task.id,
      type: task.task_type,
      progress: task.progress,
      status: task.status,
      metadata: task.metadata ? Object.keys(task.metadata) : null
    });
    
    // 2. Try to directly update the progress
    console.log('Attempting direct progress update to 99%...');
    
    const [updatedTask] = await db
      .update(tasks)
      .set({
        progress: 99, // Set to 99% to match UI
        updated_at: new Date()
      })
      .where(eq(tasks.id, 694))
      .returning();
      
    if (!updatedTask) {
      console.error('Update failed - no rows returned!');
      return;
    }
    
    console.log('Update result:', {
      success: true,
      id: updatedTask.id,
      oldProgress: task.progress,
      newProgress: updatedTask.progress,
      status: updatedTask.status
    });
    
    // 3. Verify the update worked
    const [verifyTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, 694));
      
    console.log('Verification check:', {
      id: verifyTask.id,
      progress: verifyTask.progress,
      status: verifyTask.status,
      updated: verifyTask.updated_at
    });
    
    if (verifyTask.progress === 99) {
      console.log('✅ SUCCESS: Progress updated successfully!');
    } else {
      console.error('❌ FAILURE: Progress not updated correctly!');
    }
  } catch (error) {
    console.error('Error fixing task progress:', error);
  }
}

fixTask694Progress();
