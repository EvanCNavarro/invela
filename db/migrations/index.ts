import { addSecurityFormTables } from "./add_security_form_tables";
import { populateSecurityFields } from "./populate_security_fields";
import { updateTaskTitles } from "./update_task_titles";
import { updateKybFields2025April } from "./update_kyb_fields_2025_04";
import { up as addTaskTemplates } from "./add_task_templates";

// Simpler logging for standalone execution
function log(message: string) {
  console.log(`[Migration] ${message}`);
}

/**
 * Run all migrations in the proper sequence
 */
export async function runMigrations() {
  try {
    log('Starting database migrations');
    
    // Add security form tables
    log('Running security form tables migration');
    await addSecurityFormTables();
    
    // Populate security fields with data from card fields
    log('Populating security fields from card fields');
    await populateSecurityFields();
    
    // Update existing task titles to include numbering
    log('Updating existing task titles');
    await updateTaskTitles();
    
    // Update KYB form fields based on April 2025 revision
    log('Updating KYB form fields');
    await updateKybFields2025April();
    
    // Add task templates and component configurations
    log('Adding task templates and component configurations');
    await addTaskTemplates();
    
    log('All migrations completed successfully');
    return true;
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}