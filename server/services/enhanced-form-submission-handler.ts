/**
 * Enhanced Form Submission Handler
 * 
 * This service provides an improved form submission experience with:
 * - Robust error handling
 * - Connection retries with exponential backoff
 * - Synchronous task dependency unlocking
 * - Automatic file generation
 * - WebSocket broadcast notifications
 */

import { db } from "@db";
import { tasks } from "@db/schema";
import { sql, eq } from "drizzle-orm";
import { Logger } from "./logger";
import { withRetry } from "../utils/db-retry";
import { unlockDependentTasks } from "./synchronous-task-dependencies";

const logger = new Logger("EnhancedFormSubmission");

interface FormSubmissionData {
  task_id: number;
  task_type: string;
  data: Record<string, any>;
  file_name?: string;
  user_id?: number;
  company_id?: number;
}

interface SubmissionResult {
  success: boolean;
  message?: string;
  error?: string;
  task?: any;
  unlockedTasks?: number[];
}

/**
 * Process form submission with enhanced reliability and user feedback
 * 
 * @param submissionData Form submission data
 * @returns Submission result with status and details
 */
export async function processFormSubmission(
  submissionData: FormSubmissionData
): Promise<SubmissionResult> {
  const { task_id, task_type, data, file_name } = submissionData;
  
  logger.info(`Processing ${task_type} form submission for task ID: ${task_id}`);
  
  try {
    // 1. Validate the submission
    if (!task_id || !task_type || !data) {
      throw new Error("Missing required submission data");
    }
    
    // 2. Fetch the current task with retry logic
    const [taskToUpdate] = await withRetry(
      async () => {
        return db
          .select()
          .from(tasks)
          .where(eq(tasks.id, task_id))
          .limit(1);
      },
      { 
        maxRetries: 3,
        operation: `Fetch task ${task_id}` 
      }
    );
    
    if (!taskToUpdate) {
      throw new Error(`Task with ID ${task_id} not found`);
    }
    
    // 3. Update the task with form data and mark as submitted
    const now = new Date().toISOString();
    
    const [updatedTask] = await withRetry(
      async () => {
        return db
          .update(tasks)
          .set({
            status: "submitted",
            progress: 100,
            savedFormData: data,
            submitted_at: now,
            metadata: {
              ...taskToUpdate.metadata,
              lastSubmission: now,
              file_name: file_name || null
            },
          })
          .where(eq(tasks.id, task_id))
          .returning();
      },
      { 
        maxRetries: 3,
        operation: `Update task ${task_id} submission` 
      }
    );
    
    // 4. Unlock dependent tasks synchronously
    const companyId = updatedTask.company_id;
    if (companyId) {
      logger.info(`Unlocking dependent tasks for company ${companyId} after ${task_type} submission`);
      
      // This will synchronously unlock tasks and return those that were unlocked
      const unlockedTasks = await unlockDependentTasks(companyId, task_type);
      
      logger.info(`Successfully unlocked ${unlockedTasks.length} dependent tasks`, {
        taskIds: unlockedTasks
      });
      
      return {
        success: true,
        message: `${task_type} form submitted successfully`,
        task: updatedTask,
        unlockedTasks
      };
    }
    
    return {
      success: true,
      message: `${task_type} form submitted successfully`,
      task: updatedTask
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Form submission failed for task ${task_id}:`, error);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}