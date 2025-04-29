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
    // Get all fields count (we're not using is_visible at this time)
    const totalResultQuery = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM ky3p_fields`
    );
    
    // Get completed responses count
    const completedResultQuery = await db.execute<{ count: number }>(
      sql`SELECT COUNT(*) as count FROM ky3p_responses WHERE task_id = ${taskId} AND status = 'complete'`
    );
    
    // Safely extract count values, handle different result formats
    const totalResult = Array.isArray(totalResultQuery) ? totalResultQuery[0] : totalResultQuery;
    const completedResult = Array.isArray(completedResultQuery) ? completedResultQuery[0] : completedResultQuery;
    
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
    
    // Use a direct demo data approach with field keys that match our database schema
    const demoData = {
      // External Systems & Security
      'externalSystems': 'Our organization maintains a comprehensive inventory of external information systems through automated discovery tools and regular manual audits. The inventory is updated monthly and validated quarterly.',
      'breachNotification': 'Our breach notification process follows a structured protocol. Upon detection, incidents are escalated to the security team within 1 hour, assessed within 4 hours, and data controllers are notified within 24 hours of confirmation.',
      'standardChangeControl': 'We follow ITIL-based change management procedures with formal documentation, impact assessment, and approval workflows. All changes are tested in staging environments before deployment.',
      'dataLossGovernance': 'Our DLP strategy includes content inspection, context analysis, and location-based controls. We regularly review and update data loss prevention policies based on quarterly risk assessments.',
      'centralizedAuthentication': 'We implement centralized authentication through a federated identity management system with role-based access controls and just-in-time provisioning.',
      'antiFraudGovernance': 'Our fraud detection system employs machine learning algorithms to monitor transaction patterns, behavioral biometrics, and unusual access patterns in real-time.',
      'defaultPasswords': 'We enforce a strict policy against default passwords. All default credentials are changed before systems enter production, verified by automated scanning and security audits.',
      'assetRetrieval': 'We maintain a structured asset retrieval process for departing employees including access revocation, equipment return verification, and data sanitization procedures.',
      
      // Privacy and Security
      'privacyIncidentProcedure': 'Our privacy incident response plan includes a dedicated privacy team, containment procedures, forensic investigation protocols, and communication templates for different stakeholder groups.',
      'dataClassificationGovernance': 'Our data classification framework has four tiers: Public, Internal, Confidential, and Restricted. Each tier has defined handling requirements, access controls, and retention policies.',
      'threatManagementGovernance': 'Our threat management program includes continuous monitoring, threat intelligence integration, and coordinated vulnerability management through our security operations center.',
      'webApplicationSecurity': 'We implement OWASP security practices including regular SAST/DAST testing, secure code reviews, and runtime application self-protection (RASP) for critical applications.',
      'remoteMfa': 'All remote access requires multi-factor authentication using a combination of hardware tokens for privileged users and mobile authenticator apps for standard users.',
      'fraudActivityReporting': 'Suspected fraud activity is reported through a dedicated hotline and online portal, with anonymous reporting options and mandatory review within 24 hours.',
      'incidentDocumentation': 'Security incidents are documented in our centralized incident management system with standardized templates for incident classification, response actions, and post-incident analysis.',
      
      // Compliance and Development
      'privacyLawCompliance': 'We maintain compliance with relevant privacy laws through a dedicated privacy office, periodic assessments, data mapping exercises, and regulatory monitoring.',
      'developmentLifecycle': 'Our secure development lifecycle incorporates security requirements definition, threat modeling, secure coding standards, and security testing at all stages of development.',
      'acceptableUse': 'Our acceptable use policy covers all IT resources, is reviewed annually, requires explicit user acknowledgment, and is reinforced through regular security awareness training.',
      'securityExceptions': 'Security exceptions require formal risk assessment, compensating controls, executive approval, and are documented with specific expiration dates and periodic reviews.',
      'securityPatching': 'Our patch management process includes daily vulnerability monitoring, risk-based prioritization, testing protocols, and defined SLAs for deployment (Critical: 24h, High: 7d, Medium: 30d).',
      
      // Additional Areas
      'incidentResponse': 'Our incident response team conducts quarterly tabletop exercises and annual full-scale simulations to ensure readiness for various security scenarios.',
      'disasterRecovery': 'Our disaster recovery plan is tested bi-annually, maintains RTO of 4 hours and RPO of 15 minutes for critical systems, with geographically distributed recovery sites.',
      'backupManagement': 'Critical data is backed up daily with incremental backups throughout the day, 30-day retention for standard data, and 7-year retention for regulated data.',
      'encryptionControls': 'We implement AES-256 encryption for data at rest and TLS 1.3 for data in transit, with hardware security modules (HSMs) for key management.',
      'vendorAssessment': 'Third-party vendors undergo security assessment before engagement and annually thereafter, with risk-tiered evaluation depth and continuous monitoring.'
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