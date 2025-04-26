/**
 * KY3P Fixed Routes
 * 
 * This module provides improved endpoints for KY3P forms with proper error handling
 * and consistent response formats.
 */

import express from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses, tasks } from '@db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Helper function to update task progress
async function updateTaskProgress(taskId: number): Promise<number> {
  try {
    // Direct database update to calculate and update progress
    // Get visible fields count
    const [totalResult] = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM ky3p_fields WHERE is_visible = true`
    );
    
    // Get completed responses count
    const [completedResult] = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM ky3p_responses WHERE task_id = ${taskId} AND status = 'complete'`
    );
    
    const total = Number(totalResult?.count || 0);
    const completed = Number(completedResult?.count || 0);
    
    // Calculate progress percentage (0-100)
    const progressPercent = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    
    // Update the task progress in the tasks table directly
    await db.execute(
      sql`UPDATE tasks SET progress = ${progressPercent}, updated_at = NOW() WHERE id = ${taskId}`
    );
    
    console.log(`[KY3P] Task ${taskId} progress updated: ${progressPercent}%`);
    return progressPercent;
  } catch (error) {
    console.error('[KY3P] Error updating task progress', error);
    return 0;
  }
}

/**
 * Special batch-update endpoint that accepts string field keys
 */
router.post('/api/ky3p/batch-update/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    // Validate responses
    const { responses } = req.body;
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: responses is required and must be an object'
      });
    }
    
    // Log the request details
    console.log(`[KY3P API] Received batch update for task ${taskId} with ${Object.keys(responses).length} fields`);
    
    // Get all fields for field type validation and ID mapping
    const fields = await db.select().from(ky3pFields);
    
    // Create useful maps for field lookup by key
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    
    // Process all responses as a batch
    const responseEntries: Array<{
      task_id: number;
      field_id: number;
      response_value: string;
      status: string;
    }> = [];
    
    // Convert responses with string keys to array format with explicit fieldId
    for (const [fieldKey, value] of Object.entries(responses)) {
      const fieldId = fieldKeyToIdMap.get(fieldKey);
      
      if (fieldId !== undefined) {
        // Ensure field ID is a number
        const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
        
        if (!isNaN(numericFieldId)) {
          responseEntries.push({
            task_id: taskId,
            field_id: numericFieldId,
            response_value: String(value),
            status: value ? 'complete' : 'empty'
          });
        } else {
          console.warn(`[KY3P API] Invalid field ID for key ${fieldKey}: ${fieldId}`);
        }
      } else {
        console.warn(`[KY3P API] Field not found in batch update: ${fieldKey}`);
      }
    }
    
    // Don't fail if we don't have any fields, just report it
    if (responseEntries.length === 0) {
      console.warn(`[KY3P API] No matching fields found for task ${taskId}`);
      
      return res.status(200).json({
        success: true,
        processedCount: 0,
        message: `Successfully processed 0 field updates for task ${taskId}`
      });
    }
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete existing responses for these fields
      await tx.delete(ky3pResponses)
        .where(and(
          eq(ky3pResponses.task_id, taskId),
          inArray(ky3pResponses.field_id, responseEntries.map(entry => entry.field_id))
        ));
      
      // Then insert new responses
      await tx.insert(ky3pResponses).values(responseEntries);
    });
    
    // Update task progress
    const progressPercent = await updateTaskProgress(taskId);
    
    return res.status(200).json({
      success: true,
      message: `Successfully processed ${responseEntries.length} field updates`,
      processedCount: responseEntries.length,
      fieldKeys: responseEntries.map(entry => entry.field_id).join(', '),
      progressPercent
    });
  } catch (error) {
    console.error('[KY3P API] Error processing batch update', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while processing the batch update',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Special demo-autofill endpoint for KY3P forms
 */
router.post('/api/ky3p/demo-autofill/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    console.log(`[KY3P API] Demo auto-fill requested for task ${taskId}`);
    
    // For this simplified implementation, we'll use a direct demo data approach
    const demoData = {
      // Company Information
      'company_name': 'DevTest35',
      'contact_email': 'support@devtest35.com',
      'contact_phone': '+1-555-123-4567',
      'business_description': 'Leading provider of compliance and risk management software solutions specializing in vendor risk management and security assessment.',
      'industry': 'Financial Technology',
      'years_in_business': '8',
      
      // Security Controls
      'security_policy_documented': 'Yes',
      'security_policy_last_updated': '2025-01-15',
      'encryption_in_transit': 'Yes',
      'encryption_standards': 'TLS 1.3, AES-256',
      'encryption_at_rest': 'Yes',
      'encryption_key_management': 'Hardware Security Module (HSM)',
      'multifactor_authentication': 'Yes',
      'mfa_type': 'TOTP and hardware tokens for privileged users',
      'incident_response_plan': 'Yes',
      'incident_response_last_tested': '2025-03-10',
      
      // Security Assessment
      'security_training_frequency': 'Quarterly',
      'security_awareness_program': 'Comprehensive program including simulated phishing and gamified learning',
      'vulnerability_scanning_frequency': 'Monthly',
      'vulnerability_remediation_timeframe': 'Critical: 24h, High: 7d, Medium: 30d, Low: 90d',
      'penetration_testing_frequency': 'Annually',
      'penetration_testing_last_date': '2024-11-05',
      'data_classification_implemented': 'Yes',
      'data_classification_levels': 'Public, Internal, Confidential, Restricted',
      
      // Business Continuity
      'backup_frequency': 'Daily',
      'backup_retention_period': '90 days',
      'backup_last_tested': '2025-02-18',
      'disaster_recovery_tested': 'Yes',
      'disaster_recovery_last_test_date': '2025-01-22',
      'business_continuity_plan': 'Yes',
      'recovery_time_objective': '4 hours',
      'recovery_point_objective': '15 minutes',
      
      // Third-Party Management
      'third_party_risk_assessment': 'Yes',
      'third_party_assessment_frequency': 'Annual and upon significant changes',
      'vendor_management_program': 'Yes',
      'critical_vendor_list_maintained': 'Yes',
      'third_party_access_controls': 'Enforced least privilege access with mandatory MFA'
    };
    
    // Get all fields for mapping
    const fields = await db.select().from(ky3pFields);
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    
    // Process all demo data as a batch
    const responseEntries: Array<{
      task_id: number;
      field_id: number;
      response_value: string;
      status: string;
    }> = [];
    
    // Convert demo data with string keys to array format with explicit fieldId
    for (const [fieldKey, value] of Object.entries(demoData)) {
      const fieldId = fieldKeyToIdMap.get(fieldKey);
      
      if (fieldId !== undefined && value !== undefined && value !== null && value !== '') {
        // Ensure field ID is a number
        const numericFieldId = typeof fieldId === 'string' ? parseInt(fieldId, 10) : fieldId;
        
        if (!isNaN(numericFieldId)) {
          responseEntries.push({
            task_id: taskId,
            field_id: numericFieldId,
            response_value: String(value),
            status: 'complete'
          });
        }
      }
    }
    
    console.log(`[KY3P API] Converting ${responseEntries.length} demo fields with data`);
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete all existing responses for this task
      await tx.delete(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      // Then insert new responses if we have any
      if (responseEntries.length > 0) {
        await tx.insert(ky3pResponses).values(responseEntries);
      } else {
        console.warn(`[KY3P API] No matching fields found for task ${taskId}`);
      }
    });
    
    // Update task progress
    const progressPercent = await updateTaskProgress(taskId);
    
    return res.status(200).json({
      success: true,
      message: `Successfully populated ${responseEntries.length} fields with demo data`,
      fieldsPopulated: responseEntries.length,
      progressPercent
    });
  } catch (error) {
    console.error('[KY3P API] Error auto-filling demo data', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while auto-filling demo data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Clear all responses for a KY3P task
 */
router.post('/api/ky3p/clear-fields/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID'
      });
    }
    
    console.log(`[KY3P API] Clear all fields requested for task ${taskId}`);
    
    // Delete all responses for this task
    await db.delete(ky3pResponses)
      .where(eq(ky3pResponses.task_id, taskId));
    
    // Update task progress (will be 0%)
    await updateTaskProgress(taskId);
    
    return res.status(200).json({
      success: true,
      message: `Successfully cleared all fields for task ${taskId}`,
      progressPercent: 0
    });
  } catch (error) {
    console.error('[KY3P API] Error clearing fields', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while clearing fields',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;