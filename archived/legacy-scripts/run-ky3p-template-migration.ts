import { addKy3pTemplate } from './server/migrations/add_ky3p_template';

async function run() {
  try {
    console.log('Running KY3P template migration...');
    const result = await addKy3pTemplate();
    console.log('KY3P template migration complete:', result);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

run();