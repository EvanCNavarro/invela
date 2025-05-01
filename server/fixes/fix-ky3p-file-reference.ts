/**
 * Fix KY3P File References in Task Metadata
 * 
 * This script fixes the issue where KY3P form submissions generate files
 * but those files are not displayed in the File Vault UI because the
 * fileId reference is stored in a non-standard format in the task metadata.
 * 
 * The problem: KY3P tasks store file references under 'ky3pFormFile' and 'securityFormFile'
 * instead of using the standard 'fileId' property that other form types use.
 */

import { db } from '@db';
import { tasks, files } from '@db/schema';
import { eq } from 'drizzle-orm';
import * as WebSocketService from '../services/websocket';

/**
 * Log with timestamp for better tracking
 */
function logWithTimestamp(message: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${message}`, data || '');
}

/**
 * Fix KY3P file references in task metadata
 * 
 * This function finds all submitted KY3P tasks that have a file reference
 * in the legacy format (ky3pFormFile or securityFormFile) but not in the
 * standard format (fileId), then updates them to add the standard fileId.
 */
export async function fixKy3pFileReferences() {
  logWithTimestamp('Starting KY3P file reference fix');
  
  try {
    // Find all submitted KY3P tasks
    const ky3pTasks = await db.query.tasks.findMany({
      where: eq(tasks.task_type, 'sp_ky3p_assessment'),
      orderBy: tasks.id
    });
    
    logWithTimestamp(`Found ${ky3pTasks.length} KY3P tasks`);
    
    // Track stats for reporting
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let noFileCount = 0;
    let errorCount = 0;
    
    // Process each task
    for (const task of ky3pTasks) {
      try {
        // Skip tasks that aren't submitted
        if (task.status !== 'submitted') {
          continue;
        }
        
        const metadata = task.metadata || {};
        const hasStandardFileId = !!metadata.fileId;
        const legacyFileId = metadata.ky3pFormFile || metadata.securityFormFile;
        
        // If task already has standard fileId, nothing to fix
        if (hasStandardFileId) {
          alreadyCorrectCount++;
          continue;
        }
        
        // If task has no file reference at all, log and skip
        if (!legacyFileId) {
          logWithTimestamp(`Task ${task.id} has no file reference`, {
            taskId: task.id,
            status: task.status,
            metadataKeys: Object.keys(metadata)
          });
          noFileCount++;
          continue;
        }
        
        // Check if the file actually exists
        const file = await db.query.files.findFirst({
          where: eq(files.id, legacyFileId)
        });
        
        if (!file) {
          logWithTimestamp(`File ${legacyFileId} referenced by task ${task.id} not found in database`, {
            taskId: task.id,
            fileId: legacyFileId,
            status: task.status
          });
          errorCount++;
          continue;
        }
        
        // Update the task metadata to add the standard fileId
        const updatedMetadata = {
          ...metadata,
          fileId: legacyFileId,
          fileName: file.name || `ky3p_assessment_${task.id}.csv`,
          fileGenerated: true,
          fileGeneratedAt: file.created_at?.toISOString() || new Date().toISOString()
        };
        
        // Update the task
        await db.update(tasks)
          .set({
            metadata: updatedMetadata
          })
          .where(eq(tasks.id, task.id));
        
        logWithTimestamp(`Fixed task ${task.id} - added standard fileId reference`, {
          taskId: task.id,
          fileId: legacyFileId,
          fileName: file.name
        });
        
        // Broadcast file vault update to notify clients
        try {
          logWithTimestamp(`Broadcasting file vault update for task ${task.id}`, {
            companyId: task.company_id,
            fileId: legacyFileId
          });
          
          // Broadcast the file addition - ensure company_id is not null
          if (task.company_id !== null && task.company_id !== undefined) {
            // Convert to number to satisfy TypeScript
            const companyId = Number(task.company_id);
            
            await WebSocketService.broadcast('file_vault_update', {
              companyId,
              fileId: legacyFileId,
              action: 'added'
            });
            
            // Also broadcast a generic refresh message to ensure all clients update
            setTimeout(async () => {
              await WebSocketService.broadcast('file_vault_update', {
                companyId,
                action: 'refresh'
              });
            }, 500);
          } else {
            logWithTimestamp(`Warning: Cannot broadcast for task ${task.id} - company_id is null`);
          }
        } catch (wsError) {
          logWithTimestamp(`Error broadcasting file vault update for task ${task.id}:`, wsError);
          // Continue even if broadcast fails
        }
        
        fixedCount++;
      } catch (taskError) {
        logWithTimestamp(`Error processing task ${task.id}:`, taskError);
        errorCount++;
      }
    }
    
    // Report results
    logWithTimestamp('KY3P file reference fix completed', {
      totalTasks: ky3pTasks.length,
      fixedCount,
      alreadyCorrectCount,
      noFileCount,
      errorCount
    });
    
    return {
      success: true,
      totalTasks: ky3pTasks.length,
      fixedCount,
      alreadyCorrectCount,
      noFileCount,
      errorCount
    };
  } catch (error) {
    logWithTimestamp('Error fixing KY3P file references:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// This script can be run directly or imported as a module
// For ESM compatibility, we don't use require.main check
// If you want to run this directly, call the exported function:
// import { fixKy3pFileReferences } from './fix-ky3p-file-reference.ts';
// fixKy3pFileReferences().then(console.log).catch(console.error);
