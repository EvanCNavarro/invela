import { renameLegacyLogos } from "./migrations/rename_logos";
import { addCompanyNameUnique } from "../db/migrations/add_company_name_unique";
import { addKybFormTables } from "../db/migrations/add_kyb_form_tables";
import { addKybFieldGroups } from "../db/migrations/add_kyb_field_groups";
import { addMetadataColumn } from "./migrations/add_metadata_column";
import { addRefreshTokensTable } from "./migrations/add_refresh_tokens_table";

async function main() {
  try {
    console.log('Starting company name uniqueness migration...');
    await addCompanyNameUnique();

    console.log('Starting logo rename migration...');
    await renameLegacyLogos();

    console.log('Starting KYB form tables migration...');
    await addKybFormTables();

    console.log('Starting KYB field groups migration...');
    await addKybFieldGroups();

    console.log('Starting metadata column migration...');
    await addMetadataColumn();

    console.log('Starting refresh tokens table migration...');
    await addRefreshTokensTable();

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  process.exit(0);
}

main().catch(console.error);