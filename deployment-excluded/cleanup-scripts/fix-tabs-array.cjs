/**
 * Script to fix the format of available_tabs in the database
 * by using the correct PostgreSQL array format
 */

const { Pool } = require('pg');

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixCompanyTabs(companyId = 255) {
  try {
    console.log(`Fixing tabs for company ID: ${companyId}`);
    
    // First, get the current tabs
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
    
    // Prepare the corrected tabs array
    let currentTabs = [];
    
    // If available_tabs is already an array, use it directly
    if (Array.isArray(company.available_tabs)) {
      currentTabs = company.available_tabs;
      console.log('Using existing array from database:', currentTabs);
    } 
    // If available_tabs is a string but not valid JSON, extract values
    else if (typeof company.available_tabs === 'string') {
      // Try to clean the string format
      const tabsContent = company.available_tabs.trim();
      // Check if it's an array literal format like [ 'task-center' ]
      if (tabsContent.startsWith('[') && tabsContent.endsWith(']')) {
        // Extract values by splitting and cleaning
        const innerContent = tabsContent.substring(1, tabsContent.length - 1).trim();
        currentTabs = innerContent.split(',')
          .map(tab => tab.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, ''))
          .filter(tab => tab.length > 0);
      }
      console.log('Extracted tabs from string:', currentTabs);
    }
    
    // Make sure task-center is included
    if (!currentTabs.includes('task-center')) {
      currentTabs.push('task-center');
    }
    
    // Add the file-vault and dashboard tabs
    if (!currentTabs.includes('file-vault')) {
      currentTabs.push('file-vault');
    }
    
    if (!currentTabs.includes('dashboard')) {
      currentTabs.push('dashboard');
    }
    
    console.log('New tabs to set:', currentTabs);
    
    // Update the company record with the corrected tabs
    // For PostgreSQL text[] type, we need to use the ARRAY constructor
    const updateResult = await pool.query(`
      UPDATE companies
      SET available_tabs = $1
      WHERE id = $2
      RETURNING id, name, available_tabs
    `, [currentTabs, companyId]);
    
    console.log('Update result:', updateResult.rows[0]);
    
    // Clean up and exit
    await pool.end();
    console.log('Database connection closed');
    
    // Now that we've fixed the database, let's broadcast a WebSocket event to update clients
    console.log('Broadcasting WebSocket event to update clients...');
    
  } catch (error) {
    console.error('Error fixing company tabs:', error);
    await pool.end();
  }
}

// Run with default company ID 255
fixCompanyTabs();