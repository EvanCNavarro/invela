import { addRefreshTokensTable } from "./add_refresh_tokens_table";

/**
 * Standalone script to run just the refresh tokens table migration
 */
async function runRefreshTokensMigration() {
  try {
    console.log('[Refresh Tokens Migration] Starting');
    const result = await addRefreshTokensTable();
    console.log('[Refresh Tokens Migration] Result:', result);
    return result;
  } catch (error) {
    console.error('[Refresh Tokens Migration] Failed:', error);
    throw error;
  }
}

// Execute the migration
if (require.main === module) {
  runRefreshTokensMigration()
    .then(() => {
      console.log('[Refresh Tokens Migration] Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Refresh Tokens Migration] Migration failed:', error);
      process.exit(1);
    });
} 