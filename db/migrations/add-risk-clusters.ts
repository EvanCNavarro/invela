/**
 * Migration script to add risk_clusters column to companies table and populate it with data
 * 
 * This script will:
 * 1. Create the risk_clusters column if it doesn't exist
 * 2. Populate the column with random values for each company based on their risk score
 */
import { db } from '@db';
import { companies } from '@db/schema';
import { sql } from 'drizzle-orm';

async function addRiskClustersColumn() {
  console.log('[Migration] Adding risk_clusters column to companies table if it does not exist');
  
  // Check if the column already exists
  try {
    const checkColumnExists = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'companies' AND column_name = 'risk_clusters'
    `);
    
    if (checkColumnExists.length > 0) {
      console.log('[Migration] risk_clusters column already exists, skipping creation');
    } else {
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE companies
        ADD COLUMN risk_clusters JSONB
      `);
      console.log('[Migration] risk_clusters column added successfully');
    }
  } catch (error) {
    console.error('[Migration] Error checking/adding risk_clusters column:', error);
    throw error;
  }
}

async function populateRiskClusters() {
  console.log('[Migration] Populating risk_clusters for all companies');
  
  try {
    // Get all companies
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      riskScore: companies.risk_score,
      chosenScore: companies.chosen_score
    }).from(companies);
    
    console.log(`[Migration] Found ${allCompanies.length} companies to update`);
    
    // Update each company with risk cluster data
    for (const company of allCompanies) {
      // Use the chosen score if available, otherwise use risk score, default to 250 if neither is present
      const totalScore = company.chosenScore || company.riskScore || 250;
      
      // Create randomized risk clusters that sum up to the total score
      const riskClusters = generateRiskClusters(totalScore);
      
      // Update the company record
      await db.update(companies)
        .set({
          risk_clusters: riskClusters,
          updated_at: new Date()
        })
        .where(sql`${companies.id} = ${company.id}`);
      
      console.log(`[Migration] Updated company ${company.id} (${company.name}) with risk clusters`);
    }
    
    console.log('[Migration] Successfully populated risk_clusters for all companies');
  } catch (error) {
    console.error('[Migration] Error populating risk_clusters:', error);
    throw error;
  }
}

/**
 * Generate randomized risk clusters that sum up to the total score
 */
function generateRiskClusters(totalScore: number) {
  // Define the new risk cluster categories matching the schema
  const categories = [
    "Cyber Security",
    "Financial Stability",
    "Potential Liability",
    "Dark Web Data",
    "Public Sentiment",
    "Data Access Scope"
  ];
  
  // Fixed weights based on risk priorities (matching example provided)
  const weights = {
    "Cyber Security": 0.30,        // 30% - Highest priority
    "Financial Stability": 0.25,   // 25% - Second highest
    "Potential Liability": 0.20,   // 20% - Third priority
    "Dark Web Data": 0.15,         // 15% - Fourth priority
    "Public Sentiment": 0.07,      // 7% - Fifth priority
    "Data Access Scope": 0.03      // 3% - Lowest priority
  };
  
  // Initialize result object
  const result: Record<string, number> = {};
  let sumOfValues = 0;
  
  // Calculate base values for each category using fixed weights
  categories.forEach((category) => {
    // Calculate the value for this category using predetermined weights
    let value = Math.round(totalScore * (weights as any)[category]);
    
    // Ensure the value is at least 1 for visibility on the chart
    value = Math.max(value, 1);
    
    // Add to the result
    result[category] = value;
    
    // Keep track of sum
    sumOfValues += value;
  });
  
  // Adjust the last category if needed to make the sum match the total score exactly
  if (sumOfValues !== totalScore) {
    const adjustment = totalScore - sumOfValues;
    const lastCategory = categories[categories.length - 1];
    result[lastCategory] = Math.max(1, result[lastCategory] + adjustment);
  }
  
  return result;
}

async function run() {
  try {
    // Step 1: Add the risk_clusters column if it doesn't exist
    await addRiskClustersColumn();
    
    // Step 2: Populate risk clusters data for all companies
    await populateRiskClusters();
    
    console.log('[Migration] Migration successfully completed');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
run();