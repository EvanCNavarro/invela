/**
 * Progress Data Consistency Fixer
 * 
 * This script finds and fixes tasks with inconsistent progress values by comparing
 * the stored progress in the database with the actual calculated progress based on
 * form completion status.
 * 
 * It follows the KISS principle by ensuring we have just one source of truth for
 * progress tracking - the actual form responses, not manually set values.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type TaskType = 'ky3p' | 'company_kyb' | 'open_banking';

type ProgressInconsistency = {
  taskId: number;
  taskType: TaskType;
  storedProgress: number;
  calculatedProgress: number;
  status: string;
  correctStatus: string;
  fixed: boolean;
};

async function getTasksWithInconsistentProgress(): Promise<ProgressInconsistency[]> {
  const inconsistencies: ProgressInconsistency[] = [];
  
  // Find KY3P tasks with inconsistent progress
  const ky3pQuery = `
    SELECT t.id, t.task_type, t.progress, t.status,
          COALESCE(completed.count, 0) as completed_responses,
          COALESCE(total.count, 0) as total_responses,
          CASE 
            WHEN COALESCE(total.count, 0) = 0 THEN 0
            ELSE ROUND((COALESCE(completed.count, 0)::decimal / COALESCE(total.count, 0)) * 100)
          END as calculated_progress
    FROM tasks t
    LEFT JOIN (
        SELECT task_id, COUNT(*) as count
        FROM ky3p_responses
        WHERE status = 'COMPLETE'
        GROUP BY task_id
    ) as completed ON t.id = completed.task_id
    LEFT JOIN (
        SELECT task_id, COUNT(*) as count
        FROM ky3p_responses
        GROUP BY task_id
    ) as total ON t.id = total.task_id
    WHERE t.task_type = 'ky3p'
      AND t.progress != CASE 
                      WHEN COALESCE(total.count, 0) = 0 THEN 0
                      ELSE ROUND((COALESCE(completed.count, 0)::decimal / COALESCE(total.count, 0)) * 100)
                    END
  `;
  
  // Similar queries for KYB and Open Banking can be added here
  // ...
  
  try {
    const ky3pResult = await pool.query(ky3pQuery);
    
    for (const row of ky3pResult.rows) {
      // Determine correct status based on calculated progress
      let correctStatus = 'not_started';
      if (row.calculated_progress === 100) {
        // Check if task has submission data
        const metadataResult = await pool.query(
          'SELECT metadata FROM tasks WHERE id = $1',
          [row.id]
        );
        
        const metadata = metadataResult.rows[0]?.metadata || {};
        const hasSubmissionDate = !!metadata.submissionDate;
        const hasSubmittedFlag = metadata.submitted === true;
        
        if (hasSubmissionDate || hasSubmittedFlag) {
          correctStatus = 'submitted';
        } else {
          correctStatus = 'ready_for_submission';
        }
      } else if (row.calculated_progress > 0) {
        correctStatus = 'in_progress';
      }
      
      inconsistencies.push({
        taskId: row.id,
        taskType: row.task_type as TaskType,
        storedProgress: row.progress,
        calculatedProgress: parseInt(row.calculated_progress, 10),
        status: row.status,
        correctStatus,
        fixed: false
      });
    }
    
    return inconsistencies;
  } catch (err) {
    console.error('Error finding tasks with inconsistent progress:', err);
    return [];
  }
}

async function fixInconsistentTasks(inconsistencies: ProgressInconsistency[]): Promise<ProgressInconsistency[]> {
  const fixedInconsistencies = [...inconsistencies];
  
  for (let i = 0; i < inconsistencies.length; i++) {
    const { taskId, calculatedProgress, correctStatus } = inconsistencies[i];
    
    try {
      await pool.query(
        'UPDATE tasks SET progress = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [calculatedProgress, correctStatus, taskId]
      );
      
      fixedInconsistencies[i].fixed = true;
      console.log(`Fixed task #${taskId}: set progress to ${calculatedProgress}% and status to ${correctStatus}`);
    } catch (err) {
      console.error(`Error fixing task #${taskId}:`, err);
    }
  }
  
  return fixedInconsistencies;
}

async function main() {
  try {
    console.log('Finding tasks with inconsistent progress values...');
    const inconsistentTasks = await getTasksWithInconsistentProgress();
    
    if (inconsistentTasks.length === 0) {
      console.log('No tasks with inconsistent progress found.');
      await pool.end();
      return;
    }
    
    console.log(`Found ${inconsistentTasks.length} tasks with inconsistent progress:`);
    inconsistentTasks.forEach(task => {
      console.log(`  - Task #${task.taskId} (${task.taskType}): stored=${task.storedProgress}%, calculated=${task.calculatedProgress}%, status=${task.status}, correct status=${task.correctStatus}`);
    });
    
    const confirmation = process.argv.includes('--fix');
    
    if (!confirmation) {
      console.log('\nTo fix these inconsistencies, run again with the --fix flag:');
      console.log('npx tsx fix-progress-data-consistency.ts --fix');
      await pool.end();
      return;
    }
    
    console.log('\nFixing inconsistent tasks...');
    const fixedTasks = await fixInconsistentTasks(inconsistentTasks);
    
    console.log('\nSummary:');
    console.log(`  - Total tasks processed: ${fixedTasks.length}`);
    console.log(`  - Successfully fixed: ${fixedTasks.filter(t => t.fixed).length}`);
    console.log(`  - Failed to fix: ${fixedTasks.filter(t => !t.fixed).length}`);
    
    if (fixedTasks.filter(t => !t.fixed).length > 0) {
      console.log('\nFailed tasks:');
      fixedTasks.filter(t => !t.fixed).forEach(task => {
        console.log(`  - Task #${task.taskId} (${task.taskType})`);
      });
    }
  } catch (err) {
    console.error('Error in main function:', err);
  } finally {
    await pool.end();
  }
}

main();
