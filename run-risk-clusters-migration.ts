/**
 * Run the risk clusters migration script
 * 
 * This script executes the migration to add risk_clusters to companies
 * and populate the data for all existing companies
 */
import { exec } from 'child_process';

async function runMigration() {
  console.log('🚀 Running risk clusters migration...');
  
  return new Promise((resolve, reject) => {
    exec('tsx db/migrations/add-risk-clusters.ts', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error running migration: ${error.message}`);
        return reject(error);
      }
      
      if (stderr) {
        console.error(`Migration stderr: ${stderr}`);
      }
      
      console.log(stdout);
      resolve(stdout);
    });
  });
}

// Run the migration
runMigration()
  .then(() => {
    console.log('✅ Risk clusters migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Risk clusters migration failed:', error);
    process.exit(1);
  });