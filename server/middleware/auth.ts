/**
 * Authentication middleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Authentication required',
      details: {
        authenticated: req.isAuthenticated(),
        hasUser: !!req.user,
        hasSession: !!req.session,
        timestamp: new Date().toISOString()
      }
    });
  }
  
  next();
}

/**
 * Optional authentication middleware for risk score configuration
 * Allows unauthenticated access but attaches user if available
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Always proceed, regardless of auth state
  // But log the auth state for debugging
  console.log(`[OptionalAuth] Request to ${req.path}: authenticated=${req.isAuthenticated()}, hasUser=${!!req.user}`);
  next();
}