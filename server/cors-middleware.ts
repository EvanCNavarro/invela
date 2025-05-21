// Middleware to handle CORS for Replit preview domains
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

export function setupCorsBypass(req: Request, res: Response, next: NextFunction) {
  // Get the origin from the request
  const origin = req.headers.origin;
  
  // Allow Replit preview domains and localhost
  if (origin && (
    origin.includes('.replit.dev') || 
    origin.includes('localhost') || 
    origin.includes('127.0.0.1')
  )) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    logger.info(`[CORS] Allowed origin: ${origin}`);
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  
  next();
}