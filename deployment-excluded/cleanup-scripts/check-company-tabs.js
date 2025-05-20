/**
 * Script to check company tabs in the database
 * 
 * This script connects directly to the database to check the available_tabs field
 * for a specific company, helping debug tab unlocking issues.
 */

const { db } = require('./db/index');
const { companies } = require('./db/schema');
const { eq } = require('drizzle-orm');

async function checkCompanyTabs(companyId = 255) {
  try {
    console.log(`Checking tabs for company ID: ${companyId}`);
    
    // Query the company record
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId)
    });
    
    if (!company) {
      console.error(`Company with ID ${companyId} not found`);
      return;
    }
    
    console.log('Company found:', {
      id: company.id,
      name: company.name,
      category: company.category,
      is_demo: company.is_demo,
      raw_tabs: company.available_tabs
    });
    
    // Try to parse the available_tabs JSON
    let availableTabs = [];
    try {
      if (company.available_tabs) {
        availableTabs = JSON.parse(company.available_tabs);
      }
    } catch (error) {
      console.error('Error parsing available_tabs:', error);
    }
    
    console.log('Available tabs:', availableTabs);
    console.log('File vault unlocked:', availableTabs.includes('file-vault'));
    console.log('Dashboard unlocked:', availableTabs.includes('dashboard'));
    
    // List all companies with the file-vault tab
    console.log('\nFetching all companies with file-vault tab...');
    
    const allCompanies = await db.query.companies.findMany();
    
    const companiesWithFileVault = allCompanies.filter(c => {
      try {
        const tabs = c.available_tabs ? JSON.parse(c.available_tabs) : [];
        return tabs.includes('file-vault');
      } catch (e) {
        return false;
      }
    });
    
    console.log(`Found ${companiesWithFileVault.length} companies with file-vault tab:`);
    companiesWithFileVault.forEach(c => {
      console.log(`- Company ID: ${c.id}, Name: ${c.name}`);
    });
    
  } catch (error) {
    console.error('Error checking company tabs:', error);
  } finally {
    // Exit the script
    process.exit(0);
  }
}

// Get company ID from command line argument or use default (255)
const companyId = process.argv[2] ? parseInt(process.argv[2], 10) : 255;
checkCompanyTabs(companyId);