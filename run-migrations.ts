import { runMigrations } from "./db/migrations";
import { addSecurityFormTables } from "./db/migrations/add_security_form_tables";
import { populateSecurityFields } from "./db/migrations/populate_security_fields";
import { updateTaskTitles } from "./db/migrations/update_task_titles";
import { updateSecurityFields } from "./db/migrations/update_security_fields";
import { updateKybFields2025April } from "./db/migrations/update_kyb_fields_2025_04";

// Migration mapping to allow running specific migrations
const migrations = {
  'add_security_tables': addSecurityFormTables,
  'populate_security_fields': populateSecurityFields,
  'update_task_titles': updateTaskTitles,
  'update_security_fields': updateSecurityFields,
  'update_kyb_fields_2025_april': updateKybFields2025April,
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