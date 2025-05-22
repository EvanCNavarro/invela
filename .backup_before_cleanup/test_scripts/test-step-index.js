import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

// Create a PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function testStepIndex() {
  try {
    console.log('Testing step_index field in database tables...');
    
    // Get count of KYB fields with step_index
    const kybResult = await pool.query(`
      SELECT count(*) as count, 
             count(CASE WHEN step_index IS NOT NULL THEN 1 END) as with_step_index 
      FROM kyb_fields
    `);
    
    // Get count of CARD fields with step_index
    const cardResult = await pool.query(`
      SELECT count(*) as count, 
             count(CASE WHEN step_index IS NOT NULL THEN 1 END) as with_step_index 
      FROM card_fields
    `);
    
    // Get count of security fields with step_index
    const securityResult = await pool.query(`
      SELECT count(*) as count, 
             count(CASE WHEN step_index IS NOT NULL THEN 1 END) as with_step_index 
      FROM security_fields
    `);
    
    // Print results
    console.log('KYB Fields:', {
      total: kybResult.rows[0].count,
      withStepIndex: kybResult.rows[0].with_step_index,
      percentage: Math.round((kybResult.rows[0].with_step_index / kybResult.rows[0].count) * 100) + '%'
    });
    
    console.log('CARD Fields:', {
      total: cardResult.rows[0].count,
      withStepIndex: cardResult.rows[0].with_step_index,
      percentage: Math.round((cardResult.rows[0].with_step_index / cardResult.rows[0].count) * 100) + '%'
    });
    
    console.log('Security Fields:', {
      total: securityResult.rows[0].count,
      withStepIndex: securityResult.rows[0].with_step_index,
      percentage: Math.round((securityResult.rows[0].with_step_index / securityResult.rows[0].count) * 100) + '%'
    });
    
    // Get sample field data with step index
    if (parseInt(kybResult.rows[0].with_step_index) > 0) {
      const sampleFields = await pool.query(`
        SELECT id, field_key, section, step_index
        FROM kyb_fields
        WHERE step_index IS NOT NULL
        ORDER BY step_index, section, id
        LIMIT 5
      `);
      
      console.log('\nSample KYB fields with step_index:');
      console.table(sampleFields.rows);
    }
    
  } catch (error) {
    console.error('Error testing step_index:', error);
  } finally {
    await pool.end();
  }
}

testStepIndex();