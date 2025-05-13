/**
 * Script to check risk configuration in the database (ESM version)
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
const { Client } = pg;

async function checkRiskConfiguration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check chosen_score
    const scoreResult = await client.query('SELECT chosen_score FROM companies WHERE id = 1');
    console.log('Risk Acceptance Level (chosen_score):', scoreResult.rows[0].chosen_score);

    // Check risk_priorities
    const prioritiesResult = await client.query('SELECT risk_priorities FROM companies WHERE id = 1');
    const priorities = prioritiesResult.rows[0].risk_priorities;
    console.log('\nRisk Priorities JSON:');
    console.log(JSON.stringify(priorities, null, 2));

    // Parse and show dimensions in a more readable format
    if (priorities && priorities.dimensions) {
      console.log('\nDimensions:');
      priorities.dimensions.forEach(dim => {
        console.log(`- ${dim.name}: value=${dim.value}, weight=${dim.weight}`);
      });
      
      console.log('\nRisk Acceptance Level from priorities:', priorities.riskAcceptanceLevel);
      console.log('Last Updated:', priorities.lastUpdated);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
    console.log('Disconnected from database');
  }
}

checkRiskConfiguration();