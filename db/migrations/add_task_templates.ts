import { db } from '@db';
import { sql } from 'drizzle-orm';
import { taskTemplates, componentConfigurations } from '@db/schema';

/**
 * Creates task template tables and adds initial configurations
 */
export async function up() {
  console.log('Adding task templates and configurations...');

  try {
    // First, let's create a KYB task template
    const [kybTemplate] = await db.insert(taskTemplates)
      .values({
        name: 'Know Your Business (KYB) Form',
        description: 'Standard KYB form for collecting company information',
        task_type: 'company_kyb',
        component_type: 'form',
        status: 'ACTIVE',
      })
      .returning();

    console.log(`Created KYB template with ID: ${kybTemplate.id}`);

    // Add global configurations for KYB
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: kybTemplate.id,
          config_key: 'enableAiSuggestions',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: kybTemplate.id,
          config_key: 'defaultFieldType',
          config_value: 'single-line',
          scope: 'global',
        },
        {
          template_id: kybTemplate.id,
          config_key: 'enableRiskAnalysis',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: kybTemplate.id,
          config_key: 'animationSpeed',
          config_value: 'normal',
          scope: 'global',
        },
        {
          template_id: kybTemplate.id,
          config_key: 'tooltipPosition',
          config_value: 'right',
          scope: 'global',
        },
      ]);

    // Add specific field overrides for KYB
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: kybTemplate.id,
          config_key: 'fieldType',
          config_value: 'multi-line',
          scope: 'field',
          scope_target: 'company-description',
        },
        {
          template_id: kybTemplate.id,
          config_key: 'validation',
          config_value: JSON.stringify({ required: true, minLength: 20 }),
          scope: 'field',
          scope_target: 'company-description',
        },
        {
          template_id: kybTemplate.id,
          config_key: 'fieldType',
          config_value: 'multi-line',
          scope: 'field',
          scope_target: 'business-model',
        },
        {
          template_id: kybTemplate.id,
          config_key: 'tooltipContent',
          config_value: 'Be specific about your revenue streams and business model',
          scope: 'field',
          scope_target: 'business-model',
        },
      ]);

    // Now, create CARD form template
    const [cardTemplate] = await db.insert(taskTemplates)
      .values({
        name: 'Card Application Form',
        description: 'Application form for banking card products',
        task_type: 'card_application',
        component_type: 'form',
        status: 'ACTIVE',
      })
      .returning();

    console.log(`Created CARD template with ID: ${cardTemplate.id}`);

    // Add global configurations for CARD
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: cardTemplate.id,
          config_key: 'enableAiSuggestions',
          config_value: false,
          scope: 'global',
        },
        {
          template_id: cardTemplate.id,
          config_key: 'defaultFieldType',
          config_value: 'multi-line',
          scope: 'global',
        },
        {
          template_id: cardTemplate.id,
          config_key: 'enableRiskAnalysis',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: cardTemplate.id,
          config_key: 'animationSpeed',
          config_value: 'fast',
          scope: 'global',
        },
        {
          template_id: cardTemplate.id,
          config_key: 'tooltipPosition',
          config_value: 'top',
          scope: 'global',
        },
      ]);

    // Add specific field overrides for CARD
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: cardTemplate.id,
          config_key: 'fieldType',
          config_value: 'single-line',
          scope: 'field',
          scope_target: 'cardholder-name',
        },
        {
          template_id: cardTemplate.id,
          config_key: 'validation',
          config_value: JSON.stringify({ required: true, pattern: '^[A-Za-z\\s]{2,50}$' }),
          scope: 'field',
          scope_target: 'cardholder-name',
        },
        {
          template_id: cardTemplate.id,
          config_key: 'fieldType',
          config_value: 'dropdown',
          scope: 'field',
          scope_target: 'card-type',
        },
        {
          template_id: cardTemplate.id,
          config_key: 'options',
          config_value: JSON.stringify(['Business Debit', 'Business Credit', 'Corporate Credit']),
          scope: 'field',
          scope_target: 'card-type',
        },
      ]);

    // Finally, create Security Assessment template
    const [securityTemplate] = await db.insert(taskTemplates)
      .values({
        name: 'Security Assessment Form',
        description: 'Security assessment for system integrations',
        task_type: 'security_assessment',
        component_type: 'form',
        status: 'ACTIVE',
      })
      .returning();

    console.log(`Created Security template with ID: ${securityTemplate.id}`);

    // Add global configurations for Security
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: securityTemplate.id,
          config_key: 'enableAiSuggestions',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: securityTemplate.id,
          config_key: 'defaultFieldType',
          config_value: 'checkbox',
          scope: 'global',
        },
        {
          template_id: securityTemplate.id,
          config_key: 'enableRiskAnalysis',
          config_value: true,
          scope: 'global',
        },
        {
          template_id: securityTemplate.id,
          config_key: 'animationSpeed',
          config_value: 'slow',
          scope: 'global',
        },
        {
          template_id: securityTemplate.id,
          config_key: 'tooltipPosition',
          config_value: 'left',
          scope: 'global',
        },
      ]);

    // Add section configurations for Security
    await db.insert(componentConfigurations)
      .values([
        {
          template_id: securityTemplate.id,
          config_key: 'sectionTitle',
          config_value: 'Data Protection',
          scope: 'section',
          scope_target: 'data-protection',
        },
        {
          template_id: securityTemplate.id,
          config_key: 'sectionDescription',
          config_value: 'Data protection and privacy compliance measures',
          scope: 'section',
          scope_target: 'data-protection',
        },
        {
          template_id: securityTemplate.id,
          config_key: 'sectionTitle',
          config_value: 'Authentication',
          scope: 'section',
          scope_target: 'authentication',
        },
        {
          template_id: securityTemplate.id,
          config_key: 'sectionDescription',
          config_value: 'Authentication and access control mechanisms',
          scope: 'section',
          scope_target: 'authentication',
        },
      ]);

    console.log('Successfully added all task templates and configurations');
    return { success: true };
  } catch (error) {
    console.error('Error adding task templates:', error);
    throw error;
  }
}