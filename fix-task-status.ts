/**
 * Fix Task Status Script
 * 
 * This script fixes tasks with incorrect status values - specifically tasks that are marked
 * as "submitted" but don't have a submission date or submitted flag.
 * 
 * According to our business rules, tasks should only be marked as "submitted" when a user
 * explicitly clicks the submit button. Tasks with 100% progress but no submission should
 * be in "ready_for_submission" status.
 */

import { db } from "@db";
import { tasks } from "@db/schema";
import { eq } from "drizzle-orm";
import { TaskStatus } from "./server/utils/status-constants";

interface FixResult {
  taskId: number;
  oldStatus: string;
  newStatus: string;
  progress: number;
  hasSubmissionDate: boolean;
  hasSubmittedFlag: boolean;
  corrected: boolean;
}

/**
 * Fix tasks with incorrect status values
 * 
 * This function identifies tasks that are marked as "submitted" but don't have
 * a submission date or submitted flag in their metadata. It corrects them
 * to use the "ready_for_submission" status instead.
 */
async function fixTaskStatus(): Promise<FixResult[]> {
  console.log('Starting task status correction...');
  
  // Get all tasks currently marked as "submitted"
  const submittedTasks = await db.query.tasks.findMany({
    where: eq(tasks.status, 'submitted'),
  });
  
  console.log(`Found ${submittedTasks.length} tasks marked as "submitted"`);
  
  const results: FixResult[] = [];
  
  for (const task of submittedTasks) {
    // Check if task has submission date or submitted flag
    const hasSubmissionDate = task.metadata?.submissionDate !== undefined && 
                            task.metadata?.submissionDate !== null;
    const hasSubmittedFlag = task.metadata?.submitted === true;
    
    // If task is marked as submitted but has no submission date/flag, it should be "ready_for_submission"
    const needsCorrection = !hasSubmissionDate && !hasSubmittedFlag && task.progress === 100;
    
    const result: FixResult = {
      taskId: task.id,
      oldStatus: task.status,
      newStatus: needsCorrection ? TaskStatus.READY_FOR_SUBMISSION : task.status,
      progress: task.progress,
      hasSubmissionDate,
      hasSubmittedFlag,
      corrected: false
    };
    
    if (needsCorrection) {
      console.log(`Task ${task.id} is marked as submitted but has no submission data. Fixing status...`);
      
      try {
        // Update status to "ready_for_submission"
        await db.update(tasks)
          .set({
            status: TaskStatus.READY_FOR_SUBMISSION,
            updated_at: new Date()
          })
          .where(eq(tasks.id, task.id));
        
        result.corrected = true;
        console.log(`Task ${task.id} status corrected to "ready_for_submission"`);
      } catch (error) {
        console.error(`Error correcting task ${task.id} status:`, error);
      }
    } else {
      console.log(`Task ${task.id} has correct status (${task.status}) with submission data present: ${hasSubmissionDate || hasSubmittedFlag}`);
    }
    
    results.push(result);
  }
  
  // Special case: check task #694 specifically
  const task694Result = results.find(r => r.taskId === 694);
  if (task694Result) {
    console.log('\nTask #694 Status Check:');
    console.log(`- Original status: ${task694Result.oldStatus}`);
    console.log(`- New status: ${task694Result.newStatus}`);
    console.log(`- Has submission date: ${task694Result.hasSubmissionDate}`);
    console.log(`- Has submitted flag: ${task694Result.hasSubmittedFlag}`);
    console.log(`- Was corrected: ${task694Result.corrected}`);
  } else {
    console.log('\nTask #694 was not found in the "submitted" status list');
    
    // Double-check task #694 specifically
    const task694 = await db.query.tasks.findFirst({
      where: eq(tasks.id, 694)
    });
    
    if (task694) {
      console.log(`Task #694 currently has status: ${task694.status}`);
      console.log(`Task #694 progress: ${task694.progress}%`);
      console.log(`Task #694 submission date: ${task694.metadata?.submissionDate || 'none'}`);
      console.log(`Task #694 submitted flag: ${task694.metadata?.submitted || false}`);
      
      // Fix task #694 if needed
      if (task694.progress === 100 && task694.status !== 'ready_for_submission' && 
          !task694.metadata?.submissionDate && !task694.metadata?.submitted) {
        try {
          await db.update(tasks)
            .set({
              status: TaskStatus.READY_FOR_SUBMISSION,
              updated_at: new Date()
            })
            .where(eq(tasks.id, 694));
          
          console.log(`Task #694 status corrected to "ready_for_submission"`);
        } catch (error) {
          console.error(`Error correcting task #694 status:`, error);
        }
      }
    } else {
      console.log('Task #694 not found in database');
    }
  }
  
  const correctedCount = results.filter(r => r.corrected).length;
  console.log(`\nSummary: Corrected ${correctedCount} out of ${results.length} tasks`);
  
  return results;
}

// Run the function when script is executed directly
if (require.main === module) {
  fixTaskStatus()
    .then(() => {
      console.log('Task status correction complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error during task status correction:', error);
      process.exit(1);
    });
}
