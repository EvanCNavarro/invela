/**
 * Atomic Demo Auto-Fill Service
 * 
 * This service provides a single atomic operation to apply demo data to forms.
 * It applies all demo values in a single transaction and uses WebSockets to
 * progressively update the UI for a smooth, dynamic filling experience.
 */

import { db } from '@db';
import { eq, or, sql } from 'drizzle-orm';
import { companies, kybResponses, ky3pResponses, openBankingResponses, tasks, users } from '@db/schema';
import { generateDemoKybValues } from '../utils/demo-helpers';
import { generateDemoKy3pValues } from '../utils/ky3p-demo-helpers';
import { generateDemoOpenBankingValues } from '../utils/open-banking-demo-helpers';
import * as websocketService from './websocket';
import { Logger } from '../utils/logger';

const logger = new Logger('AtomicDemoAutoFill');

// Define supported form types
export type FormType = 'kyb' | 'company_kyb' | 'ky3p' | 'open_banking';
type FormTypeKey = 'kyb' | 'ky3p' | 'open_banking';

// Calculate the delay between field updates - this creates a visible but not too slow effect
const FIELD_UPDATE_DELAY_MS = 75; 

/**
 * Get the appropriate form type based on task type
 */
function mapTaskTypeToFormType(taskType: string): FormTypeKey {
  switch (taskType) {
    case 'company_kyb':
    case 'kyb':
      return 'kyb';
    case 'ky3p':
    case 'security_assessment':
      return 'ky3p';
    case 'open_banking':
    case 'open_banking_survey':
      return 'open_banking';
    default:
      logger.warn(`Unknown task type: ${taskType}, defaulting to KYB`);
      return 'kyb';
  }
}

/**
 * Generate appropriate demo data for different form types
 */
function generateDemoData(taskType: string, companyName: string = 'Demo Company'): Record<string, string> {
  const formType = mapTaskTypeToFormType(taskType);
  
  logger.info(`Generating demo data for ${formType} form (task type: ${taskType})`);
  
  switch (formType) {
    case 'kyb':
      return generateDemoKybValues(companyName);
    case 'ky3p':
      return generateDemoKy3pValues(companyName);
    case 'open_banking':
      return generateDemoOpenBankingValues(companyName);
    default:
      logger.warn(`No demo data generator for ${formType}, defaulting to KYB`);
      return generateDemoKybValues(companyName);
  }
}

/**
 * Create the update query for a specific form response, handling all three form types
 */
function createResponseUpdateQuery(
  formType: FormTypeKey,
  taskId: number, 
  fieldId: number | string, 
  value: string
): Promise<any> {
  switch (formType) {
    case 'kyb':
      return db.update(kybResponses)
        .set({ 
          response_value: value,
          updated_at: new Date()
        })
        .where(eq(kybResponses.task_id, taskId))
        .where(eq(kybResponses.field_id, Number(fieldId)));
    
    case 'ky3p':
      return db.update(ky3pResponses)
        .set({ 
          response_value: value,
          updated_at: new Date()
        })
        .where(eq(ky3pResponses.task_id, taskId))
        .where(eq(ky3pResponses.field_id, Number(fieldId)));
    
    case 'open_banking':
      return db.update(openBankingResponses)
        .set({ 
          response_value: value,
          updated_at: new Date()
        })
        .where(eq(openBankingResponses.task_id, taskId))
        .where(eq(openBankingResponses.field_id, Number(fieldId)));
    
    default:
      throw new Error(`Unsupported form type: ${formType}`);
  }
}

/**
 * Get existing responses for a given task and form type
 */
async function getExistingResponses(formType: FormTypeKey, taskId: number): Promise<any[]> {
  switch (formType) {
    case 'kyb':
      return db.select()
        .from(kybResponses)
        .where(eq(kybResponses.task_id, taskId));
    
    case 'ky3p':
      return db.select()
        .from(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
    
    case 'open_banking':
      return db.select()
        .from(openBankingResponses)
        .where(eq(openBankingResponses.task_id, taskId));
    
    default:
      throw new Error(`Unsupported form type: ${formType}`);
  }
}

/**
 * Create a new response for a given task and form type
 */
async function createResponse(
  formType: FormTypeKey,
  taskId: number, 
  fieldId: number | string, 
  value: string,
  userId?: number
): Promise<any> {
  switch (formType) {
    case 'kyb':
      return db.insert(kybResponses)
        .values({
          task_id: taskId,
          field_id: Number(fieldId),
          response_value: value,
          created_at: new Date(),
          updated_at: new Date(),
          user_id: userId
        });
    
    case 'ky3p':
      return db.insert(ky3pResponses)
        .values({
          task_id: taskId,
          field_id: Number(fieldId),
          response_value: value,
          created_at: new Date(),
          updated_at: new Date(),
          user_id: userId
        });
    
    case 'open_banking':
      return db.insert(openBankingResponses)
        .values({
          task_id: taskId,
          field_id: Number(fieldId),
          response_value: value,
          created_at: new Date(),
          updated_at: new Date(),
          user_id: userId
        });
    
    default:
      throw new Error(`Unsupported form type: ${formType}`);
  }
}

/**
 * Get all field IDs for a given form type
 */
async function getFieldIds(formType: FormTypeKey): Promise<number[]> {
  let query;
  
  switch (formType) {
    case 'kyb':
      query = db.select({ id: sql<number>`id` })
        .from(sql`kyb_fields`);
      break;
    
    case 'ky3p':
      query = db.select({ id: sql<number>`id` })
        .from(sql`ky3p_fields`);
      break;
    
    case 'open_banking':
      query = db.select({ id: sql<number>`id` })
        .from(sql`open_banking_fields`);
      break;
    
    default:
      throw new Error(`Unsupported form type: ${formType}`);
  }
  
  const results = await query;
  return results.map(row => row.id);
}

export class AtomicDemoAutoFillService {
  private webSocketService: typeof websocketService;

  constructor(webSocketService: typeof websocketService) {
    this.webSocketService = webSocketService;
  }

  /**
   * Atomically apply demo data to a form, with progressive UI updates
   */
  async applyDemoDataAtomically(
    taskId: number,
    formType: FormType,
    userId?: number
  ): Promise<{ success: boolean; message: string; fieldCount: number }> {
    try {
      // Validate the task exists and get company name
      const task = await db.select({
        id: tasks.id,
        title: tasks.title,
        task_type: tasks.task_type,
        metadata: tasks.metadata
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
      
      if (!task || task.length === 0) {
        throw new Error(`Task not found: ${taskId}`);
      }
      
      const taskData = task[0];
      
      // Get company name from task metadata or title
      let companyName = 'Demo Company';
      
      if (taskData.metadata && taskData.metadata.company_name) {
        companyName = taskData.metadata.company_name;
      } else if (taskData.metadata && taskData.metadata.companyName) {
        companyName = taskData.metadata.companyName;
      } else if (taskData.title.includes(':')) {
        // Extract from title format like "KYB Form: CompanyName"
        const parts = taskData.title.split(':');
        if (parts.length > 1) {
          companyName = parts[1].trim();
        }
      }
      
      logger.info(`Starting atomic demo auto-fill for ${formType} task ${taskId}, company: ${companyName}`);
      
      // Use the task type to determine the correct form type if not specified
      const actualFormType = formType === 'kyb' || formType === 'company_kyb' 
        ? 'kyb' 
        : mapTaskTypeToFormType(taskData.task_type);
      
      // Generate demo data
      const demoData = generateDemoData(taskData.task_type, companyName);
      
      // Get existing responses
      const existingResponses = await getExistingResponses(actualFormType, taskId);
      
      // Create a map of existing responses by field ID
      const existingResponseMap = new Map();
      for (const response of existingResponses) {
        existingResponseMap.set(response.field_id, response);
      }
      
      // Get all field IDs for this form type
      const allFieldIds = await getFieldIds(actualFormType);
      
      // Apply updates progressively, with WebSocket notifications between each field
      let updateCount = 0;
      
      // Start with a progress notification
      this.webSocketService.broadcast('demo_autofill_start', {
        taskId,
        formType: actualFormType,
        totalFields: Object.keys(demoData).length,
        timestamp: new Date().toISOString()
      });
      
      // Update task progress
      await db.update(tasks)
        .set({ 
          status: 'in_progress',
          updated_at: new Date()
        })
        .where(eq(tasks.id, taskId));
      
      // Broadcast status update
      this.webSocketService.broadcastTaskUpdate({
        id: taskId,
        status: 'in_progress',
        progress: 0
      });
      
      // Process each field to update or create responses
      for (const fieldIdStr of allFieldIds) {
        const fieldId = Number(fieldIdStr);
        const value = demoData[`field_${fieldId}`] || demoData[fieldId.toString()] || '';
        
        if (value) {
          try {
            if (existingResponseMap.has(fieldId)) {
              // Update existing response
              await createResponseUpdateQuery(actualFormType, taskId, fieldId, value);
            } else {
              // Create new response
              await createResponse(actualFormType, taskId, fieldId, value, userId);
            }
            
            // Send WebSocket notification for this field update
            this.webSocketService.broadcast('field_update', {
              taskId,
              fieldId: fieldId,
              value: value,
              timestamp: new Date().toISOString()
            });
            
            updateCount++;
            
            // Send progress update
            if (updateCount % 5 === 0) {
              const progressPercent = Math.min(99, Math.round((updateCount / Object.keys(demoData).length) * 100));
              this.webSocketService.broadcast('demo_autofill_progress', {
                taskId,
                progress: progressPercent,
                fieldsCompleted: updateCount,
                totalFields: Object.keys(demoData).length,
                timestamp: new Date().toISOString()
              });
            }
            
            // Add a small delay between updates to create a visual effect
            await new Promise(resolve => setTimeout(resolve, FIELD_UPDATE_DELAY_MS));
          } catch (error) {
            logger.error(`Error updating field ${fieldId}:`, {
              error: error instanceof Error ? error.message : 'Unknown error',
              taskId,
              fieldId,
              formType: actualFormType
            });
          }
        }
      }
      
      // Completion notification
      this.webSocketService.broadcast('demo_autofill_complete', {
        taskId,
        fieldsUpdated: updateCount,
        timestamp: new Date().toISOString()
      });

      // Final task update
      this.webSocketService.broadcastTaskUpdate({
        id: taskId,
        status: 'in_progress',
        progress: 0
      });
      
      return {
        success: true,
        message: `Successfully applied demo data to ${updateCount} fields`,
        fieldCount: updateCount
      };
    } catch (error) {
      logger.error('Error in atomic demo auto-fill:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        taskId,
        formType
      });
      
      throw error;
    }
  }
}