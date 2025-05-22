/**
 * Demo Company Hooks
 * 
 * This module provides hooks that run automatically after demo company creation
 * to enhance the demo experience, including populating the file vault with sample files.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../../db/index.js';
import { files, companies } from '../../db/schema.js'; 
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

// Get current directory name (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define constants
const DEMO_FILE_PATHS = [
  '../../attached_assets/1_SOC_2_Questions.csv',
  '../../attached_assets/2_ISO_27001_Questions.csv',
  '../../attached_assets/3_Penetration_Test_Questions.csv',
  '../../attached_assets/4_Business_Continuity_Plan_Questions.csv'
];

// Define a system user ID for file creation (typically an admin user)
const SYSTEM_USER_ID = 1;

/**
 * Check if a company is marked as a demo in the database
 * 
 * @param {number} companyId - Company ID to check
 * @returns {Promise<boolean>} - True if company is demo, false otherwise
 */
async function isCompanyDemo(companyId) {
  try {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      return false;
    }
    
    // Check if is_demo is true or if company name indicates a demo
    return company.is_demo === true || isDemoCompanyName(company.name);
  } catch (error) {
    logger.error(`Error checking if company ${companyId} is demo:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Check if a company name indicates this is a demo company
 * 
 * @param {string} companyName - Company name to check
 * @returns {boolean} - True if name indicates a demo company
 */
function isDemoCompanyName(companyName) {
  if (!companyName) {
    return false;
  }
  
  const lowerName = companyName.toLowerCase();
  const demoIndicators = [
    'demo',
    'test',
    'sample',
    'example'
  ];
  
  return demoIndicators.some(indicator => 
    lowerName.includes(indicator) || 
    // Check specific formats like 'DemoBank', 'TestCompany', etc.
    new RegExp(`^${indicator}[A-Z]`, 'i').test(companyName)
  );
}

/**
 * Read a file and return its contents
 * 
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File contents as string
 */
async function readFileContent(filePath) {
  try {
    const resolvedPath = path.resolve(__dirname, filePath);
    logger.info(`[Demo File Vault] Reading file content from ${resolvedPath}`);
    
    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${resolvedPath}`);
    }
    
    return fs.readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    logger.error(`[Demo File Vault] Error reading file ${filePath}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      resolvedPath: path.resolve(__dirname, filePath),
      currentDir: process.cwd(),
      exists: fs.existsSync(path.resolve(__dirname, filePath))
    });
    throw error;
  }
}

/**
 * Get display name from CSV file path
 * 
 * @param {string} filePath - Path to the CSV file
 * @returns {string} - Formatted display name
 */
function getDisplayNameFromPath(filePath) {
  // Extract the base filename without the numeric prefix and extension
  const baseName = path.basename(filePath, '.csv');
  const nameWithoutPrefix = baseName.replace(/^\d+_/, '');
  
  // Replace underscores with spaces and format
  return nameWithoutPrefix.replace(/_/g, ' ');
}

/**
 * Create a file in the database
 * 
 * @param {Object} options - File creation options
 * @param {string} options.name - File name
 * @param {string} options.content - File content
 * @param {string} options.type - File type (MIME type)
 * @param {number} options.userId - User ID creating the file
 * @param {number} options.companyId - Company ID the file belongs to
 * @param {Object} [options.metadata] - Optional metadata
 * @param {string} [options.status] - File status (default: 'uploaded')
 * @returns {Promise<Object>} - File creation result
 */
async function createFile(options) {
  try {
    logger.info(`Creating file: ${options.name}`, {
      companyId: options.companyId,
      userId: options.userId,
      fileType: options.type,
      fileSize: options.content ? Buffer.from(options.content).length : 0
    });
    
    const result = await db.insert(files)
      .values({
        name: options.name,
        path: options.content,
        type: options.type,
        status: options.status || 'uploaded',
        company_id: options.companyId,
        user_id: options.userId,
        created_at: new Date(),
        updated_at: new Date(),
        size: options.content ? Buffer.from(options.content).length : 0,
        version: 1,
        metadata: options.metadata || {}
      })
      .returning({ id: files.id });
    
    if (!result || result.length === 0) {
      throw new Error('Failed to insert file');
    }
    
    const fileId = result[0].id;
    
    logger.info('File created successfully', {
      fileId,
      fileName: options.name,
      companyId: options.companyId
    });
    
    return {
      success: true,
      fileId,
      fileName: options.name
    };
  } catch (error) {
    logger.error('Error creating file', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      fileName: options.name,
      companyId: options.companyId
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Add a single demo file to the company's file vault
 * 
 * @param {number} companyId - Company ID
 * @param {string} filePath - Path to the file
 * @param {string} companyName - Company name to include in the file metadata
 * @returns {Promise<object>} - Result of the file creation
 */
async function addDemoFileToVault(companyId, filePath, companyName) {
  try {
    const fileContent = await readFileContent(filePath);
    const displayName = getDisplayNameFromPath(filePath);
    const fileName = `${displayName} - ${companyName}.csv`;
    
    logger.info(`[Demo File Vault] Adding file "${fileName}" to company ${companyId} (${companyName})`);
    
    // Use the createFile function to create the file
    const result = await createFile({
      name: fileName,
      content: fileContent,
      type: 'text/csv',
      userId: SYSTEM_USER_ID,
      companyId: companyId,
      metadata: {
        isDemo: true,
        sourceFile: filePath,
        createdAt: new Date().toISOString(),
        companyName: companyName
      },
      status: 'uploaded'
    });
    
    if (!result.success) {
      throw new Error(`Failed to create file: ${result.error}`);
    }
    
    logger.info(`[Demo File Vault] Successfully added "${fileName}" to file vault for company ${companyId}`, {
      fileId: result.fileId,
      fileName: result.fileName
    });
    
    return result;
  } catch (error) {
    logger.error(`[Demo File Vault] Error adding demo file to vault:`, {
      companyId,
      filePath,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Process a newly created company and apply demo-specific enhancements if needed
 * 
 * @param {Object} company - The newly created company object
 * @param {number} company.id - Company ID
 * @param {string} company.name - Company name
 * @param {boolean} company.is_demo - Whether this is a demo company
 * @returns {Promise<Object>} - Result of processing
 */
export async function processNewCompany(company) {
  // Verify this is a demo company before proceeding
  if (!company || !company.id) {
    logger.warn('[Demo Hooks] Invalid company object provided to processNewCompany');
    return { success: false, reason: 'Invalid company object' };
  }

  logger.info(`[Demo Hooks] Processing new company: ${company.name} (ID: ${company.id})`);
  
  try {
    // Check if this is a demo company
    const isDemoCompany = company.is_demo === true || await isCompanyDemo(company.id);
    
    if (!isDemoCompany) {
      logger.info(`[Demo Hooks] Company ${company.id} is not a demo company, skipping demo hooks`);
      return { success: true, skipped: true, reason: 'Not a demo company' };
    }
    
    logger.info(`[Demo Hooks] Applying demo enhancements for company ${company.id} (${company.name})`);
    
    // Enhancement 1: Populate file vault with sample files
    const fileVaultResult = await populateFileVault(company);
    
    // Add more demo enhancements here as needed
    
    return {
      success: true,
      company: { id: company.id, name: company.name },
      fileVault: fileVaultResult
    };
  } catch (error) {
    logger.error(`[Demo Hooks] Error applying demo enhancements for company ${company.id}:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Populate the file vault of a demo company with sample files
 * 
 * @param {Object} company - The company object
 * @returns {Promise<Object>} - Result of file vault population
 */
async function populateFileVault(company) {
  logger.info(`[Demo Hooks] Populating file vault for company ${company.id} (${company.name})`);
  
  try {
    // Check if company already has files
    const existingFiles = await db
      .select()
      .from(files)
      .where(eq(files.company_id, company.id));
      
    if (existingFiles.length > 0) {
      logger.info(`[Demo Hooks] Company ${company.id} already has ${existingFiles.length} files, skipping file vault population`);
      return {
        success: true,
        status: 'skipped',
        reason: 'Files already exist',
        fileCount: existingFiles.length
      };
    }
    
    // Add demo files to vault
    const results = [];
    
    for (const filePath of DEMO_FILE_PATHS) {
      const result = await addDemoFileToVault(company.id, filePath, company.name);
      results.push(result);
    }
    
    logger.info(`[Demo Hooks] Successfully populated file vault for company ${company.id}`, {
      companyName: company.name,
      fileCount: results.length,
      fileIds: results.map(r => r.fileId)
    });
    
    return {
      success: true,
      fileCount: results.length,
      companyName: company.name,
      results
    };
  } catch (error) {
    logger.error(`[Demo Hooks] Error populating file vault:`, {
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