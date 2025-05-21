// Enhanced middleware to handle CORS for all Replit preview domains
import { Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

/**
 * Enhanced CORS middleware that ensures proper handling for Replit preview domains
 * and local development environments.
 */
export function setupCorsBypass(req: Request, res: Response, next: NextFunction) {
  // Get the origin and host from the request
  const origin = req.headers.origin;
  const host = req.headers.host || '';
  const url = req.url || '';
  
  // Debug logging in development mode
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[Preview Debug] Request origin: ${origin}, host: ${host}, url: ${url}`);
  }
  
  // Simplified domain pattern matching
  const isReplitDomain = Boolean(
    host.includes('.repl.co') || 
    host.includes('.replit.app') ||
    host.includes('.replit.dev') ||
    host.includes('picard.replit.dev')
  );
  
  // Match UUID-style preview domains (these were previously blocked by Vite)
  const isUUIDPreviewDomain = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(host);
  
  // Handle Replit domains and preview domains with permissive CORS
  if (isReplitDomain || isUUIDPreviewDomain) {
    // Set permissive CORS headers for all Replit domains
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Log the domain handling
    if (isUUIDPreviewDomain) {
      logger.info(`[CORS] Special handling for UUID Replit preview domain: ${host}`);
    } else {
      logger.info(`[CORS] Allowed request from Replit domain: ${host}`);
    }
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  // Handle localhost/local development
  else if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    logger.info(`[CORS] Allowed request from local development: ${origin}`);
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  
  next();
}