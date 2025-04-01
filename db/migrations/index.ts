import { addSecurityFormTables } from "./add_security_form_tables";
import { populateSecurityFields } from "./populate_security_fields";
import { Logger } from "../../server/utils/logger";

const logger = new Logger('MigrationManager');

/**
 * Run all migrations in the proper sequence
 */
export async function runMigrations() {
  try {
    logger.info('Starting database migrations');
    
    // Add security form tables
    logger.info('Running security form tables migration');
    await addSecurityFormTables();
    
    // Populate security fields with data from card fields
    logger.info('Populating security fields from card fields');
    await populateSecurityFields();
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed', { error: String(error) });
    throw error;
  }
}