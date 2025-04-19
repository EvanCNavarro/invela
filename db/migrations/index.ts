import { addSecurityFormTables } from "./add_security_form_tables";
import { populateSecurityFields } from "./populate_security_fields";
import { updateTaskTitles } from "./update_task_titles";
import { updateKybFields2025April } from "./update_kyb_fields_2025_04";
import { up as addTaskTemplates } from "./add_task_templates";
import addKybFieldHelpText from "./add_kyb_field_help_text";
import { up as consolidateKybTemplates } from "./consolidate_kyb_templates";
import { createTimestampsTable } from "../create-timestamps-table";
import { migrate as enhanceKybFields } from "./enhance-kyb-fields";
import { migrate as updateKybFieldOrder } from "./update-kyb-field-order";
import { migrate as restructureKybFields } from "./restructure-kyb-fields";
import { addCompanyIsDemo } from "./add_company_is_demo";

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
    
    // Add help text (tooltips) for KYB fields
    log('Adding help text for KYB fields');
    await addKybFieldHelpText();
    
    // Consolidate KYB templates into a single template
    log('Consolidating KYB templates to use consistent naming');
    await consolidateKybTemplates();
    
    // Create timestamps table for field-level conflict resolution
    log('Creating field timestamps table for conflict resolution');
    await createTimestampsTable();
    
    // Enhance KYB fields with additional metadata
    log('Enhancing KYB fields with metadata columns and updating field ordering');
    await enhanceKybFields();
    
    // Update field order from the normalized CSV file
    log('Updating KYB field order according to normalized CSV');
    await updateKybFieldOrder();
    
    // Restructure kyb_fields table so IDs match order values
    log('Restructuring kyb_fields table to align IDs with order values');
    await restructureKybFields();
    
    // Add is_demo column to companies table
    log('Adding is_demo column to companies table for demo functionality');
    await addCompanyIsDemo();
    
    log('All migrations completed successfully');
    return true;
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  }
}