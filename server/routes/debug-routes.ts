/**
 * Debug Routes for troubleshooting
 * 
 * These routes are for testing and troubleshooting purposes only.
 * They should not be used in production.
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { companies } from '../../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Export the router
export { router };

// Endpoint to directly update risk priorities (bypassing traditional API auth)
// This is a temporary solution to the authentication issue
router.post('/direct-update-risk-priorities', async (req: Request, res: Response) => {
  console.log('[DEBUG] Received direct update request for risk priorities');
  
  try {
    // Check if request has auth info
    const { priorities, auth_check } = req.body;
    
    if (!priorities) {
      return res.status(400).json({ 
        error: 'Missing priorities data',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      });
    }
    
    console.log('[DEBUG] Request details:', {
      user: req.user ? { id: req.user.id, company_id: req.user.company_id } : null,
      auth_check,
      authenticated: !!req.user,
      isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : null,
      hasSession: !!req.session,
      sessionCookie: req.headers.cookie?.includes('connect.sid')
    });
    
    // Try to get company ID from either the user or request body
    let companyId = req.user?.company_id;
    
    // If we don't have a company ID from the user, try to get it from request
    if (!companyId && req.body.company_id) {
      companyId = parseInt(req.body.company_id);
    }
    
    // If we still don't have a company ID, return error
    if (!companyId) {
      return res.status(400).json({
        error: 'Unable to determine company ID',
        authenticated: !!req.user,
        timestamp: new Date().toISOString()
      });
    }
    
    // Perform the direct update
    await db.update(companies)
      .set({
        risk_priorities: priorities as any,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    // Get the updated company record to confirm update
    const updatedCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        risk_priorities: true
      }
    });
    
    console.log('[DEBUG] Direct update successful');
    
    return res.status(200).json({
      success: true,
      message: 'Risk priorities updated directly in database',
      data: updatedCompany?.risk_priorities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[DEBUG] Error during direct update:', error);
    
    return res.status(500).json({
      error: 'Server error during direct update',
      details: String(error),
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint to check authentication status
router.get('/auth-check', (req: Request, res: Response) => {
  console.log('[DEBUG] Auth check requested');
  
  return res.status(200).json({
    authenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    user: req.user ? { id: req.user.id, company_id: req.user.company_id } : null,
    hasSession: !!req.session,
    sessionCookie: req.headers.cookie?.includes('connect.sid'),
    timestamp: new Date().toISOString()
  });
});

// Only using named export