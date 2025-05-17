/**
 * Demo File Vault Population Utility
 * 
 * This utility directly populates a company's file vault with standard demo files
 * when a demo company is created. It uses standardized path handling to ensure
 * files are both stored on disk properly and accessible through the application's
 * file viewing mechanisms.
 * 
 * The utility follows these conventions:
 * 1. Physical files are stored at: uploads/documents/demo-files/[filename]
 * 2. Database paths are stored as: demo-files/[filename] 
 *    (relative to uploads/documents - this matches app's file access patterns)
 * 3. File download handlers will prepend 'uploads/documents/' to the DB path
 */

import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

// Directly use database connection without importing schema
// This avoids TypeScript import issues in ESM
const { Pool } = pg;

// Module-level logger prefix for consistent logging
const LOG_PREFIX = '[Demo File Vault]';

/**
 * Standardized logging function
 * 
 * @param {string} message - Log message
 * @param {string} level - Log level (info, error, warn)
 * @param {Object} [data] - Optional data to log
 */
function log(message, level = 'info', data) {
  const timestamp = new Date().toISOString();
  
  switch (level) {
    case 'error':
      console.error(`${LOG_PREFIX} [${timestamp}] ${message}`, data || '');
      break;
    case 'warn':
      console.warn(`${LOG_PREFIX} [${timestamp}] ${message}`, data || '');
      break;
    default:
      console.log(`${LOG_PREFIX} [${timestamp}] ${message}`, data || '');
  }
}

/**
 * Get a database client
 * 
 * @returns {Promise<import('pg').PoolClient>} Database client
 */
async function getDbClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  log('Creating new database connection');
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
    const count = parseInt(result.rows[0].count) || 0;
    
    log(`Found ${count} existing files for company ${companyId}`);
    return count;
  } catch (error) {
    log(`Error checking existing files for company ${companyId}`, 'error', error);
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
    log(`Reading demo file from: ${filePath}`);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    log(`Successfully read file: ${fileName} (${fileContent.length} bytes)`);
    return fileContent;
  } catch (error) {
    log(`Error reading demo file ${fileName}`, 'error', error);
    throw new Error(`Failed to read demo file ${fileName}: ${error.message}`);
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
    
    // Get file content from attached_assets
    const fileContent = await readDemoFile(fileName);
    
    // Generate a unique filename with timestamp to avoid collisions
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const uniqueFileName = `demo_${companyId}_${timestamp}_${fileName}`;
    
    log(`Adding file '${fileName}' for company ${companyId} as '${uniqueFileName}'`);
    
    // Create directory for storing demo files if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const documentsDir = path.join(uploadsDir, 'documents');
    const demoFilesDir = path.join(documentsDir, 'demo-files');
    
    try {
      // Ensure uploads directory exists
      await fs.mkdir(uploadsDir, { recursive: true });
      log(`Ensured uploads directory exists: ${uploadsDir}`);
      
      // Ensure documents directory exists
      await fs.mkdir(documentsDir, { recursive: true });
      log(`Ensured documents directory exists: ${documentsDir}`);
      
      // Ensure demo-files directory exists
      await fs.mkdir(demoFilesDir, { recursive: true });
      log(`Ensured demo-files directory exists: ${demoFilesDir}`);
    } catch (dirError) {
      log(`Error creating directories`, 'error', dirError);
      // Continue execution even if directory creation fails
      // It might already exist or have different permissions
    }
    
    // Save file to disk - using the correct paths pattern
    // Store the file in uploads/documents/demo-files/
    const filePath = path.join(demoFilesDir, uniqueFileName);
    
    // But in the DB, only store the path RELATIVE to uploads/documents/
    // This follows the application's convention where 
    // DB path = relative path that will be joined with uploads/documents/
    // when file is accessed
    const relativePath = path.join('demo-files', uniqueFileName);
    
    try {
      await fs.writeFile(filePath, fileContent, 'utf-8');
      
      // Check if file was written correctly
      const stats = await fs.stat(filePath);
      log(`File written to disk: ${filePath} (${stats.size} bytes)`);
      log(`Relative path stored in DB: ${relativePath}`);
      
      // Debug path info
      log(`Full path debug info: File will be stored at: ${filePath}`);
      log(`Full path debug info: File will be accessed via: ${path.join(process.cwd(), 'uploads', 'documents', relativePath)}`);
    } catch (writeError) {
      log(`Error writing file to disk`, 'error', writeError);
      throw new Error(`Failed to write file to disk: ${writeError.message}`);
    }
    
    // Create file record in database using direct SQL
    const displayName = getDisplayNameFromFilename(fileName);
    const metadata = JSON.stringify({
      source: 'demo_autofill',
      created_for: companyName,
      created_at: new Date().toISOString(),
      file_name: fileName,
      file_source: 'attached_assets',
      original_file: fileName
    });
    
    log(`Creating database record for file: ${displayName}`);
    
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
      relativePath,  // Store the relative path (without uploads/documents prefix)
      'active',
      metadata
    ];
    
    log(`Executing SQL query with values: ${JSON.stringify({
      name: displayName,
      company_id: companyId,
      type: 'csv',
      size: fileContent.length,
      path: relativePath,
      status: 'active'
    })}`);
    
    const result = await client.query(insertQuery, values);
    const fileRecord = result.rows[0];
      
    log(`Added demo file: ${displayName} for company ${companyId} (ID: ${fileRecord.id})`);
    return {
      id: fileRecord.id,
      name: fileRecord.name,
      type: fileRecord.type,
      path: relativePath,
      success: true
    };
  } catch (error) {
    log(`Error adding demo file ${fileName}`, 'error', error);
    return {
      fileName,
      success: false,
      error: error.message
    };
  } finally {
    if (client) {
      log(`Releasing database connection`);
      client.release();
    }
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
    log(`Invalid company provided`, 'error', company);
    return { success: false, error: 'Invalid company' };
  }
  
  try {
    log(`Starting file vault population for company ${company.id} (${company.name})`);
    
    // Check if files already exist
    const existingCount = await getExistingFileCount(company.id);
    if (existingCount > 0) {
      log(`Company ${company.id} already has ${existingCount} files. Skipping population.`);
      return { success: true, fileCount: existingCount, alreadyPopulated: true };
    }
    
    // List of demo files to add
    const demoFiles = [
      '1_SOC_2_Questions.csv',
      '2_ISO_27001_Questions.csv',
      '3_Penetration_Test_Questions.csv', 
      '4_Business_Continuity_Plan_Questions.csv'
    ];
    
    log(`Will attempt to add ${demoFiles.length} files to company ${company.id}`);
    
    // Add each demo file
    const results = [];
    for (const fileName of demoFiles) {
      try {
        log(`Processing file ${fileName} for company ${company.id}...`);
        const result = await addDemoFile(company.id, company.name, fileName);
        results.push(result);
        
        if (result.success) {
          log(`Successfully added file ${fileName} (ID: ${result.id})`);
        } else {
          log(`Failed to add file ${fileName}: ${result.error || 'Unknown error'}`, 'error');
        }
      } catch (fileError) {
        log(`Error adding file ${fileName}`, 'error', fileError);
        results.push({ fileName, success: false, error: fileError.message });
      }
    }
    
    // Count successful files
    const successCount = results.filter(r => r.success).length;
    
    // Log file information for verification
    log(`Completed population for company ${company.id}: ${successCount}/${demoFiles.length} files added`);
    
    // Log details about each file for easier debugging
    if (successCount > 0) {
      log(`Successfully added files:`);
      results.filter(r => r.success).forEach(file => {
        log(`  - ${file.name} (ID: ${file.id}, Type: ${file.type}, Path: ${file.path || 'N/A'}`);
      });
    }
    
    if (successCount < demoFiles.length) {
      log(`Failed to add ${demoFiles.length - successCount} files:`, 'warn');
      results.filter(r => !r.success).forEach(file => {
        log(`  - ${file.fileName || 'Unknown file'}: ${file.error || 'Unknown error'}`, 'warn');
      });
    }
    
    return {
      success: successCount > 0,
      fileCount: successCount,
      totalAttempted: demoFiles.length,
      results
    };
  } catch (error) {
    log(`Error populating file vault for company ${company.id}`, 'error', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export the functionality
export { populateDemoFileVault };