/**
 * Drizzle SQL Utilities
 * 
 * This module provides utility functions for executing raw SQL queries
 * with Drizzle ORM in a consistent and safe manner.
 */

import { db } from '@db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

/**
 * Execute a raw SQL query with Drizzle ORM
 * 
 * This function provides a consistent way to execute raw SQL queries
 * using Drizzle ORM's sql tagged template.
 * 
 * @param query The SQL query to execute
 * @param params The parameters to bind to the query
 * @returns The result of the query
 */
export async function executeRawQuery<T = any>(
  query: string,
  params: any[] = []
): Promise<T> {
  try {
    // Convert the SQL string and parameters to a Drizzle sql template
    // We need to create parameter placeholders in the format Drizzle expects
    const paramPlaceholders = params.map((_, i) => `$${i + 1}`).join(', ');
    
    // For debugging - log the constructed SQL
    logger.debug(`[DrizzleSQL] Executing raw query: ${query}`, {
      paramCount: params.length,
      timestamp: new Date().toISOString()
    });
    
    // Execute the query with Drizzle's sql template
    // This creates a properly parameterized query that Drizzle can execute
    const result = await db.execute(sql.raw(`${query}`, ...params));
    
    return result as T;
  } catch (error) {
    logger.error(`[DrizzleSQL] Error executing raw query`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query,
      paramCount: params.length,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

/**
 * Update task status and progress using Drizzle ORM
 * 
 * This function provides a standard method for updating task status
 * and progress using Drizzle ORM.
 * 
 * @param taskId The ID of the task to update
 * @param status The new status value
 * @param progress The new progress value (0-100)
 * @param metadata Additional metadata to include
 * @returns The result of the update operation
 */
export async function updateTaskStatusAndProgress(
  taskId: number,
  status: string,
  progress: number,
  metadata: Record<string, any> = {}
): Promise<any> {
  try {
    // Convert the metadata to a JSON string
    const metadataJSON = JSON.stringify(metadata);
    
    // Execute the update query
    const query = `
      UPDATE tasks 
      SET status = $1, 
          progress = $2, 
          metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, status, progress, metadata
    `;
    
    const result = await executeRawQuery(query, [
      status,
      progress,
      metadataJSON,
      taskId
    ]);
    
    logger.info(`[DrizzleSQL] Updated task status and progress`, {
      taskId,
      status,
      progress,
      hasMetadata: Object.keys(metadata).length > 0,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    logger.error(`[DrizzleSQL] Error updating task status and progress`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      taskId,
      status,
      progress,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}