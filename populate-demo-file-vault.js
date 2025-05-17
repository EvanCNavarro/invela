/**
 * Demo File Vault Population Script
 * 
 * This script automatically adds standard demo files to a company's file vault
 * when a demo company is created. This enhances the demo experience by providing
 * sample files for users to interact with.
 * 
 * When a company is created with is_demo=true or with a name containing demo indicators,
 * this script will populate its file vault with standardized CSV files.
 */

// Import dependencies
const fs = require('fs');
const path = require('path');
const { db } = require('./db/index.js');
const { files, companies } = require('./db/schema.js');
const { eq } = require('drizzle-orm');
const FileCreationService = require('./server/services/fileCreation.js');
const { isCompanyDemo, isDemoCompanyName } = require('./server/utils/demo-helpers.js');
const { logger } = require('./server/utils/logger.js');

// Define constants
const DEMO_FILE_PATHS = [
  'attached_assets/1_SOC_2_Questions.csv',
  'attached_assets/2_ISO_27001_Questions.csv',
  'attached_assets/3_Penetration_Test_Questions.csv',
  'attached_assets/4_Business_Continuity_Plan_Questions.csv'
];

// Define a system user ID for file creation (typically an admin user)
const SYSTEM_USER_ID = 1;

/**
 * Read a file and return its contents
 * 
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - File contents as string
 */
async function readFileContent(filePath) {
  try {
    const resolvedPath = path.resolve(process.cwd(), filePath);
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
      resolvedPath: path.resolve(process.cwd(), filePath),
      currentDir: process.cwd(),
      exists: fs.existsSync(path.resolve(process.cwd(), filePath))
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
    
    // Use the FileCreationService to create the file
    const result = await FileCreationService.createFile({
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
 * Ensure the file vault tab is unlocked for a company
 * 
 * @param {number} companyId - Company ID
 * @returns {Promise<boolean>} - True if successful
 */
async function unlockFileVaultForCompany(companyId) {
  try {
    logger.info(`[Demo File Vault] Checking file vault status for company ${companyId}`);
    
    // Get current company data to check if file vault is already unlocked
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      logger.error(`[Demo File Vault] Company ${companyId} not found`);
      return false;
    }
    
    // Check if file vault is already unlocked
    const availableTabs = company.available_tabs || [];
    const fileVaultIsUnlocked = 
      Array.isArray(availableTabs) ? 
      availableTabs.includes('file-vault') : 
      String(availableTabs).includes('file-vault');
    
    if (fileVaultIsUnlocked) {
      logger.info(`[Demo File Vault] File vault already unlocked for company ${companyId}`);
      return true;
    }
    
    // Unlock file vault by adding it to available tabs
    logger.info(`[Demo File Vault] Unlocking file vault for company ${companyId}`);
    
    const updatedTabs = Array.isArray(availableTabs) ? 
      [...availableTabs, 'file-vault'] : 
      ['file-vault'];
    
    // Update company record
    const result = await db
      .update(companies)
      .set({ available_tabs: updatedTabs })
      .where(eq(companies.id, companyId));
      
    logger.info(`[Demo File Vault] File vault unlocked for company ${companyId}`, {
      result,
      updatedTabs
    });
    
    return true;
  } catch (error) {
    logger.error(`[Demo File Vault] Error unlocking file vault:`, {
      companyId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

/**
 * Populate a company's file vault with demo files
 * 
 * @param {number} companyId - Company ID
 * @returns {Promise<object>} - Result summary
 */
async function populateCompanyFileVault(companyId) {
  logger.info(`[Demo File Vault] Starting file vault population for company ${companyId}`);
  
  try {
    // Check if this is a demo company
    const isDemoCompany = await isCompanyDemo(companyId);
    
    if (!isDemoCompany) {
      logger.info(`[Demo File Vault] Company ${companyId} is not a demo company, skipping file vault population`);
      return {
        success: false,
        reason: 'Not a demo company'
      };
    }
    
    // Get company name
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId));
      
    if (!company) {
      throw new Error(`Company ${companyId} not found`);
    }
    
    const companyName = company.name;
    
    // Ensure file vault is unlocked
    await unlockFileVaultForCompany(companyId);
    
    // Check if company already has files
    const existingFiles = await db
      .select()
      .from(files)
      .where(eq(files.company_id, companyId));
      
    if (existingFiles.length > 0) {
      logger.info(`[Demo File Vault] Company ${companyId} already has ${existingFiles.length} files, skipping file vault population`);
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
      const result = await addDemoFileToVault(companyId, filePath, companyName);
      results.push(result);
    }
    
    logger.info(`[Demo File Vault] Successfully populated file vault for company ${companyId}`, {
      companyName,
      fileCount: results.length,
      fileIds: results.map(r => r.fileId)
    });
    
    return {
      success: true,
      fileCount: results.length,
      companyName,
      results
    };
  } catch (error) {
    logger.error(`[Demo File Vault] Error populating file vault:`, {
      companyId,
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
 * Check and populate file vaults for all demo companies
 * 
 * @returns {Promise<object>} - Result summary
 */
async function populateAllDemoCompanyFileVaults() {
  logger.info(`[Demo File Vault] Checking all demo companies for file vault population`);
  
  try {
    // Get all companies with is_demo=true
    const demoCompanies = await db
      .select()
      .from(companies)
      .where(eq(companies.is_demo, true));
      
    logger.info(`[Demo File Vault] Found ${demoCompanies.length} companies with is_demo=true`);
    
    // Get all companies with demo in the name
    const allCompanies = await db
      .select()
      .from(companies);
      
    const additionalDemoCompanies = allCompanies.filter(
      company => !company.is_demo && isDemoCompanyName(company.name)
    );
    
    logger.info(`[Demo File Vault] Found ${additionalDemoCompanies.length} additional companies with demo names`);
    
    // Combine all demo companies, removing duplicates
    const allDemoCompanies = [
      ...demoCompanies,
      ...additionalDemoCompanies
    ];
    
    // Remove duplicates by ID
    const uniqueDemoCompanies = Array.from(
      new Map(allDemoCompanies.map(c => [c.id, c])).values()
    );
    
    logger.info(`[Demo File Vault] Processing ${uniqueDemoCompanies.length} total demo companies`);
    
    // Populate file vaults for all demo companies
    const results = [];
    
    for (const company of uniqueDemoCompanies) {
      const result = await populateCompanyFileVault(company.id);
      results.push({
        companyId: company.id,
        companyName: company.name,
        ...result
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    
    logger.info(`[Demo File Vault] Completed population of ${successCount}/${results.length} demo company file vaults`);
    
    return {
      success: true,
      totalCompanies: uniqueDemoCompanies.length,
      successfulPopulations: successCount,
      results
    };
  } catch (error) {
    logger.error(`[Demo File Vault] Error in batch population:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export functions for use in other modules
module.exports = {
  populateCompanyFileVault,
  populateAllDemoCompanyFileVaults,
  unlockFileVaultForCompany
};

// If this script is run directly, populate all demo companies
if (require.main === module) {
  logger.info('[Demo File Vault] Running as standalone script to populate all demo company file vaults');
  populateAllDemoCompanyFileVaults()
    .then(result => {
      logger.info('[Demo File Vault] Script execution complete', { result });
      process.exit(0);
    })
    .catch(error => {
      logger.error('[Demo File Vault] Script execution failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      process.exit(1);
    });
}