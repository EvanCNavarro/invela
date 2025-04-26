/**
 * KY3P Bulk Update Fix
 * 
 * This file contains the fix for the "Invalid field ID format" error that occurs
 * when the client sends a request with fieldIdRaw: "bulk" and responseValue: "undefined".
 * 
 * The issue is in the client-side code, but we can add a server-side fix to handle
 * this specific case properly.
 */

import { Request, Response } from 'express';
import { pool } from '@db';
import { getLogger } from '@/utils/logger';

const logger = getLogger('KY3PBulkFix');

/**
 * Handle the special case where fieldIdRaw is "bulk" and responseValue is "undefined"
 * 
 * @param req Express request object
 * @param res Express response object
 * @returns True if this is the special case and was handled, false otherwise
 */
export async function handleSpecialBulkCase(
  req: Request,
  res: Response
): Promise<boolean> {
  // Check if this is the special case we're looking for
  if (
    req.body &&
    req.body.fieldIdRaw === 'bulk' &&
    (req.body.responseValue === 'undefined' || req.body.responseValue === undefined)
  ) {
    logger.info('[KY3P Bulk Fix] Detected special case with fieldIdRaw=bulk');
    
    // This is an invalid request format, but we know it's from the UniversalForm
    // trying to use the demo auto-fill functionality
    
    try {
      // Extract the task ID from the params or the body
      const taskId = req.params.taskId || req.body.taskIdRaw;
      
      if (!taskId) {
        logger.error('[KY3P Bulk Fix] No task ID provided');
        return res.status(400).json({ message: 'No task ID provided' });
      }
      
      // Redirect to the demo-autofill endpoint instead
      logger.info(`[KY3P Bulk Fix] Redirecting to demo-autofill endpoint for task ${taskId}`);
      
      // Use the direct demo-autofill endpoint to fill the form with demo data
      const result = await fetch(`${req.protocol}://${req.get('host')}/api/ky3p/demo-autofill/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': req.headers.cookie || '',
        },
        body: JSON.stringify({}),
      });
      
      if (!result.ok) {
        logger.error(`[KY3P Bulk Fix] Demo auto-fill failed: ${result.status}`);
        return res.status(result.status).json({ 
          message: `Demo auto-fill failed: ${result.status}`,
          redirected: true
        });
      }
      
      const demoResult = await result.json();
      
      // Return success with the demo auto-fill result
      return res.status(200).json({
        success: true,
        message: 'Successfully applied demo data via auto-fill endpoint',
        fieldsPopulated: demoResult.fieldsPopulated || 0,
        redirected: true
      });
    } catch (error) {
      logger.error('[KY3P Bulk Fix] Error handling special bulk case:', error);
      return res.status(500).json({ 
        message: 'Error processing special bulk case',
        error: error instanceof Error ? error.message : String(error)
      });
    }
    
    // Indicate that we handled this special case
    return true;
  }
  
  // This is not the special case, so return false to let normal processing continue
  return false;
}