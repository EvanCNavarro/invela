import { renameLegacyLogos } from "./migrations/rename_logos";
import { addCompanyNameUnique } from "../db/migrations/add_company_name_unique";

async function main() {
  try {
    console.log('Starting company name uniqueness migration...');
    await addCompanyNameUnique();

    console.log('Starting logo rename migration...');
    await renameLegacyLogos();

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(console.error);