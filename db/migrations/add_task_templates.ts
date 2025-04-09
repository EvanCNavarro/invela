import { db } from '@db';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { taskTemplates, componentConfigurations } from '@db/schema';

/**
 * Creates task template tables and adds initial configurations
 */
export async function up() {
  console.log('Adding task templates and configurations...');

  try {
    // Template 1: KYB Form
    let kybTemplateId;
    
    // Check if KYB template already exists
    const existingKybTemplate = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.task_type, 'company_kyb'))
      .limit(1);
    
    if (existingKybTemplate.length > 0) {
      console.log('KYB template already exists, using existing template');
      kybTemplateId = existingKybTemplate[0].id;
    } else {
      // Create a new KYB task template
      const [kybTemplate] = await db.insert(taskTemplates)
        .values({
          name: 'Know Your Business (KYB) Form',
          description: 'Standard KYB form for collecting company information',
          task_type: 'company_kyb',
          component_type: 'form',
          status: 'ACTIVE',
        })
        .returning();
      
      kybTemplateId = kybTemplate.id;
      console.log(`Created KYB template with ID: ${kybTemplateId}`);
      
      // Add global configurations for KYB
      await db.insert(componentConfigurations)
        .values([
          {
            template_id: kybTemplateId,
            config_key: 'enableAiSuggestions',
            config_value: true,
            scope: 'global',
          },
          {
            template_id: kybTemplateId,
            config_key: 'defaultFieldType',
            config_value: 'single-line',
            scope: 'global',
          },
          {
            template_id: kybTemplateId,
            config_key: 'enableRiskAnalysis',
            config_value: true,
            scope: 'global',
          },
          {
            template_id: kybTemplateId,
            config_key: 'animationSpeed',
            config_value: 'normal',
            scope: 'global',
          },
          {
            template_id: kybTemplateId,
            config_key: 'tooltipPosition',
            config_value: 'right',
            scope: 'global',
          },
        ]);

      // Add specific field overrides for KYB
      await db.insert(componentConfigurations)
        .values([
          {
            template_id: kybTemplateId,
            config_key: 'fieldType',
            config_value: 'multi-line',
            scope: 'field',
            scope_target: 'company-description',
          },
          {
            template_id: kybTemplateId,
            config_key: 'validation',
            config_value: JSON.stringify({ required: true, minLength: 20 }),
            scope: 'field',
            scope_target: 'company-description',
          },
          {
            template_id: kybTemplateId,
            config_key: 'fieldType',
            config_value: 'multi-line',
            scope: 'field',
            scope_target: 'business-model',
          },
          {
            template_id: kybTemplateId,
            config_key: 'tooltipContent',
            config_value: 'Be specific about your revenue streams and business model',
            scope: 'field',
            scope_target: 'business-model',
          },
        ]);
    }

    // Template 2: CARD Form
    let cardTemplateId;
    
    // Check if CARD template already exists
    const existingCardTemplate = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.task_type, 'card_application'))
      .limit(1);
    
    if (existingCardTemplate.length > 0) {
      console.log('CARD template already exists, using existing template');
      cardTemplateId = existingCardTemplate[0].id;
    } else {
      // Create a new CARD task template
      const [cardTemplate] = await db.insert(taskTemplates)
        .values({
          name: 'Card Application Form',
          description: 'Application form for banking card products',
          task_type: 'card_application',
          component_type: 'form',
          status: 'ACTIVE',
        })
        .returning();
      
      cardTemplateId = cardTemplate.id;
      console.log(`Created CARD template with ID: ${cardTemplateId}`);
      
      // Add global configurations for CARD
      await db.insert(componentConfigurations)
        .values([
          {
            template_id: cardTemplateId,
            config_key: 'enableAiSuggestions',
            config_value: false,
            scope: 'global',
          },
          {
            template_id: cardTemplateId,
            config_key: 'defaultFieldType',
            config_value: 'multi-line',
            scope: 'global',
          },
          {
            template_id: cardTemplateId,
            config_key: 'enableRiskAnalysis',
            config_value: true,
            scope: 'global',
          },
          {
            template_id: cardTemplateId,
            config_key: 'animationSpeed',
            config_value: 'fast',
            scope: 'global',
          },
          {
            template_id: cardTemplateId,
            config_key: 'tooltipPosition',
            config_value: 'top',
            scope: 'global',
          },
        ]);

      // Add specific field overrides for CARD
      await db.insert(componentConfigurations)
        .values([
          {
            template_id: cardTemplateId,
            config_key: 'fieldType',
            config_value: 'single-line',
            scope: 'field',
            scope_target: 'cardholder-name',
          },
          {
            template_id: cardTemplateId,
            config_key: 'validation',
            config_value: JSON.stringify({ required: true, pattern: '^[A-Za-z\\s]{2,50}$' }),
            scope: 'field',
            scope_target: 'cardholder-name',
          },
          {
            template_id: cardTemplateId,
            config_key: 'fieldType',
            config_value: 'dropdown',
            scope: 'field',
            scope_target: 'card-type',
          },
          {
            template_id: cardTemplateId,
            config_key: 'options',
            config_value: JSON.stringify(['Business Debit', 'Business Credit', 'Corporate Credit']),
            scope: 'field',
            scope_target: 'card-type',
          },
        ]);
    }

    // Template 3: Security Assessment
    let securityTemplateId;
    
    // Check if Security template already exists
    const existingSecurityTemplate = await db.select()
      .from(taskTemplates)
      .where(eq(taskTemplates.task_type, 'security_assessment'))
      .limit(1);
    
    if (existingSecurityTemplate.length > 0) {
      console.log('Security template already exists, using existing template');
      securityTemplateId = existingSecurityTemplate[0].id;
    } else {
      // Create a new Security template
      const [securityTemplate] = await db.insert(taskTemplates)
        .values({
          name: 'Security Assessment Form',
          description: 'Security assessment for system integrations',
          task_type: 'security_assessment',
          component_type: 'form',
          status: 'ACTIVE',
        })
        .returning();
      
      securityTemplateId = securityTemplate.id;
      console.log(`Created Security template with ID: ${securityTemplateId}`);
      
      // Add global configurations for Security
      await db.insert(componentConfigurations)
        .values([
          {
            template_id: securityTemplateId,
            config_key: 'enableAiSuggestions',
            config_value: true,
            scope: 'global',
          },
          {
            template_id: securityTemplateId,
            config_key: 'defaultFieldType',
            config_value: 'checkbox',
            scope: 'global',
          },
          {
            template_id: securityTemplateId,
            config_key: 'enableRiskAnalysis',
            config_value: true,
            scope: 'global',
          },
          {
            template_id: securityTemplateId,
            config_key: 'animationSpeed',
            config_value: 'slow',
            scope: 'global',
          },
          {
            template_id: securityTemplateId,
            config_key: 'tooltipPosition',
            config_value: 'left',
            scope: 'global',
          },
        ]);

      // Add section configurations for Security
      await db.insert(componentConfigurations)
        .values([
          {
            template_id: securityTemplateId,
            config_key: 'sectionTitle',
            config_value: 'Data Protection',
            scope: 'section',
            scope_target: 'data-protection',
          },
          {
            template_id: securityTemplateId,
            config_key: 'sectionDescription',
            config_value: 'Data protection and privacy compliance measures',
            scope: 'section',
            scope_target: 'data-protection',
          },
          {
            template_id: securityTemplateId,
            config_key: 'sectionTitle',
            config_value: 'Authentication',
            scope: 'section',
            scope_target: 'authentication',
          },
          {
            template_id: securityTemplateId,
            config_key: 'sectionDescription',
            config_value: 'Authentication and access control mechanisms',
            scope: 'section',
            scope_target: 'authentication',
          },
        ]);
    }

    console.log('Successfully added all task templates and configurations');
    return { success: true };
  } catch (error) {
    console.error('Error adding task templates:', error);
    throw error;
  }
}