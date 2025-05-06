/**
 * Form Output Generator
 * 
 * This utility creates standardized output files for different form types.
 * It handles the conversion of form data to JSON/CSV files and storage in the
 * file system/database.
 */

import { sql } from 'drizzle-orm';
import { db } from '@db';
import { files } from '@db/schema';
import { logger } from './logger';

const fileLogger = logger.child({ module: 'FormOutputGenerator' });

interface FormOutputOptions {
  taskId: number;
  taskType: string;
  formData: Record<string, any>;
  companyId: number;
  transaction?: any; // Drizzle transaction
}

/**
 * Create a standardized form output file
 * 
 * @param options Form output options
 * @returns ID of the created file
 */
export async function createFormOutputFile(options: FormOutputOptions): Promise<number> {
  const { taskId, taskType, formData, companyId, transaction } = options;
  
  // Use the transaction if provided, otherwise use the global db instance
  const dbContext = transaction || db;
  
  fileLogger.info(`Creating form output file for task ${taskId} (${taskType})`);
  
  try {
    // Generate the file content (formatted JSON)
    const fileContent = JSON.stringify(formData, null, 2);
    
    // Generate file metadata
    const fileName = `${taskType}_submission_${taskId}_${new Date().toISOString()}.json`;
    const fileType = 'application/json';
    const fileSize = Buffer.byteLength(fileContent, 'utf8');
    
    // Insert file record in database
    const fileInsertResult = await dbContext.execute(
      sql`INSERT INTO files (name, type, size, content, company_id, linked_task_id, status) 
          VALUES (${fileName}, ${fileType}, ${fileSize}, ${fileContent}, ${companyId}, ${taskId}, 'active')
          RETURNING id`
    );
    
    const fileId = fileInsertResult[0].id;
    fileLogger.info(`Created form output file with ID ${fileId}`);
    
    return fileId;
  } catch (error) {
    fileLogger.error(`Error creating form output file for task ${taskId}:`, error);
    throw new Error(`Failed to create form output file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create a versioned copy of an existing form output file
 * 
 * @param fileId Original file ID
 * @param formData Updated form data
 * @returns ID of the new versioned file
 */
export async function createVersionedFormFile(fileId: number, formData: Record<string, any>): Promise<number> {
  fileLogger.info(`Creating versioned copy of file ${fileId}`);
  
  try {
    // Get the original file
    const originalFile = await db.query.files.findFirst({
      where: sql`id = ${fileId}`,
    });
    
    if (!originalFile) {
      throw new Error(`Original file with ID ${fileId} not found`);
    }
    
    // Generate new file content
    const fileContent = JSON.stringify(formData, null, 2);
    
    // Generate version number
    const versionMatch = originalFile.name.match(/v(\d+)/);
    const currentVersion = versionMatch ? parseInt(versionMatch[1], 10) : 0;
    const newVersion = currentVersion + 1;
    
    // Generate new file name with version
    const baseFileName = originalFile.name.replace(/_v\d+\.json$/, '');
    const fileName = `${baseFileName}_v${newVersion}.json`;
    
    // Insert new versioned file
    const fileInsertResult = await db.execute(
      sql`INSERT INTO files (name, type, size, content, company_id, linked_task_id, status, version, previous_version_id) 
          VALUES (${fileName}, ${originalFile.type}, ${Buffer.byteLength(fileContent, 'utf8')}, ${fileContent}, 
                 ${originalFile.company_id}, ${originalFile.linked_task_id}, 'active', ${newVersion}, ${fileId})
          RETURNING id`
    );
    
    const newFileId = fileInsertResult[0].id;
    fileLogger.info(`Created versioned file with ID ${newFileId} (version ${newVersion})`);
    
    return newFileId;
  } catch (error) {
    fileLogger.error(`Error creating versioned file for file ${fileId}:`, error);
    throw new Error(`Failed to create versioned file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
