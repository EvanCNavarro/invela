/**
 * Fix KY3P Files API Route
 * 
 * This file provides an API endpoint to run the fix for KY3P file references
 * in task metadata. It allows running the fix manually via an authenticated
 * API call.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { fixKy3pFileReferences } from '../fixes/fix-ky3p-file-reference';

const router = Router();

/**
 * Run the KY3P file reference fix
 */
router.post('/api/fix-ky3p-files', requireAuth, async (req, res) => {
  try {
    console.log('[FixKY3PFiles] Running KY3P file reference fix');
    
    // Run the fix
    const result = await fixKy3pFileReferences();
    
    console.log('[FixKY3PFiles] Fix completed:', result);
    
    return res.json({
      success: true,
      message: 'KY3P file reference fix completed successfully',
      ...result
    });
  } catch (error) {
    console.error('[FixKY3PFiles] Error running fix:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Error running KY3P file reference fix',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
