// Enhanced middleware to handle CORS for all Replit preview domains
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

export function setupCorsBypass(req: Request, res: Response, next: NextFunction) {
  // Get the origin from the request
  const origin = req.headers.origin;
  const host = req.headers.host || '';
  
  // Log request details for debugging preview issues
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Preview Debug] Request origin: ${origin}, host: ${host}, url: ${req.url}`);
  }
  
  // Check for specific Replit preview domain patterns
  const isPicardReplitDomain = host.includes('picard.replit.dev');
  const isReplitUUIDDomain = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}.*picard\.replit\.dev/.test(host);
  
  // Detect Replit environment - expanded for all possible preview domains
  const isReplitEnvironment = Boolean(
    process.env.REPL_SLUG || 
    process.env.REPL_OWNER || 
    host.includes('.repl.co') || 
    host.includes('.replit.app') ||
    host.includes('.repl.dev') || 
    host.includes('.replit.dev') ||
    isPicardReplitDomain ||
    isReplitUUIDDomain
  );
  
  // For all Replit preview environments, we need to allow access
  if (isReplitEnvironment) {
    // Allow any origin in Replit environment
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // For specific picard.replit.dev domains, we need special handling
    if (isPicardReplitDomain || isReplitUUIDDomain) {
      // Set permissive CORS headers
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    
      // Log specialized handling
      logger.info(`[CORS] Special handling for Replit preview domain: ${host}`);
    } else {
      // Standard Replit domain handling
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      logger.info(`[CORS] Allowed request from Replit domain: ${host}`);
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  // Handle localhost development
  else if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Log allowed localhost origins
    logger.info(`[CORS] Allowed request from local development: ${origin}`);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  
  next();
}