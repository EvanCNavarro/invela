/**
 * Form Standardization Utilities
 * 
 * This module provides standardized utilities for form submission across
 * all form types (KYB, KY3P, and Open Banking) to ensure consistent behavior.
 */

import { tasks, companies } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';
import { FileCreationService } from '../services/file-creation';
import { broadcastCompanyTabsUpdate } from '../services/company-tabs';
import { unlockFileVaultAccess } from '../services/synchronous-task-dependencies';
import { broadcastMessage } from '../utils/unified-websocket';
import { broadcastTaskUpdate } from '../utils/task-broadcast';
import { logger } from '../utils/logger';

// Logger is already initialized in the imported module

/**
 * Utility for safe type conversion of form values
 * This helps prevent PostgreSQL type conversion errors (22P02) when storing responses
 * 
 * @param value The value to convert
 * @param targetType The target data type
 * @param fieldInfo Optional field information for better error logging
 * @returns The converted value or a safe default if conversion fails
 */
export function safeTypeConversion(value: any, targetType: string, fieldInfo?: {
  fieldKey?: string;
  fieldName?: string;
  formType?: string;
}): any {
  try {
    if (value === null || value === undefined) {
      // Return type-appropriate defaults for null/undefined values
      switch (targetType.toUpperCase()) {
        case 'NUMBER':
        case 'INTEGER':
          return 0;
        case 'BOOLEAN':
          return false;
        case 'TEXT':
        case 'STRING':
        case 'TEXTAREA':
        default:
          return '';
      }
    }
    
    // Convert based on target type
    switch (targetType.toUpperCase()) {
      case 'NUMBER':
      case 'INTEGER':
        // For numeric fields, ensure we have a valid number
        const numValue = Number(value);
        if (isNaN(numValue)) {
          logger.warn(`Type conversion failed: "${value}" is not a valid number`, fieldInfo);
          return 0; // Safe default
        }
        return numValue;
        
      case 'BOOLEAN':
        // Convert various boolean representations
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        return Boolean(value);
        
      case 'TEXT':
      case 'STRING':
      case 'TEXTAREA':
      default:
        // Ensure we always return a string for text fields
        return String(value);
    }
  } catch (error) {
    logger.error(`Error in type conversion for ${fieldInfo?.fieldKey || 'unknown field'}:`, {
      error,
      value,
      targetType,
      fieldInfo
    });
    
    // Return safe defaults on error
    switch (targetType.toUpperCase()) {
      case 'NUMBER':
      case 'INTEGER':
        return 0;
      case 'BOOLEAN':
        return false;
      default:
        return '';
    }
  }
}

// Enum for task status values to ensure consistency
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  READY_FOR_SUBMISSION = 'ready_for_submission',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// Common interface for form submission options
export interface FormSubmissionOptions {
  taskId: number;
  formData: Record<string, any>;
  fileName?: string;
  userId: number;
  companyId: number;
  formType: 'kyb' | 'ky3p' | 'open_banking';
  fields: any[];
  convertToCSV: (fields: any[], formData: Record<string, any>) => string;
}

/**
 * Standard form submission handler used by all form types
 * Creates files, updates task status, and handles file vault unlocking
 * in a consistent manner across all form types
 */
export async function standardFormSubmission(options: FormSubmissionOptions) {
  const {
    taskId,
    formData,
    fileName,
    userId,
    companyId,
    formType,
    fields,
    convertToCSV
  } = options;

  logger.info(`Processing standardized form submission`, {
    taskId,
    formType,
    userId,
    companyId,
    formDataKeys: Object.keys(formData).length
  });

  try {
    // 1. Get the task
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // 2. Convert form data to CSV using the provided converter function
    const csvData = convertToCSV(fields, formData);

    // Get company name from multiple sources with fallbacks
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
    const companyName = task.metadata?.company_name || 
                       task.metadata?.companyName || 
                       company?.name || 
                       (formData.legalEntityName || formData.company_name) || 
                       'Company';

    // 3. Create file using FileCreationService with standardized format
    const defaultFileName = FileCreationService.generateStandardFileName(
      `${formType.toUpperCase()}Form`,
      taskId,
      companyName,
      task.metadata?.formVersion || "1.0",
      "csv"
    );

    const fileCreationResult = await FileCreationService.createFile({
      name: fileName || defaultFileName,
      content: csvData,
      type: 'text/csv',
      userId: userId,
      companyId: companyId,
      metadata: {
        taskId,
        taskType: formType,
        formVersion: '1.0',
        submissionDate: new Date().toISOString(),
        fields: fields.map(f => f.field_key || f.key || f.name)
      },
      status: 'uploaded'
    });

    if (!fileCreationResult.success) {
      throw new Error(fileCreationResult.error || 'File creation failed');
    }

    // 4. Update task status and metadata
    const metadataKey = `${formType}FormFile`;
    
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: new Date(),
        metadata: {
          ...task.metadata,
          [metadataKey]: fileCreationResult.fileId,
          submissionDate: new Date().toISOString(),
          formVersion: '1.0',
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
            .filter((v, i, a) => a.indexOf(v) === i)
        }
      })
      .where(eq(tasks.id, taskId));

    // 5. Unlock file vault and other tabs
    try {
      logger.info(`Unlocking file vault for company ${companyId}`);
      const success = await unlockFileVaultAccess(companyId);
      
      if (success) {
        logger.info(`Successfully unlocked file vault for company ${companyId}`);
        
        // 6. Broadcast WebSocket update with cache invalidation
        const [company] = await db.select()
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1);
        
        if (company) {
          // Broadcasting update with cache invalidation
          await broadcastCompanyTabsUpdate(companyId);
        }
      }
    } catch (fileVaultError) {
      // Log error but don't fail the submission
      logger.error(`Error unlocking file vault:`, {
        error: fileVaultError instanceof Error ? fileVaultError.message : 'Unknown error',
        companyId
      });
    }

    // 7. Broadcast task update
    broadcastTaskUpdate({
      id: taskId,
      status: TaskStatus.SUBMITTED,
      progress: 100,
      metadata: {
        lastUpdated: new Date().toISOString(),
        submissionDate: new Date().toISOString()
      }
    });

    // 8. Return standardized response
    return {
      success: true,
      fileId: fileCreationResult.fileId,
      fileName: fileName || defaultFileName,
      message: 'Form submitted successfully',
      taskId,
      companyId,
      additionalUpdates: {
        tabsUnlocked: true,
        onboardingCompleted: true
      }
    };
  } catch (error) {
    logger.error(`Form submission failed`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      taskId,
      formType
    });
    throw error;
  }
}