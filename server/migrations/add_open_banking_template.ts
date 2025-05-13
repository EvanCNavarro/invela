/**
 * Migration: Add Open Banking Template
 * 
 * This script adds a task template for Open Banking surveys
 * to ensure the form system works correctly.
 */

import { db } from '@db';
import { componentConfigurations, taskTemplates } from '@db/schema';
import { eq } from 'drizzle-orm';

export async function addOpenBankingTemplate() {
  try {
    console.log('Starting Open Banking template migration...');
    
    // Check if Open Banking template already exists
    const existingTemplate = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.task_type, 'open_banking'))
      .limit(1);
    
    if (existingTemplate.length > 0) {
      console.log('Open Banking template already exists, using existing template');
      return { success: true, templateId: existingTemplate[0].id };
    }
    
    // Create a new Open Banking task template
    const [template] = await db.insert(taskTemplates)
      .values({
        name: 'Open Banking Survey Template',
        description: 'Template for Open Banking assessment surveys',
        task_type: 'open_banking',
        component_type: 'form',
        status: 'active',
      })
      .returning();
    
    const templateId = template.id;
    console.log(`Created Open Banking template with ID: ${templateId}`);
    
    // Add global configurations for Open Banking
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: templateId,
          config_key: 'enableAiSuggestions',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: templateId,
          config_key: 'defaultFieldType',
          config_value: 'textarea',
          scope: 'global',
        },
        {
          template_id: templateId,
          config_key: 'enableRiskAnalysis',
          config_value: true,
          scope: 'global',
        },
      ]);
    
    // Add section configurations for Open Banking
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: templateId,
          config_key: 'sectionTitle',
          config_value: 'Functionality',
          scope: 'section',
          scope_target: 'functionality',
        },
        {
          template_id: templateId,
          config_key: 'sectionDescription',
          config_value: 'API functionality and schema compliance',
          scope: 'section',
          scope_target: 'functionality',
        },
        {
          template_id: templateId,
          config_key: 'sectionTitle',
          config_value: 'Security',
          scope: 'section',
          scope_target: 'security',
        },
        {
          template_id: templateId,
          config_key: 'sectionDescription',
          config_value: 'API security and authentication mechanisms',
          scope: 'section',
          scope_target: 'security',
        },
      ]);
    
    console.log('Successfully added Open Banking template and configurations');
    return { success: true, templateId };
  } catch (error) {
    console.error('Error adding Open Banking template:', error);
    throw error;
  }
}

// In ESM, we need a different approach to detect if file is run directly
// This is handled by the run-open-banking-template-migration.ts script