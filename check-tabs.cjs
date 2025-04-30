/**
 * Script to directly check the company tabs in the database
 */

const { Pool } = require('pg');

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkCompanyTabsInDatabase(companyId = 255) {
  try {
    console.log(`Checking tabs for company ID: ${companyId}`);
    
    // Get the raw company record
    const result = await pool.query(`
      SELECT id, name, category, available_tabs 
      FROM companies 
      WHERE id = $1
    `, [companyId]);
    
    const company = result.rows[0];
    
    if (!company) {
      console.error(`Company with ID ${companyId} not found`);
      return;
    }
    
    console.log('Company found in database:');
    console.log({
      id: company.id,
      name: company.name,
      category: company.category,
      raw_tabs: company.available_tabs
    });
    
    // Try to parse the available_tabs
    let availableTabs = [];
    try {
      if (company.available_tabs) {
        availableTabs = JSON.parse(company.available_tabs);
      }
    } catch (error) {
      console.error('Error parsing available_tabs:', error);
    }
    
    console.log('Parsed available tabs:', availableTabs);
    console.log('Has file-vault tab:', availableTabs.includes('file-vault'));
    console.log('Has dashboard tab:', availableTabs.includes('dashboard'));
    
    // Also check the form submission status
    const submissionResult = await pool.query(`
      SELECT * FROM tasks WHERE id = 689
    `);
    
    if (submissionResult.rows.length > 0) {
      const task = submissionResult.rows[0];
      console.log('Task 689 status:', task.status);
      console.log('Task 689 progress:', task.progress);
    }
    
    // Check if there are any files associated with this task
    const filesResult = await pool.query(`
      SELECT * FROM files WHERE metadata->>'taskId' = '689'
    `);
    
    console.log(`Found ${filesResult.rows.length} files associated with task 689:`);
    filesResult.rows.forEach(file => {
      console.log(`- File ID: ${file.id}, Name: ${file.name}, Created: ${file.created_at}`);
    });
    
    // Clean up and exit
    await pool.end();
    
  } catch (error) {
    console.error('Error checking company tabs:', error);
    await pool.end();
  }
}

// Run with default company ID 255
checkCompanyTabsInDatabase();