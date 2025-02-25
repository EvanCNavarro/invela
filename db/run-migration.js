// Simple script to run the migration
const { db } = require('./index');
const { sql } = require('drizzle-orm');

async function runMigration() {
  try {
    console.log('Adding metadata field to users table...');
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

    console.log('Adding metadata field to invitations table...');
    await db.execute(sql`
      ALTER TABLE invitations
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    `);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

runMigration(); 