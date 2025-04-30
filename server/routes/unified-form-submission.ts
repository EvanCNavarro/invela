/**
 * Unified Form Submission API
 * 
 * This module provides a single endpoint for handling form submissions
 * across all form types (KYB, KY3P, Open Banking, etc.) with standardized
 * response formats and WebSocket notifications.
 */

import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '@db';
import { tasks, companies } from '@db/schema';
import { broadcastTaskUpdate } from '../websocket-server';
import { broadcastFormSubmission } from '../websocket-server';

// Initialize router
const router = Router();

/**
 * @route POST /api/form-submission
 * @desc Submit any form type (KYB, KY3P, Open Banking)
 * @access Private - Requires authentication
 */
router.post('/', async (req, res) => {
  try {
    const { formType, formData, fileName } = req.body;
    
    if (!formType || !formData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: formType, formData'
      });
    }
    
    // Extract task ID from form data
    const taskId = formData.taskId || formData.task_id;
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Missing task ID in form data'
      });
    }
    
    // Get task details from database
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId)
    });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task not found with ID: ${taskId}`
      });
    }
    
    // Check if the current user has permission to submit this form
    // (Either assigned to them or created by them)
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: You must be logged in to submit a form'
      });
    }
    
    if (task.assigned_to !== currentUserId && task.created_by !== currentUserId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to submit this form'
      });
    }
    
    // Check if task is in a valid state for submission (not locked, not already submitted)
    if (task.status === 'locked') {
      return res.status(400).json({
        success: false,
        error: 'This task is locked and cannot be submitted'
      });
    }
    
    if (task.status === 'submitted' || task.submission_date) {
      return res.status(400).json({
        success: false,
        error: 'This task has already been submitted'
      });
    }
    
    // Process the submission based on form type
    let result;
    
    switch (formType.toLowerCase()) {
      case 'kyb':
        result = await processKybSubmission(task, formData, fileName);
        break;
      case 'ky3p':
      case 'security_assessment':
        result = await processKy3pSubmission(task, formData, fileName);
        break;
      case 'open_banking':
        result = await processOpenBankingSubmission(task, formData, fileName);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported form type: ${formType}`
        });
    }
    
    // Update task status to 'submitted' and set submission date
    await db.update(tasks)
      .set({
        status: 'submitted',
        progress: 100,
        submission_date: new Date().toISOString(),
      })
      .where(eq(tasks.id, taskId));
    
    // Broadcast task update via WebSocket
    broadcastTaskUpdate({
      id: taskId,
      status: 'submitted',
      progress: 100,
      metadata: {
        submittedAt: new Date().toISOString(),
        formType: formType,
      }
    });
    
    // Broadcast form submission event via WebSocket with detailed payload
    broadcastFormSubmission({
      taskId: taskId,
      formType: formType,
      status: 'submitted',
      companyId: task.company_id,
      unlockedTabs: result.unlockedTabs || [],
      unlockedTasks: result.unlockedTasks || [],
      submissionDate: new Date().toISOString(),
      fileName: result.fileName,
      fileId: result.fileId,
    });
    
    // Return success response
    return res.status(200).json({
      success: true,
      taskId: taskId,
      status: 'submitted',
      formType: formType,
      details: `Form submitted successfully`,
      ...result
    });
  } catch (error) {
    console.error('Error in unified form submission endpoint:', error);
    
    return res.status(500).json({
      success: false,
      error: (error as Error).message || 'An error occurred while processing the form submission'
    });
  }
});

/**
 * Process KYB form submission
 */
async function processKybSubmission(task: any, formData: Record<string, any>, fileName?: string) {
  try {
    // Get the company associated with this task
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, task.company_id)
    });
    
    if (!company) {
      throw new Error(`Company not found with ID: ${task.company_id}`);
    }
    
    // Unlock File Vault tab
    const updatedTabs = [...(company.available_tabs || [])];
    
    // Add File Vault tab if not already present
    if (!updatedTabs.includes('file-vault')) {
      updatedTabs.push('file-vault');
      
      // Update company available tabs
      await db.update(companies)
        .set({ available_tabs: updatedTabs })
        .where(eq(companies.id, task.company_id));
    }
    
    // Here we'd handle file generation for KYB submissions if needed
    // For now, we'll just simulate a successful file generation
    const fileId = Math.floor(Math.random() * 1000) + 1;
    const generatedFileName = fileName || `kyb_submission_${task.id}_${Date.now()}.csv`;
    
    return {
      unlockedTabs: ['file-vault'],
      unlockedTasks: [],
      fileId,
      fileName: generatedFileName,
    };
  } catch (error) {
    console.error('Error processing KYB submission:', error);
    throw error;
  }
}

/**
 * Process KY3P form submission
 */
async function processKy3pSubmission(task: any, formData: Record<string, any>, fileName?: string) {
  try {
    // Similar to KYB processing, but with KY3P-specific logic
    // Here we'd handle risk scoring, dependency management, etc.
    
    // Generate file if needed
    const fileId = Math.floor(Math.random() * 1000) + 1;
    const generatedFileName = fileName || `ky3p_submission_${task.id}_${Date.now()}.csv`;
    
    return {
      unlockedTabs: ['security-assessment'],
      unlockedTasks: [],
      fileId,
      fileName: generatedFileName,
    };
  } catch (error) {
    console.error('Error processing KY3P submission:', error);
    throw error;
  }
}

/**
 * Process Open Banking form submission
 */
async function processOpenBankingSubmission(task: any, formData: Record<string, any>, fileName?: string) {
  try {
    // Get the company associated with this task
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, task.company_id)
    });
    
    if (!company) {
      throw new Error(`Company not found with ID: ${task.company_id}`);
    }
    
    // Unlock Dashboard and Insights tabs
    const updatedTabs = [...(company.available_tabs || [])];
    const tabsToUnlock = ['dashboard', 'insights'];
    
    // Add tabs if not already present
    let unlockedTabs: string[] = [];
    
    for (const tab of tabsToUnlock) {
      if (!updatedTabs.includes(tab)) {
        updatedTabs.push(tab);
        unlockedTabs.push(tab);
      }
    }
    
    // Only update if we actually added tabs
    if (unlockedTabs.length > 0) {
      await db.update(companies)
        .set({ available_tabs: updatedTabs })
        .where(eq(companies.id, task.company_id));
    }
    
    // Generate file if needed
    const fileId = Math.floor(Math.random() * 1000) + 1;
    const generatedFileName = fileName || `open_banking_submission_${task.id}_${Date.now()}.csv`;
    
    return {
      unlockedTabs,
      unlockedTasks: [],
      fileId,
      fileName: generatedFileName,
    };
  } catch (error) {
    console.error('Error processing Open Banking submission:', error);
    throw error;
  }
}

export default router;