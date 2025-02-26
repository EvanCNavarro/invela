require('dotenv').config();
const { Pool } = require('pg');

// Create a new pool using the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    // Check if relationships table exists
    console.log('\nChecking if relationships table exists:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tablesResult.rows.map(row => row.table_name));
    
    // Query relationships table
    console.log('\nQuerying relationships table:');
    try {
      const relationshipsResult = await client.query('SELECT * FROM relationships');
      console.log('Total relationships:', relationshipsResult.rowCount);
      console.log('Relationships data:', JSON.stringify(relationshipsResult.rows, null, 2));
    } catch (error) {
      console.error('Error querying relationships table:', error.message);
    }
    
    // Query companies table
    console.log('\nQuerying companies table:');
    try {
      const companiesResult = await client.query('SELECT id, name FROM companies LIMIT 10');
      console.log('Companies sample:', companiesResult.rows);
    } catch (error) {
      console.error('Error querying companies table:', error.message);
    }
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

checkDatabase(); 