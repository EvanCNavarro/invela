// Enhanced middleware to handle CORS for all Replit preview domains
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

export function setupCorsBypass(req: Request, res: Response, next: NextFunction) {
  // Get the origin from the request
  const origin = req.headers.origin;
  const host = req.headers.host;
  
  // Log request details for debugging preview issues
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Preview Debug] Request origin: ${origin}, host: ${host}, url: ${req.url}`);
  }
  
  // Detect Replit environment
  const isReplitEnvironment = Boolean(
    process.env.REPL_SLUG || 
    process.env.REPL_OWNER || 
    (host && (host.includes('.repl.co') || host.includes('.repl.dev')))
  );
  
  // Allow all origins in Replit environment or specified origins elsewhere
  if (isReplitEnvironment || 
      (origin && (
        origin.includes('.repl.co') || 
        origin.includes('.repl.dev') || 
        origin.includes('.replit.app') || 
        origin.includes('.replit.dev') || 
        origin.includes('localhost') || 
        origin.includes('127.0.0.1')
      ))
  ) {
    // If in Replit environment without specific origin (direct preview), allow all
    if (isReplitEnvironment && !origin) {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (origin) {
      // For specific origins, allow that origin
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    // Set comprehensive CORS headers
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Log allowed origin in development
    if (process.env.NODE_ENV === 'development') {
      logger.info(`[CORS] Allowed request from ${origin || 'direct preview'}`);
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  
  next();
}