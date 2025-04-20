import { db } from '@db';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { taskTemplates, componentConfigurations } from '@db/schema';

/**
 * Creates KY3P task template and adds initial configurations
 */
export async function addKy3pTemplate() {
  try {
    console.log('Adding S&P KY3P Security Assessment task template...');

    // Check if KY3P template already exists
    const existingKy3pTemplate = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.task_type, 'sp_ky3p_assessment'))
      .limit(1);
    
    if (existingKy3pTemplate.length > 0) {
      console.log('KY3P template already exists, using existing template');
      return { success: true, templateId: existingKy3pTemplate[0].id };
    }
    
    // Create a new KY3P task template
    const [ky3pTemplate] = await db.insert(taskTemplates)
      .values({
        name: 'S&P KY3P Security Assessment',
        description: 'S&P KY3P Security Assessment form for third-party risk evaluation',
        task_type: 'sp_ky3p_assessment',
        component_type: 'form',
        status: 'active',
      })
      .returning();
    
    const ky3pTemplateId = ky3pTemplate.id;
    console.log(`Created KY3P template with ID: ${ky3pTemplateId}`);
    
    // Add global configurations for KY3P
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: ky3pTemplateId,
          config_key: 'enableAiSuggestions',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'defaultFieldType',
          config_value: 'single-line',
          scope: 'global',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'enableRiskAnalysis',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'progressiveLoadingEnabled',
          config_value: false,
          scope: 'global',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'formTitle',
          config_value: 'S&P KY3P Security Assessment',
          scope: 'global',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'formDescription',
          config_value: 'S&P KY3P Security Assessment for third-party risk evaluation',
          scope: 'global',
        }
      ]);
    
    // Add section configurations - These will be dynamically loaded from the database
    // but we need to set up some initial ones
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: ky3pTemplateId,
          config_key: 'sectionTitle',
          config_value: 'General Information',
          scope: 'section',
          scope_target: 'general-information',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'sectionDescription',
          config_value: 'Basic information about your security practices',
          scope: 'section',
          scope_target: 'general-information',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'sectionTitle',
          config_value: 'Security Controls',
          scope: 'section',
          scope_target: 'security-controls',
        },
        {
          template_id: ky3pTemplateId,
          config_key: 'sectionDescription',
          config_value: 'Information about security controls and policies',
          scope: 'section',
          scope_target: 'security-controls',
        },
      ]);

    console.log('Successfully added KY3P task template and configurations');
    return { success: true, templateId: ky3pTemplateId };
  } catch (error) {
    console.error('Error adding KY3P task template:', error);
    throw error;
  }
}