import fs from 'fs';
import path from 'path';
import { type Request, Response, NextFunction } from 'express';
import { logger } from './utils/logger';

/**
 * Direct Preview Handler
 * 
 * This is a specialized middleware for handling Replit preview requests.
 * It bypasses all other middleware and serves a static HTML file for 
 * preview domains, ensuring something is visible in the preview panel.
 */
export function directPreviewHandler(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host || '';
  const url = req.originalUrl || req.url || '';
  
  // Only handle root requests
  if (url !== '/') {
    return next();
  }
  
  // Check if this is a preview domain
  const isPreviewDomain = 
    host.includes('.repl.co') || 
    host.includes('.replit.dev') || 
    host.includes('picard.replit.dev') || 
    host.includes('replit.dev') ||
    host === '0.0.0.0:3000' || 
    host === 'localhost:3000';
  
  logger.info(`[PreviewHandler] Request to / - Host: ${host}, Preview: ${isPreviewDomain}`);
  
  // For preview domains, serve the direct static HTML
  if (isPreviewDomain) {
    try {
      const rootIndexPath = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(rootIndexPath)) {
        logger.info(`[PreviewHandler] Serving static HTML for preview domain: ${host}`);
        
        const html = fs.readFileSync(rootIndexPath, 'utf8');
        
        // Set headers to prevent caching and ensure it's treated as HTML
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Content-Type', 'text/html');
        
        return res.send(html);
      } else {
        logger.error(`[PreviewHandler] index.html not found at ${rootIndexPath}`);
      }
    } catch (err) {
      logger.error(`[PreviewHandler] Error serving static HTML:`, err);
    }
  }
  
  // If not a preview domain or error occurred, continue with normal routing
  next();
}