import { sql } from 'drizzle-orm';
import { pgTable, jsonb } from 'drizzle-orm/pg-core';
import { users, invitations } from '../schema';
import { db as projectDb } from '../index';

export async function up(db: any = projectDb) {
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
}

export async function down(db: any = projectDb) {
  console.log('Removing metadata field from users table...');
  await db.execute(sql`
    ALTER TABLE users
    DROP COLUMN IF EXISTS metadata;
  `);

  console.log('Removing metadata field from invitations table...');
  await db.execute(sql`
    ALTER TABLE invitations
    DROP COLUMN IF EXISTS metadata;
  `);

  console.log('Rollback completed successfully.');
} 