/**
 * KY3P Batch Update Routes
 * 
 * This module provides a new batch update endpoint for KY3P forms
 * that accepts string field keys instead of requiring numeric IDs.
 */

import express from 'express';
import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { Logger } from '../utils/logger';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const logger = new Logger('KY3P-BatchUpdate');

/**
 * Special batch-update endpoint that accepts string field keys
 * This is used by the standardized KY3P bulk update implementation
 */
router.post('/api/ky3p/batch-update/:taskId', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    if (isNaN(taskId)) {
      return res.status(400).json({
        message: 'Invalid task ID'
      });
    }
    
    // Validate responses
    const { responses } = req.body;
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        message: 'Invalid request: responses is required and must be an object'
      });
    }
    
    // Log the request details
    logger.info(`Received batch update for task ${taskId} with ${Object.keys(responses).length} fields`);
    
    // Get all fields for field type validation and ID mapping
    const fields = await db.select().from(ky3pFields);
    
    // Create useful maps for field lookup by key
    const fieldKeyToIdMap = new Map(fields.map(field => [field.field_key, field.id]));
    
    // Process all responses as a batch
    const responseEntries = [];
    
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
            response_value: value,
            status: value ? 'complete' : 'empty'
          });
        } else {
          logger.warn(`Invalid field ID for key ${fieldKey}: ${fieldId}`);
        }
      } else {
        logger.warn(`Field key not found: ${fieldKey}`);
      }
    }
    
    if (responseEntries.length === 0) {
      return res.status(400).json({
        message: 'No valid field IDs found in the request'
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
      
      // Then insert new responses if we have any
      if (responseEntries.length > 0) {
        await tx.insert(ky3pResponses).values(responseEntries);
      } else {
        logger.warn(`No matching fields found for task ${taskId}`);
      }
    });
    
    // Update task progress
    try {
      // Call the existing progress calculation endpoint
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/update-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId })
      });
      
      if (!response.ok) {
        logger.error(`Failed to update task progress: ${response.status}`);
      } else {
        const result = await response.json();
        logger.info(`Task progress updated`);
      }
    } catch (progressError) {
      logger.error('Error updating task progress');
      // We don't want to fail the entire request if just the progress update fails
      // So we catch this error separately and continue
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully updated ${responseEntries.length} responses`,
      updatedCount: responseEntries.length
    });
  } catch (error) {
    logger.error('Error processing batch update');
    return res.status(500).json({
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
        message: 'Invalid task ID'
      });
    }
    
    logger.info(`Demo auto-fill requested for task ${taskId}`);
    
    // For this simplified implementation, we'll use a direct demo data approach
    // instead of trying to import the UniversalDemoAutoFillService 
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
    const responseEntries = [];
    
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
            response_value: value,
            status: 'complete'
          });
        }
      }
    }
    
    logger.info(`Converting ${responseEntries.length} demo fields with data`);
    
    // Insert all responses in a single transaction
    await db.transaction(async (tx) => {
      // First delete all existing responses for this task
      await tx.delete(ky3pResponses)
        .where(eq(ky3pResponses.task_id, taskId));
      
      // Then insert new responses if we have any
      if (responseEntries.length > 0) {
        await tx.insert(ky3pResponses).values(responseEntries);
      } else {
        logger.warn(`No matching fields found for task ${taskId}`);
      }
    });
    
    // Update task progress
    try {
      // Call the existing progress calculation endpoint
      const response = await fetch(`http://localhost:5000/api/tasks/${taskId}/update-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId })
      });
      
      if (!response.ok) {
        logger.error(`Failed to update task progress: ${response.status}`);
      } else {
        const result = await response.json();
        logger.info(`Task progress updated`);
      }
    } catch (progressError) {
      logger.error('Error updating task progress');
      // We don't want to fail the entire request if just the progress update fails
      // So we catch this error separately and continue
    }
    
    return res.status(200).json({
      success: true,
      message: `Successfully populated ${responseEntries.length} fields with demo data`,
      fieldsPopulated: responseEntries.length
    });
  } catch (error) {
    logger.error('Error auto-filling demo data');
    return res.status(500).json({
      message: 'An error occurred while auto-filling demo data',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;