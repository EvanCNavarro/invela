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
import { CompanyTabsService } from '../services/company-tabs';
import { broadcastMessage } from '../services/websocket';
import { broadcastTaskUpdate } from '../utils/task-broadcast';
import { Logger } from '../utils/logger';

const logger = new Logger('FormStandardization');

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
      const fileVaultResult = await CompanyTabsService.unlockFileVault(companyId);
      
      if (fileVaultResult) {
        logger.info(`Successfully unlocked file vault for company ${companyId}`, {
          tabs: fileVaultResult.available_tabs
        });
        
        // 6. Broadcast WebSocket update with cache invalidation
        broadcastMessage('company_tabs_updated', {
          companyId,
          availableTabs: fileVaultResult.available_tabs,
          cache_invalidation: true,
          timestamp: new Date().toISOString(),
          source: `${formType}_submit_standardized`
        });
      }
    } catch (fileVaultError) {
      // Log error but don't fail the submission
      logger.error(`Error unlocking file vault:`, fileVaultError);
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