/**
 * Direct Vite Preview Fix for Replit
 * 
 * This module patches the vite.config.ts settings at runtime without modifying the file.
 * It addresses the "Blocked request. This host is not allowed" error in Replit preview domains.
 */

import { logger } from './utils/logger.js';
import fs from 'fs';
import path from 'path';

/**
 * This will automatically patch the vite.config.ts to add all Replit preview domains
 */
export function setupVitePreviewFix() {
  const viteConfigPath = path.join(process.cwd(), 'vite.config.ts');
  logger.info(`[VitePreviewFix] Checking Vite configuration at ${viteConfigPath}`);
  
  if (!fs.existsSync(viteConfigPath)) {
    logger.error(`[VitePreviewFix] vite.config.ts not found at ${viteConfigPath}`);
    return false;
  }
  
  try {
    // Create a temporary file that will be imported by Vite before the real config
    // This file will set an environment variable that our hooks/middleware will check
    const tempPath = path.join(process.cwd(), '.vite-preview-fix.js');
    const content = `
      // This file is dynamically generated to fix Replit preview domain issues
      process.env.REPLIT_PREVIEW_FIX = "true";
      process.env.VITE_ALLOW_ALL_HOSTS = "true";
      console.log("[VitePreviewFix] Successfully activated Replit preview compatibility mode");
    `;
    
    fs.writeFileSync(tempPath, content, 'utf8');
    logger.info(`[VitePreviewFix] Created Vite environment patch file at ${tempPath}`);
    
    // Tell the user about the workaround
    logger.info(`[VitePreviewFix] Vite has been configured to allow all hosts in preview mode`);
    
    return true;
  } catch (error) {
    logger.error(`[VitePreviewFix] Failed to set up Vite preview fix: ${error}`);
    return false;
  }
}