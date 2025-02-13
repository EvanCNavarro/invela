import { renameLegacyLogos } from "./migrations/rename_logos";
import { removeTypeColumn } from "./migrations/remove_type_column";
import { addCompanyNameUnique } from "./migrations/add_company_name_unique";

async function main() {
  try {
    console.log('Starting type column removal migration...');
    await removeTypeColumn();

    console.log('Starting logo rename migration...');
    await renameLegacyLogos();

    console.log('Starting company name uniqueness migration...');
    await addCompanyNameUnique();

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(console.error);