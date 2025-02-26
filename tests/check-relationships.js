const { db } = require('./db');
const { relationships, companies } = require('./db/schema');

async function checkRelationships() {
  try {
    console.log('Checking relationships in the database...');
    
    // Get all relationships
    const allRelationships = await db.select().from(relationships);
    console.log('Total relationships:', allRelationships.length);
    console.log('Relationships:', JSON.stringify(allRelationships, null, 2));
    
    // Get all companies
    const allCompanies = await db.select().from(companies);
    console.log('Total companies:', allCompanies.length);
    console.log('Companies:', allCompanies.map(c => ({ id: c.id, name: c.name })));
    
  } catch (error) {
    console.error('Error checking relationships:', error);
  } finally {
    process.exit(0);
  }
}

checkRelationships(); 