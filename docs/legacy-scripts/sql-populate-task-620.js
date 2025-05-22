/**
 * SQL-based population script for task 620
 * This script will directly use the execute_sql_tool to populate the database
 */

// Generate a set of 120 demo responses for task 620
const generateDemoResponses = (taskId) => {
  // Define groups for our 120 responses (10 groups, 12 questions each)
  const groups = [
    'Access Controls',
    'Data Protection',
    'Business Continuity',
    'Network Security', 
    'Cryptography',
    'Physical Security',
    'Security Monitoring',
    'Security Awareness',
    'Incident Response',
    'Vendor Management'
  ];
  
  // Define response templates
  const responseTemplates = [
    'Yes - Implemented across all systems',
    'No - Not applicable to our business model',
    'Partial - In process of implementing',
    'Yes - With compensating controls',
    'Yes - Tested annually',
    'Yes - With quarterly reviews',
    'Yes - With external validation',
    'Yes - Following ISO standards',
    'Yes - With automated monitoring',
    'Yes - With executive oversight'
  ];
  
  let values = [];
  let count = 0;
  
  // Generate fields for each group
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    
    // Generate 12 fields per group
    for (let i = 1; i <= 12; i++) {
      count++;
      const fieldId = `${group.toLowerCase().replace(/\s+/g, '_')}_${i}`;
      const responseTemplate = responseTemplates[count % responseTemplates.length];
      
      values.push(`(${taskId}, '${fieldId}', '${responseTemplate}', NOW(), NOW())`);
    }
  }
  
  return values.join(',\n');
};

// Create SQL insert statements
const createInsertSQL = (taskId) => {
  // First, delete any existing responses
  const deleteSQL = `DELETE FROM ky3p_responses WHERE task_id = ${taskId};`;
  
  // Generate values for insert
  const values = generateDemoResponses(taskId);
  
  // Create insert statement
  const insertSQL = `
INSERT INTO ky3p_responses (task_id, field_id, value, created_at, updated_at)
VALUES
${values};
  `;
  
  // Update task to mark as submitted
  const updateTaskSQL = `
UPDATE tasks
SET status = 'submitted', progress = 100, 
    metadata = jsonb_set(
      jsonb_set(metadata, '{submitted}', 'true'),
      '{submitted_at}', 
      to_jsonb(NOW()::text)
    )
WHERE id = ${taskId};
  `;
  
  return `${deleteSQL}\n\n${insertSQL}\n\n${updateTaskSQL}`;
};

// Export the SQL for task 620
console.log(createInsertSQL(620));