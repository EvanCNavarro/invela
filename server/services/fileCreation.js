/**
 * File Creation Service
 * 
 * This module provides functions for creating files.
 * It's a JavaScript-compatible version of the TypeScript service.
 */

const { db } = require('../../db/index.js');
const { files } = require('../../db/schema.js');
const { logger } = require('../utils/logger.js');

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
    
    // Log the file creation attempt
    console.log(`[FileCreation] Creating file for company ${options.companyId} by user ${options.userId}`, {
      fileName: options.name,
      fileType: options.type,
      fileSize: options.content ? Buffer.from(options.content).length : 0,
      timestamp: new Date().toISOString()
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

module.exports = {
  createFile
};