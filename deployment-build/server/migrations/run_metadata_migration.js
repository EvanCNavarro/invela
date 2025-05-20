"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const add_metadata_column_1 = require("./add_metadata_column");
/**
 * Standalone script to run just the metadata column migration
 */
async function runMetadataColumnMigration() {
    try {
        console.log('[Metadata Migration] Starting');
        const result = await (0, add_metadata_column_1.addMetadataColumn)();
        console.log('[Metadata Migration] Result:', result);
        return result;
    }
    catch (error) {
        console.error('[Metadata Migration] Failed:', error);
        throw error;
    }
}
// Execute the migration
if (require.main === module) {
    runMetadataColumnMigration()
        .then(() => {
        console.log('[Metadata Migration] Migration completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('[Metadata Migration] Migration failed:', error);
        process.exit(1);
    });
}
