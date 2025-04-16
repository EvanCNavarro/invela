/**
 * Form debugging utilities to trace KYB form data issues
 */

import { tasks, kybFields, kybResponses } from '@db/schema';
import { db } from '@db';
import { eq } from 'drizzle-orm';

export class FormDebugger {
  /**
   * Log detailed information about responses for a task
   */
  static async logTaskResponses(taskId: number): Promise<void> {
    console.log('===============================================');
    console.log(`[FORM DEBUG] TASK RESPONSES ANALYSIS FOR TASK ID: ${taskId}`);
    console.log('===============================================');
    
    try {
      // Get task data
      const [task] = await db.select()
        .from(tasks)
        .where(eq(tasks.id, taskId));

      if (!task) {
        console.log(`[FORM DEBUG] ❌ Task not found: ${taskId}`);
        return;
      }

      console.log(`[FORM DEBUG] ✅ Task found: ${taskId}`);
      console.log(`[FORM DEBUG] Task status: ${task.status}`);
      console.log(`[FORM DEBUG] Task progress: ${task.progress}%`);
      console.log(`[FORM DEBUG] Created: ${task.created_at}`);
      console.log(`[FORM DEBUG] Updated: ${task.updated_at}`);
      
      // Get all KYB responses for this task with their field information
      const responses = await db.select({
        id: kybResponses.id,
        response_value: kybResponses.response_value,
        field_id: kybResponses.field_id,
        field_key: kybFields.field_key,
        status: kybResponses.status,
        updated_at: kybResponses.updated_at,
        version: kybResponses.version
      })
        .from(kybResponses)
        .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
        .where(eq(kybResponses.task_id, taskId));
      
      console.log(`[FORM DEBUG] Found ${responses.length} responses for task ${taskId}`);
      
      // Check for problematic fields
      const keysOfInterest = ['corporateRegistration', 'goodStanding', 'regulatoryActions', 'investigationsIncidents'];
      const interestingResponses = responses.filter(r => keysOfInterest.includes(r.field_key));
      
      console.log(`[FORM DEBUG] Monitoring key fields:`);
      keysOfInterest.forEach(key => {
        const found = interestingResponses.find(r => r.field_key === key);
        if (found) {
          console.log(`[FORM DEBUG] - ${key}: "${found.response_value}" (${found.status}, v${found.version}, updated: ${found.updated_at})`);
        } else {
          console.log(`[FORM DEBUG] - ${key}: NOT FOUND`);
        }
      });

      // Check for any "asdf" test values
      const asdfResponses = responses.filter(r => r.response_value === 'asdf');
      if (asdfResponses.length > 0) {
        console.log(`[FORM DEBUG] ⚠️ WARNING: Found ${asdfResponses.length} responses with value "asdf":`);
        asdfResponses.forEach(r => {
          console.log(`[FORM DEBUG] - Field ${r.field_key} has value "asdf", last updated: ${r.updated_at}, version: ${r.version}`);
        });
      }
      
      // Count response statuses
      const statusCounts = responses.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(`[FORM DEBUG] Response status distribution:`);
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`[FORM DEBUG] - ${status}: ${count} fields`);
      });
      
      // Check update timestamps
      if (responses.length > 0) {
        const sortedByUpdate = [...responses].sort((a, b) => {
          if (!a.updated_at) return 1;
          if (!b.updated_at) return -1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
        
        console.log(`[FORM DEBUG] Most recently updated responses:`);
        sortedByUpdate.slice(0, 5).forEach(r => {
          console.log(`[FORM DEBUG] - ${r.field_key}: "${r.response_value}" (updated: ${r.updated_at})`);
        });
      }
    } catch (error) {
      console.error(`[FORM DEBUG] Error analyzing task responses:`, error);
    }
    
    console.log('===============================================');
  }
  
  /**
   * Log form differences between two states
   */
  static logFormDifferences(
    taskId: number, 
    sourceName: string, 
    targetName: string, 
    sourceData: Record<string, any>, 
    targetData: Record<string, any>
  ): void {
    console.log('===============================================');
    console.log(`[FORM DEBUG] FORM DATA DIFFERENCE ANALYSIS FOR TASK ${taskId}`);
    console.log(`[FORM DEBUG] Comparing ${sourceName} vs ${targetName}`);
    console.log('===============================================');
    
    const sourceKeys = Object.keys(sourceData);
    const targetKeys = Object.keys(targetData);
    
    console.log(`[FORM DEBUG] ${sourceName} has ${sourceKeys.length} fields`);
    console.log(`[FORM DEBUG] ${targetName} has ${targetKeys.length} fields`);
    
    // Fields in source but not in target
    const missingInTarget = sourceKeys.filter(key => !targetKeys.includes(key));
    if (missingInTarget.length > 0) {
      console.log(`[FORM DEBUG] Fields in ${sourceName} but missing in ${targetName}: ${missingInTarget.length}`);
      missingInTarget.forEach(key => {
        console.log(`[FORM DEBUG] - ${key}: "${sourceData[key]}" (${typeof sourceData[key]})`);
      });
    }
    
    // Fields in target but not in source
    const missingInSource = targetKeys.filter(key => !sourceKeys.includes(key));
    if (missingInSource.length > 0) {
      console.log(`[FORM DEBUG] Fields in ${targetName} but missing in ${sourceName}: ${missingInSource.length}`);
      missingInSource.forEach(key => {
        console.log(`[FORM DEBUG] - ${key}: "${targetData[key]}" (${typeof targetData[key]})`);
      });
    }
    
    // Fields with different values
    const commonKeys = sourceKeys.filter(key => targetKeys.includes(key));
    const differences = commonKeys.filter(key => sourceData[key] !== targetData[key]);
    
    if (differences.length > 0) {
      console.log(`[FORM DEBUG] Fields with different values: ${differences.length}`);
      differences.forEach(key => {
        console.log(`[FORM DEBUG] - ${key}:`);
        console.log(`[FORM DEBUG]   ${sourceName}: "${sourceData[key]}" (${typeof sourceData[key]})`);
        console.log(`[FORM DEBUG]   ${targetName}: "${targetData[key]}" (${typeof targetData[key]})`);
      });
    } else {
      console.log(`[FORM DEBUG] All common fields have identical values`);
    }
    
    // Check specific fields of interest
    const keysOfInterest = ['corporateRegistration', 'goodStanding', 'regulatoryActions', 'investigationsIncidents'];
    console.log(`[FORM DEBUG] Status of key fields:`);
    keysOfInterest.forEach(key => {
      const inSource = key in sourceData;
      const inTarget = key in targetData;
      const sourceValue = sourceData[key];
      const targetValue = targetData[key];
      
      console.log(`[FORM DEBUG] - ${key}:`);
      console.log(`[FORM DEBUG]   ${sourceName}: ${inSource ? `"${sourceValue}"` : 'NOT PRESENT'}`);
      console.log(`[FORM DEBUG]   ${targetName}: ${inTarget ? `"${targetValue}"` : 'NOT PRESENT'}`);
      console.log(`[FORM DEBUG]   Match: ${inSource && inTarget && sourceValue === targetValue ? 'YES' : 'NO'}`);
    });
    
    console.log('===============================================');
  }
}

// Export utility functions for easier use
export const logTaskResponses = FormDebugger.logTaskResponses;
export const logFormDifferences = FormDebugger.logFormDifferences;