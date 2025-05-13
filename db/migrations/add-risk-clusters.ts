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
  // Define the categories
  const categories = [
    "PII Data",
    "Account Data",
    "Data Transfers",
    "Certifications Risk",
    "Security Risk",
    "Financial Risk"
  ];
  
  // Initialize result object
  const result: Record<string, number> = {};
  
  // Generate 5 random proportions for first 5 categories
  const proportions: number[] = [];
  let remainingProportion = 1;
  
  for (let i = 0; i < categories.length - 1; i++) {
    // Generate a random proportion between 0.05 and remainingProportion/2
    const maxProportion = remainingProportion > 0.1 ? remainingProportion / 2 : remainingProportion;
    const minProportion = 0.05;
    const proportion = Math.random() * (maxProportion - minProportion) + minProportion;
    
    proportions.push(proportion);
    remainingProportion -= proportion;
  }
  
  // Add the remaining proportion for the last category
  proportions.push(remainingProportion);
  
  // Assign values to categories
  let sumOfValues = 0;
  categories.forEach((category, index) => {
    // Calculate the value for this category
    // Note: totalScore is now on 0-100 scale instead of 0-1500
    let value = Math.round(totalScore * proportions[index]);
    
    // Ensure the value is at least 1 for visibility on the chart
    // Lower minimum value from 10 to 1 to account for new 0-100 scale
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