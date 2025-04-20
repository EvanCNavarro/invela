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