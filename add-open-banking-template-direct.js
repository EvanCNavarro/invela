/**
 * Direct script to add Open Banking template to the database
 * 
 * This approach uses CommonJS modules to avoid ESM issues
 */

const { drizzle } = require('drizzle-orm/neon-serverless');
const { neon } = require('@neondatabase/serverless');
const { eq } = require('drizzle-orm');

// Function to add the template
async function addTemplate() {
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  try {
    console.log('Checking for existing Open Banking template...');
    
    // Check if template already exists
    const existingTemplate = await db.execute(
      `SELECT * FROM task_templates WHERE task_type = 'open_banking' LIMIT 1`
    );
    
    if (existingTemplate.rows.length > 0) {
      console.log('Open Banking template already exists with ID:', existingTemplate.rows[0].id);
      return;
    }
    
    console.log('Creating new Open Banking template...');
    
    // Create new template
    const result = await db.execute(
      `INSERT INTO task_templates (name, description, task_type, component_type, status)
       VALUES ('Open Banking Survey Template', 'Template for Open Banking assessments', 'open_banking', 'form', 'active')
       RETURNING id`
    );
    
    if (!result.rows || result.rows.length === 0) {
      throw new Error('Failed to create template');
    }
    
    const templateId = result.rows[0].id;
    console.log('Created template with ID:', templateId);
    
    // Add configuration
    console.log('Adding template configurations...');
    await db.execute(
      `INSERT INTO component_configurations (template_id, config_key, config_value, scope)
       VALUES 
       ($1, 'enableAiSuggestions', true, 'global'),
       ($1, 'defaultFieldType', 'textarea', 'global'),
       ($1, 'enableRiskAnalysis', true, 'global')`,
      [templateId]
    );
    
    console.log('Adding section configurations...');
    await db.execute(
      `INSERT INTO component_configurations (template_id, config_key, config_value, scope, scope_target)
       VALUES 
       ($1, 'sectionTitle', 'Functionality', 'section', 'functionality'),
       ($1, 'sectionDescription', 'API functionality and compliance', 'section', 'functionality'),
       ($1, 'sectionTitle', 'Security', 'section', 'security'),
       ($1, 'sectionDescription', 'API security and authentication', 'section', 'security')`,
      [templateId]
    );
    
    console.log('Open Banking template creation completed successfully');
    
  } catch (error) {
    console.error('Error creating Open Banking template:', error);
    throw error;
  }
}

// Run the migration
addTemplate()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });