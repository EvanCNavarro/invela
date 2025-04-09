import { db } from '@db';
import { sql } from 'drizzle-orm';
import { taskTemplates, componentConfigurations } from '@db/schema';

/**
 * Creates task template tables and adds initial configurations
 */
export async function up() {
  console.log('Adding task templates and configurations...');

  try {
    // Check if KYB template already exists
    const existingKybTemplate = await db.query.taskTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.task_type, 'company_kyb')
    });
    
    let kybTemplate;
    
    if (existingKybTemplate) {
      console.log(`KYB template already exists with ID: ${existingKybTemplate.id}`);
      kybTemplate = existingKybTemplate;
    } else {
      // Create a new KYB task template if it doesn't exist
      const [newKybTemplate] = await db.insert(taskTemplates)
        .values({
          name: 'Know Your Business (KYB) Form',
          description: 'Standard KYB form for collecting company information',
          task_type: 'company_kyb',
          component_type: 'form',
          status: 'ACTIVE',
        })
        .returning();
        
      console.log(`Created new KYB template with ID: ${newKybTemplate.id}`);
      kybTemplate = newKybTemplate;
    }

    console.log(`Created KYB template with ID: ${kybTemplate.id}`);

    // Check if there are existing configurations for this template
    const existingKybConfigs = await db.query.componentConfigurations.findMany({
      where: (configs, { eq }) => eq(configs.template_id, kybTemplate.id)
    });
    
    // Add global configurations for KYB if they don't exist yet
    if (existingKybConfigs.length === 0) {
      console.log(`Adding configurations for KYB template ID: ${kybTemplate.id}`);
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

    }
    
    // Add specific field overrides for KYB if they don't exist
    const existingKybFieldConfigs = await db.query.componentConfigurations.findMany({
      where: (configs, { eq, and }) => and(
        eq(configs.template_id, kybTemplate.id),
        eq(configs.scope, 'field')
      )
    });
    
    if (existingKybFieldConfigs.length === 0) {
      console.log(`Adding field configurations for KYB template ID: ${kybTemplate.id}`);
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
    }

    // Check if CARD template already exists
    const existingCardTemplate = await db.query.taskTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.task_type, 'card_application')
    });
    
    let cardTemplate;
    
    if (existingCardTemplate) {
      console.log(`CARD template already exists with ID: ${existingCardTemplate.id}`);
      cardTemplate = existingCardTemplate;
    } else {
      // Create a new CARD template if it doesn't exist
      const [newCardTemplate] = await db.insert(taskTemplates)
        .values({
          name: 'Card Application Form',
          description: 'Application form for banking card products',
          task_type: 'card_application',
          component_type: 'form',
          status: 'ACTIVE',
        })
        .returning();
        
      console.log(`Created new CARD template with ID: ${newCardTemplate.id}`);
      cardTemplate = newCardTemplate;
    }

    console.log(`Created CARD template with ID: ${cardTemplate.id}`);

    // Check if there are existing configurations for the CARD template
    const existingCardConfigs = await db.query.componentConfigurations.findMany({
      where: (configs, { eq, and }) => and(
        eq(configs.template_id, cardTemplate.id),
        eq(configs.scope, 'global')
      )
    });
    
    // Add global configurations for CARD if they don't exist
    if (existingCardConfigs.length === 0) {
      console.log(`Adding global configurations for CARD template ID: ${cardTemplate.id}`);
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
    }

    // Check if there are existing field configurations for the CARD template
    const existingCardFieldConfigs = await db.query.componentConfigurations.findMany({
      where: (configs, { eq, and }) => and(
        eq(configs.template_id, cardTemplate.id),
        eq(configs.scope, 'field')
      )
    });
    
    // Add specific field overrides for CARD if they don't exist
    if (existingCardFieldConfigs.length === 0) {
      console.log(`Adding field configurations for CARD template ID: ${cardTemplate.id}`);
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
    }

    // Check if Security template already exists
    const existingSecurityTemplate = await db.query.taskTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.task_type, 'security_assessment')
    });
    
    let securityTemplate;
    
    if (existingSecurityTemplate) {
      console.log(`Security template already exists with ID: ${existingSecurityTemplate.id}`);
      securityTemplate = existingSecurityTemplate;
    } else {
      // Create a new Security template if it doesn't exist
      const [newSecurityTemplate] = await db.insert(taskTemplates)
        .values({
          name: 'Security Assessment Form',
          description: 'Security assessment for system integrations',
          task_type: 'security_assessment',
          component_type: 'form',
          status: 'ACTIVE',
        })
        .returning();
        
      console.log(`Created new Security template with ID: ${newSecurityTemplate.id}`);
      securityTemplate = newSecurityTemplate;
    }

    console.log(`Created Security template with ID: ${securityTemplate.id}`);

    // Check if there are existing configurations for the Security template
    const existingSecurityConfigs = await db.query.componentConfigurations.findMany({
      where: (configs, { eq, and }) => and(
        eq(configs.template_id, securityTemplate.id),
        eq(configs.scope, 'global')
      )
    });
    
    // Add global configurations for Security if they don't exist
    if (existingSecurityConfigs.length === 0) {
      console.log(`Adding global configurations for Security template ID: ${securityTemplate.id}`);
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

    }
    
    // Check if there are existing section configurations for the Security template
    const existingSecuritySectionConfigs = await db.query.componentConfigurations.findMany({
      where: (configs, { eq, and }) => and(
        eq(configs.template_id, securityTemplate.id),
        eq(configs.scope, 'section')
      )
    });
    
    // Add section configurations for Security if they don't exist
    if (existingSecuritySectionConfigs.length === 0) {
      console.log(`Adding section configurations for Security template ID: ${securityTemplate.id}`);
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
    }

    console.log('Successfully added all task templates and configurations');
    return { success: true };
  } catch (error) {
    console.error('Error adding task templates:', error);
    throw error;
  }
}