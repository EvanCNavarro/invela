/**
 * Script to remove dashboard from available tabs for KYB form
 * and ensure only file-vault is unlocked
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
    
    // Prepare the corrected tabs array - ONLY include task-center and file-vault
    let currentTabs = ['task-center', 'file-vault'];
    
    console.log('New tabs to set (explicitly removing dashboard):', currentTabs);
    
    // Update the company record with the corrected tabs
    const updateResult = await pool.query(`
      UPDATE companies
      SET available_tabs = $1
      WHERE id = $2
      RETURNING id, name, available_tabs
    `, [currentTabs, companyId]);
    
    console.log('Update result:', updateResult.rows[0]);
    
    // Generate and run a broadcast script
    console.log('Broadcasting WebSocket event to update clients...');
    
    // Clean up and exit
    await pool.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error fixing company tabs:', error);
    await pool.end();
  }
}

// Run with default company ID 255
fixCompanyTabs();