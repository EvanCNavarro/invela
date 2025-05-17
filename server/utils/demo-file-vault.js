/**
 * Demo File Vault Population Utility
 * 
 * This utility directly populates a company's file vault with standard demo files
 * when a demo company is created. It uses absolute paths to ensure reliable file access.
 */

import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

// Directly use database connection without importing schema
// This avoids TypeScript import issues in ESM
const { Pool } = pg;

/**
 * Get a database client
 * 
 * @returns {Promise<import('pg').PoolClient>} Database client
 */
async function getDbClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  return await pool.connect();
}

/**
 * Check if company already has files in its vault
 * 
 * @param {number} companyId - The company ID
 * @returns {Promise<number>} - Number of existing files
 */
async function getExistingFileCount(companyId) {
  let client;
  try {
    client = await getDbClient();
    const query = 'SELECT COUNT(*) FROM files WHERE company_id = $1';
    const result = await client.query(query, [companyId]);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('[Demo File Vault] Error checking existing files:', error);
    return 0;
  } finally {
    if (client) client.release();
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
    const filePath = path.join(process.cwd(), 'attached_assets', fileName);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent;
  } catch (error) {
    console.error(`[Demo File Vault] Error reading demo file ${fileName}:`, error);
    throw new Error(`Failed to read demo file ${fileName}`);
  }
}

/**
 * Get display name from CSV filename
 * 
 * @param {string} fileName - CSV filename
 * @returns {string} - Formatted display name
 */
function getDisplayNameFromFilename(fileName) {
  // Remove file extension and any leading numbers/underscores
  const baseName = fileName.replace(/^\d+_/, '').replace(/\.csv$/, '');
  
  // Replace underscores with spaces and title case
  return baseName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
  let client;
  try {
    client = await getDbClient();
    
    // Get file content (we'll store file info in metadata since there's no content column)
    const fileContent = await readDemoFile(fileName);
    
    // Create file record in database using direct SQL
    const displayName = getDisplayNameFromFilename(fileName);
    const metadata = JSON.stringify({
      source: 'demo_autofill',
      created_for: companyName,
      created_at: new Date().toISOString(),
      file_name: fileName,
      file_source: 'attached_assets'
    });
    
    const insertQuery = `
      INSERT INTO files (
        name, company_id, user_id, type, 
        size, path, status, metadata, created_at, updated_at
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, name, type
    `;
    
    const values = [
      displayName,
      companyId,
      8,  // Use existing user ID from Evan Navarro
      'csv',
      fileContent.length,
      `demo-files/${fileName}`,
      'active',
      metadata
    ];
    
    const result = await client.query(insertQuery, values);
    const fileRecord = result.rows[0];
      
    console.log(`[Demo File Vault] Added demo file: ${displayName} for company ${companyId}`);
    return {
      id: fileRecord.id,
      name: fileRecord.name,
      type: fileRecord.type,
      success: true
    };
  } catch (error) {
    console.error(`[Demo File Vault] Error adding demo file ${fileName}:`, error);
    return {
      fileName,
      success: false,
      error: error.message
    };
  } finally {
    if (client) client.release();
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
async function populateDemoFileVault(company) {
  if (!company || !company.id) {
    console.error('[Demo File Vault] Invalid company provided:', company);
    return { success: false, error: 'Invalid company' };
  }
  
  try {
    console.log(`[Demo File Vault] Starting file vault population for company ${company.id} (${company.name})`);
    
    // Check if files already exist
    const existingCount = await getExistingFileCount(company.id);
    if (existingCount > 0) {
      console.log(`[Demo File Vault] Company ${company.id} already has ${existingCount} files. Skipping population.`);
      return { success: true, fileCount: existingCount, alreadyPopulated: true };
    }
    
    // List of demo files to add
    const demoFiles = [
      '1_SOC_2_Questions.csv',
      '2_ISO_27001_Questions.csv',
      '3_Penetration_Test_Questions.csv', 
      '4_Business_Continuity_Plan_Questions.csv'
    ];
    
    // Add each demo file
    const results = [];
    for (const fileName of demoFiles) {
      try {
        const result = await addDemoFile(company.id, company.name, fileName);
        results.push(result);
      } catch (fileError) {
        console.error(`[Demo File Vault] Error adding file ${fileName}:`, fileError);
        results.push({ fileName, success: false, error: fileError.message });
      }
    }
    
    // Count successful files
    const successCount = results.filter(r => r.success).length;
    
    console.log(`[Demo File Vault] Completed population for company ${company.id}: ${successCount}/${demoFiles.length} files added`);
    return {
      success: successCount > 0,
      fileCount: successCount,
      totalAttempted: demoFiles.length,
      results
    };
  } catch (error) {
    console.error(`[Demo File Vault] Error populating file vault for company ${company.id}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export the functionality
export { populateDemoFileVault };