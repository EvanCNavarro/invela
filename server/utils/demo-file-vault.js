/**
 * Demo File Vault Population Utility
 * 
 * This utility directly populates a company's file vault with standard demo files
 * when a demo company is created. It uses absolute paths to ensure reliable file access.
 */

import fs from 'fs';
import path from 'path';
import { db } from '../../db/index.js';
import { files } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from './logger.js';

// Define constants
const DEMO_FILE_PATHS = [
  '1_SOC_2_Questions.csv',
  '2_ISO_27001_Questions.csv',
  '3_Penetration_Test_Questions.csv',
  '4_Business_Continuity_Plan_Questions.csv'
];

// Define a system user ID for file creation (typically an admin user)
const SYSTEM_USER_ID = 1;

/**
 * Check if company already has files in its vault
 * 
 * @param {number} companyId - The company ID
 * @returns {Promise<number>} - Number of existing files
 */
async function getExistingFileCount(companyId) {
  try {
    const existingFiles = await db
      .select({ id: files.id })
      .from(files)
      .where(eq(files.company_id, companyId));
      
    return existingFiles.length;
  } catch (error) {
    logger.error(`[Demo File Vault] Error checking existing files for company ${companyId}:`, {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return 0;
  }
}

/**
 * Read a file from the attached_assets directory
 * 
 * @param {string} fileName - Name of the file in attached_assets directory
 * @returns {Promise<string>} - File contents as string
 */
async function readDemoFile(fileName) {
  try {
    // Use absolute path from project root to avoid path resolution issues
    const filePath = path.resolve(process.cwd(), 'attached_assets', fileName);
    logger.info(`[Demo File Vault] Reading file from ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Demo file not found: ${filePath}`);
    }
    
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    logger.error(`[Demo File Vault] Error reading demo file ${fileName}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      filePath: path.resolve(process.cwd(), 'attached_assets', fileName),
      currentDir: process.cwd(),
      exists: fs.existsSync(path.resolve(process.cwd(), 'attached_assets', fileName))
    });
    throw error;
  }
}

/**
 * Get display name from CSV filename
 * 
 * @param {string} fileName - CSV filename
 * @returns {string} - Formatted display name
 */
function getDisplayNameFromFilename(fileName) {
  // Extract the base filename without the numeric prefix and extension
  const baseName = path.basename(fileName, '.csv');
  const nameWithoutPrefix = baseName.replace(/^\d+_/, '');
  
  // Replace underscores with spaces and format
  return nameWithoutPrefix.replace(/_/g, ' ');
}

/**
 * Add a single demo file to company's file vault
 * 
 * @param {number} companyId - The company ID
 * @param {string} companyName - The company name
 * @param {string} fileName - The file name in attached_assets
 * @returns {Promise<object>} - Result object with file details
 */
async function addDemoFile(companyId, companyName, fileName) {
  try {
    const fileContent = await readDemoFile(fileName);
    const displayName = getDisplayNameFromFilename(fileName);
    const finalName = `${displayName} - ${companyName}.csv`;
    
    logger.info(`[Demo File Vault] Adding file "${finalName}" to company ${companyId}`);
    
    // Insert file record in database
    const result = await db.insert(files)
      .values({
        name: finalName,
        path: fileContent, // Store content directly in path field
        type: 'text/csv',
        status: 'uploaded',
        company_id: companyId,
        user_id: SYSTEM_USER_ID,
        created_at: new Date(),
        updated_at: new Date(),
        size: Buffer.from(fileContent).length,
        version: 1,
        metadata: {
          isDemo: true,
          sourceFile: fileName,
          createdAt: new Date().toISOString(),
          companyName: companyName
        }
      })
      .returning({ id: files.id });
    
    if (!result || result.length === 0) {
      throw new Error('Failed to insert file record');
    }
    
    const fileId = result[0].id;
    
    logger.info(`[Demo File Vault] Successfully added "${finalName}" to file vault for company ${companyId}`, {
      fileId,
      fileName: finalName
    });
    
    return {
      success: true,
      fileId,
      fileName: finalName
    };
  } catch (error) {
    logger.error(`[Demo File Vault] Error adding demo file to vault:`, {
      companyId,
      fileName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Populate a company's file vault with standard demo files
 * 
 * This function is designed to be called directly after company creation
 * to ensure demo companies have files in their vault from the start.
 * 
 * @param {Object} company - Company object with id and name
 * @returns {Promise<Object>} - Result with success status and file count
 */
export async function populateDemoFileVault(company) {
  if (!company || !company.id) {
    logger.warn('[Demo File Vault] Invalid company object provided to populateDemoFileVault');
    return { 
      success: false, 
      reason: 'Invalid company object'
    };
  }
  
  logger.info(`[Demo File Vault] Starting file vault population for company ${company.id} (${company.name})`);
  
  try {
    // Skip if company already has files
    const existingFileCount = await getExistingFileCount(company.id);
    
    if (existingFileCount > 0) {
      logger.info(`[Demo File Vault] Company ${company.id} already has ${existingFileCount} files, skipping population`);
      return {
        success: true,
        status: 'skipped',
        reason: 'Files already exist',
        fileCount: existingFileCount
      };
    }
    
    // Add each demo file to the vault
    const results = [];
    
    for (const fileName of DEMO_FILE_PATHS) {
      const result = await addDemoFile(company.id, company.name, fileName);
      results.push(result);
    }
    
    const successCount = results.filter(r => r.success).length;
    
    logger.info(`[Demo File Vault] Completed file vault population for company ${company.id}`, {
      companyName: company.name,
      totalFiles: DEMO_FILE_PATHS.length,
      successfulFiles: successCount,
      fileIds: results.filter(r => r.success).map(r => r.fileId)
    });
    
    return {
      success: true,
      fileCount: successCount,
      companyName: company.name
    };
  } catch (error) {
    logger.error(`[Demo File Vault] Error in file vault population:`, {
      companyId: company.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}