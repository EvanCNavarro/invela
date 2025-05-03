/**
 * Test script for task progress fix
 * 
 * This script tests our progress update fixes for KY3P tasks by:
 * 1. Getting all KY3P tasks
 * 2. Checking their current progress values
 * 3. Running the unified progress update on them
 * 4. Verifying the progress values are correctly updated
 */

import { db } from '@db';
import { eq } from 'drizzle-orm';
import { tasks } from '@db/schema';
import { updateTaskProgressAndBroadcast } from './server/utils/unified-task-progress';

async function testTaskProgressFix() {
  console.log('Starting task progress fix test...');
  
  try {
    // Get all KY3P tasks
    console.log('Finding all KY3P tasks...');
    
    const ky3pTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.task_type, 'ky3p'));
    
    console.log(`Found ${ky3pTasks.length} KY3P tasks`);
    
    // Test each task
    for (const task of ky3pTasks) {
      console.log('-'.repeat(80));
      console.log(`Testing task ${task.id}: ${task.name || 'Unnamed task'}`);
      console.log(`Current progress: ${task.progress}%, Status: ${task.status}`);
      
      // Run the progress update
      console.log(`Running progress update for task ${task.id}...`);
      const result = await updateTaskProgressAndBroadcast(task.id, 'ky3p', {
        debug: true,
        forceUpdate: true
      });
      
      console.log('Progress update result:', result);
      
      // Verify the update
      const [updatedTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, task.id));
      
      console.log(`Verification - Task ${task.id}:`);
      console.log(`  Before: ${task.progress}% (${task.status})`);
      console.log(`  After: ${updatedTask.progress}% (${updatedTask.status})`);
      
      if (result.success) {
        if (task.progress !== updatedTask.progress) {
          console.log(`✅ Progress successfully updated from ${task.progress}% to ${updatedTask.progress}%`);
        } else {
          console.log(`ℹ️ Progress remained the same at ${task.progress}%`);
        }
      } else {
        console.log(`❌ Progress update failed: ${result.message}`);
      }
    }
    
    console.log('-'.repeat(80));
    console.log('Task progress test completed!');
  } catch (error) {
    console.error('Error testing task progress fix:', error);
  }
}

testTaskProgressFix();
