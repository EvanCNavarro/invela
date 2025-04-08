import { db } from "@db";
import { tasks, taskTemplates, componentConfigurations } from "@db/schema";
import { eq, sql, and } from "drizzle-orm";

/**
 * Consolidate KYB tasks to use a consistent task_type
 */
export async function up() {
  console.log('[Migration] Starting KYB task type consolidation...');
  
  try {
    // 1. Check for tasks with old task_type
    const oldTasksCount = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(eq(tasks.task_type, 'company_onboarding_KYB'));
    
    const tasksToUpdate = oldTasksCount[0]?.count || 0;
    console.log(`[Migration] Found ${tasksToUpdate} tasks with old 'company_onboarding_KYB' task type`);
    
    if (tasksToUpdate > 0) {
      // 2. Update all existing tasks to use the new task_type
      await db.update(tasks)
        .set({
          task_type: 'company_kyb',
          updated_at: new Date()
        })
        .where(eq(tasks.task_type, 'company_onboarding_KYB'));
      
      console.log(`[Migration] Updated ${tasksToUpdate} tasks from 'company_onboarding_KYB' to 'company_kyb'`);
    } else {
      console.log('[Migration] No tasks found with old task_type, skipping update');
    }
    
    // 3. Check for duplicate task templates
    const oldTemplate = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.task_type, 'company_onboarding_KYB'));
    
    if (oldTemplate.length > 0) {
      const oldTemplateId = oldTemplate[0].id;
      console.log(`[Migration] Found old task template (id: ${oldTemplateId}) with task_type 'company_onboarding_KYB'`);
      
      // 4. Retrieve component configurations for the old template
      const oldConfigs = await db.select()
        .from(componentConfigurations)
        .where(eq(componentConfigurations.template_id, oldTemplateId));
      
      console.log(`[Migration] Found ${oldConfigs.length} component configurations for old template`);
      
      // 5. Get the new template
      const newTemplate = await db.select()
        .from(taskTemplates)
        .where(eq(taskTemplates.task_type, 'company_kyb'));
      
      if (newTemplate.length > 0) {
        const newTemplateId = newTemplate[0].id;
        console.log(`[Migration] Found new KYB template (id: ${newTemplateId}) with task_type 'company_kyb'`);
        
        // 6. Check for each component configuration if we need to add it to the new template
        for (const config of oldConfigs) {
          // Check if new template already has this configuration
          const existingConfig = await db.select()
            .from(componentConfigurations)
            .where(
              and(
                eq(componentConfigurations.template_id, newTemplateId),
                eq(componentConfigurations.config_key, config.config_key)
              )
            );
          
          if (existingConfig.length === 0) {
            // Add this configuration to the new template
            await db.insert(componentConfigurations)
              .values({
                template_id: newTemplateId,
                config_key: config.config_key,
                config_value: config.config_value,
                scope: config.scope,
                scope_target: config.scope_target,
                created_at: new Date(),
                updated_at: new Date()
              });
            console.log(`[Migration] Added configuration '${config.config_key}' to new template`);
          } else {
            console.log(`[Migration] Configuration '${config.config_key}' already exists on new template, skipping`);
          }
        }
        
        // 7. Delete the old component configurations
        await db.delete(componentConfigurations)
          .where(eq(componentConfigurations.template_id, oldTemplateId));
        console.log(`[Migration] Deleted old component configurations`);
        
        // 8. Delete the old template
        await db.delete(taskTemplates)
          .where(eq(taskTemplates.id, oldTemplateId));
        console.log(`[Migration] Deleted old task template`);
      } else {
        // If the new template doesn't exist, rename the old one
        await db.update(taskTemplates)
          .set({
            task_type: 'company_kyb',
            updated_at: new Date()
          })
          .where(eq(taskTemplates.id, oldTemplateId));
        console.log(`[Migration] Renamed old task template to use 'company_kyb'`);
      }
    } else {
      console.log('[Migration] No old task template found, skipping template consolidation');
    }
    
    console.log('[Migration] KYB task type consolidation completed successfully');
  } catch (error) {
    console.error('[Migration] Error during KYB task type consolidation:', error);
    throw error;
  }
}

/**
 * Revert changes (not fully implemented as this would be complex to revert)
 */
export async function down() {
  console.log('[Migration] This migration cannot be fully reverted automatically');
  // Would need to recreate the original template and restore task types
}