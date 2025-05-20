"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rename_logos_1 = require("./migrations/rename_logos");
const add_company_name_unique_1 = require("../db/migrations/add_company_name_unique");
const add_kyb_form_tables_1 = require("../db/migrations/add_kyb_form_tables");
const add_kyb_field_groups_1 = require("../db/migrations/add_kyb_field_groups");
const add_metadata_column_1 = require("./migrations/add_metadata_column");
const add_refresh_tokens_table_1 = require("./migrations/add_refresh_tokens_table");
async function main() {
    try {
        console.log('Starting company name uniqueness migration...');
        await (0, add_company_name_unique_1.addCompanyNameUnique)();
        console.log('Starting logo rename migration...');
        await (0, rename_logos_1.renameLegacyLogos)();
        console.log('Starting KYB form tables migration...');
        await (0, add_kyb_form_tables_1.addKybFormTables)();
        console.log('Starting KYB field groups migration...');
        await (0, add_kyb_field_groups_1.addKybFieldGroups)();
        console.log('Starting metadata column migration...');
        await (0, add_metadata_column_1.addMetadataColumn)();
        console.log('Starting refresh tokens table migration...');
        await (0, add_refresh_tokens_table_1.addRefreshTokensTable)();
        console.log('All migrations completed successfully');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    process.exit(0);
}
main().catch(console.error);
