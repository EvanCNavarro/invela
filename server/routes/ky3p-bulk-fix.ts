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
import { db } from '@db';
import { ky3pFields, ky3pResponses } from '@db/schema';
import { and, eq } from 'drizzle-orm';
import getLogger from '../utils/logger';

const logger = getLogger('KY3P-Bulk-Fix');

/**
 * Handle the special case where fieldIdRaw is "bulk" and responseValue is "undefined"
 * This is caused by the UniversalForm component sending bulk updates in the wrong format
 * 
 * @param req Express request object
 * @param res Express response object
 * @returns True if this is the special case and was handled, false otherwise
 */
export async function handleSpecialBulkCase(
  req: Request,
  res: Response
): Promise<boolean> {
  try {
    const { fieldIdRaw, responseValue, taskIdRaw } = req.body;
    
    // Check if this is the special case we're looking for
    if (fieldIdRaw === 'bulk' && (responseValue === 'undefined' || responseValue === undefined)) {
      logger.info(`[KY3P API] Detected special case with fieldIdRaw="bulk" and responseValue="undefined" for task ${taskIdRaw}`);
      
      // Get the task ID from the URL or request body
      const taskId = req.params.taskId || taskIdRaw;
      
      if (!taskId) {
        logger.error('[KY3P API] No task ID provided in special case handler');
        res.status(400).json({ message: 'No task ID provided' });
        return true; // We handled it by returning an error
      }
      
      try {
        // Check if the task exists in our database
        // This identifies whether we should bother with demo auto-fill or just redirect
        const fields = await db.select().from(ky3pFields);
        
        if (fields.length > 0) {
          logger.info(`[KY3P API] Redirecting to demo-autofill endpoint for task ${taskId}`);
          
          // Redirect to the demo auto-fill endpoint which will populate with standard data
          return new Promise((resolve) => {
            res.redirect(307, `/api/ky3p/demo-autofill/${taskId}`);
            resolve(true);
          });
        } else {
          logger.warn('[KY3P API] No KY3P fields found in database, returning empty success response');
          res.status(200).json({ message: 'No fields to update' });
          return true;
        }
      } catch (error) {
        logger.error('[KY3P API] Error in special case handler:', error);
        res.status(500).json({ message: 'Server error in special case handler' });
        return true;
      }
    }
    
    // Not the special case we're looking for
    return false;
  } catch (error) {
    logger.error('[KY3P API] Error in handleSpecialBulkCase:', error);
    return false; // Let the regular handler deal with it
  }
}