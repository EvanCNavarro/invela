import { runMigrations } from "./db/migrations";
import { addSecurityFormTables } from "./db/migrations/add_security_form_tables";
import { populateSecurityFields } from "./db/migrations/populate_security_fields";
import { updateTaskTitles } from "./db/migrations/update_task_titles";
import { updateSecurityFields } from "./db/migrations/update_security_fields";
import { updateKybFields2025April } from "./db/migrations/update_kyb_fields_2025_04";
import { up as addTaskTemplates } from "./db/migrations/add_task_templates";
import addKybFieldHelpText from "./db/migrations/add_kyb_field_help_text";
import { up as consolidateKybTemplates } from "./db/migrations/consolidate_kyb_templates";
import { createTimestampsTable } from "./db/create-timestamps-table";
import { migrate as enhanceKybFields } from "./db/migrations/enhance-kyb-fields";
import { migrate as updateKybFieldOrder } from "./db/migrations/update-kyb-field-order";
import { migrate as restructureKybFields } from "./db/migrations/restructure-kyb-fields";
import { addCompanyIsDemo } from "./db/migrations/add_company_is_demo";

// Migration mapping to allow running specific migrations
const migrations = {
  'add_security_tables': addSecurityFormTables,
  'populate_security_fields': populateSecurityFields,
  'update_task_titles': updateTaskTitles,
  'update_security_fields': updateSecurityFields,
  'update_kyb_fields_2025_april': updateKybFields2025April,
  'add_task_templates': addTaskTemplates,
  'add_kyb_field_help_text': addKybFieldHelpText,
  'consolidate_kyb_templates': consolidateKybTemplates,
  'create_timestamps_table': createTimestampsTable,
  'enhance_kyb_fields': enhanceKybFields, // Add new metadata columns and update field ordering
  'update_kyb_field_order': updateKybFieldOrder, // Update field order according to normalized CSV
  'restructure_kyb_fields': restructureKybFields, // Restructure kyb_fields table so IDs match order values
  'add_company_is_demo': addCompanyIsDemo, // Add is_demo column to companies table for demo functionality
  'all': runMigrations
};

type MigrationKey = keyof typeof migrations;

function showUsage() {
  console.log("\nUsage: npx tsx run-migrations.ts [migration-name]");
  console.log("\nAvailable migrations:");
  Object.keys(migrations).forEach(key => {
    console.log(`  - ${key}${key === 'all' ? ' (default)' : ''}`);
  });
  console.log("\nExample: npx tsx run-migrations.ts populate_security_fields");
  console.log("         npx tsx run-migrations.ts all");
  console.log("         npx tsx run-migrations.ts\n");
}

async function main() {
  const args = process.argv.slice(2);
  const specificMigration = args[0] as MigrationKey | undefined;
  
  console.log("Starting database migrations...");
  
  try {
    if (specificMigration) {
      if (migrations[specificMigration]) {
        console.log(`Running specific migration: ${specificMigration}`);
        await migrations[specificMigration]();
        console.log(`Migration '${specificMigration}' completed successfully!`);
      } else {
        console.error(`Error: Unknown migration '${specificMigration}'`);
        showUsage();
        process.exit(1);
      }
    } else {
      console.log("Running all migrations in sequence");
      await runMigrations();
      console.log("All migrations completed successfully!");
    }
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();