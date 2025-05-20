/**
 * Direct Update Risk Clusters Script
 * 
 * This script updates the risk_clusters field in all company records
 * to use the new 6 risk dimensions with randomized values that sum to the
 * company's total risk score.
 * 
 * New dimensions:
 * 1. Cyber Security
 * 2. Financial Stability 
 * 3. Potential Liability
 * 4. Dark Web Data
 * 5. Public Sentiment
 * 6. Data Access Scope
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Client } = pg;
dotenv.config();

// Define ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Initialize database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL
});

/**
 * Enhanced logging function
 */
function log(message, color = colors.reset) {
  const timestamp = new Date().toISOString();
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

/**
 * Generate random weights for the new risk dimensions
 * The weights will sum to 1.0 (100%)
 * 
 * @returns {Object} An object with dimension keys and weight values (0-1)
 */
function generateRandomWeights() {
  // Generate 6 random numbers
  const rawWeights = Array(6).fill(0).map(() => Math.random());
  
  // Calculate sum
  const sum = rawWeights.reduce((a, b) => a + b, 0);
  
  // Normalize to create percentages (0-1)
  const normalizedWeights = rawWeights.map(w => w / sum);
  
  // Create an object with dimension names as keys
  return {
    'Cyber Security': normalizedWeights[0],
    'Financial Stability': normalizedWeights[1],
    'Potential Liability': normalizedWeights[2],
    'Dark Web Data': normalizedWeights[3],
    'Public Sentiment': normalizedWeights[4],
    'Data Access Scope': normalizedWeights[5]
  };
}

/**
 * Calculate risk clusters with randomized weights that sum to the given total score
 * 
 * @param {number} riskScore The total risk score (0-100)
 * @returns {Object} An object with risk clusters distributed across the new dimensions
 */
function calculateRandomizedRiskClusters(riskScore) {
  // Generate random weights (0-1) that sum to 1.0
  const weights = generateRandomWeights();
  
  // Apply weights to total score and round to whole numbers
  const clusters = {
    'Cyber Security': Math.round(riskScore * weights['Cyber Security']),
    'Financial Stability': Math.round(riskScore * weights['Financial Stability']),
    'Potential Liability': Math.round(riskScore * weights['Potential Liability']),
    'Dark Web Data': Math.round(riskScore * weights['Dark Web Data']),
    'Public Sentiment': Math.round(riskScore * weights['Public Sentiment']),
    'Data Access Scope': Math.round(riskScore * weights['Data Access Scope'])
  };
  
  // Sum check to ensure the total equals the risk score
  const sum = Object.values(clusters).reduce((total, value) => total + value, 0);
  const diff = riskScore - sum;
  
  // Adjust the largest dimension to account for rounding differences
  if (diff !== 0) {
    // Find dimension with largest weight
    const largestDimension = Object.entries(weights)
      .sort((a, b) => b[1] - a[1])[0][0];
    
    // Adjust that dimension's value
    clusters[largestDimension] += diff;
  }
  
  // Ensure no negative values
  for (const key in clusters) {
    clusters[key] = Math.max(0, clusters[key]);
  }
  
  return clusters;
}

/**
 * Updates a single company's risk clusters
 * 
 * @param {number} companyId The ID of the company to update
 * @param {boolean} dryRun If true, doesn't actually update the database
 * @returns {Promise<Object>} The updated company data
 */
async function updateCompanyRiskClusters(companyId, dryRun = false) {
  try {
    // Fetch the current company data
    const companyResult = await client.query(
      'SELECT id, name, risk_score, chosen_score FROM companies WHERE id = $1',
      [companyId]
    );
    
    if (companyResult.rows.length === 0) {
      log(`Company ID ${companyId} not found`, colors.red);
      return null;
    }
    
    const company = companyResult.rows[0];
    
    // Use chosen_score if available, otherwise use risk_score
    // If both are 0, use a default value of 50
    const riskScore = company.chosen_score || company.risk_score || 50;
    
    // Generate new randomized risk clusters
    const newRiskClusters = calculateRandomizedRiskClusters(riskScore);
    
    // Log the old and new data
    log(`Company: ${company.name} (ID: ${company.id})`, colors.cyan);
    log(`Risk Score: ${riskScore}`, colors.cyan);
    log(`New Risk Clusters: ${JSON.stringify(newRiskClusters)}`, colors.cyan);
    
    if (dryRun) {
      log(`DRY RUN: No changes made to the database`, colors.yellow);
      return { ...company, risk_clusters: newRiskClusters };
    }
    
    // Update the company record with new risk clusters
    const updateResult = await client.query(
      'UPDATE companies SET risk_clusters = $1 WHERE id = $2 RETURNING *',
      [newRiskClusters, companyId]
    );
    
    if (updateResult.rows.length > 0) {
      log(`Successfully updated risk clusters for company ${company.name}`, colors.green);
      return updateResult.rows[0];
    } else {
      log(`Failed to update risk clusters for company ${company.name}`, colors.red);
      return null;
    }
  } catch (error) {
    log(`Error updating company ${companyId}: ${error.message}`, colors.red);
    return null;
  }
}

/**
 * Updates all companies' risk clusters
 * 
 * @param {boolean} dryRun If true, doesn't actually update the database
 * @returns {Promise<void>}
 */
async function updateAllCompaniesRiskClusters(dryRun = false) {
  try {
    await client.connect();
    log('Connected to database', colors.green);
    
    // Get all company IDs
    const companiesResult = await client.query('SELECT id FROM companies');
    const companyIds = companiesResult.rows.map(row => row.id);
    
    log(`Found ${companyIds.length} companies to update`, colors.blue);
    
    // Update each company
    let successCount = 0;
    let failureCount = 0;
    
    for (const companyId of companyIds) {
      const result = await updateCompanyRiskClusters(companyId, dryRun);
      if (result) {
        successCount++;
      } else {
        failureCount++;
      }
    }
    
    log(`Update complete!`, colors.bright);
    log(`Successfully updated: ${successCount}`, colors.green);
    log(`Failed to update: ${failureCount}`, colors.red);
    
    if (dryRun) {
      log(`DRY RUN: No actual changes were made to the database`, colors.yellow);
    } else {
      log(`Database has been updated with new risk clusters`, colors.green);
    }
    
  } catch (error) {
    log(`Error in main execution: ${error.message}`, colors.red);
  } finally {
    await client.end();
    log('Database connection closed', colors.blue);
  }
}

// Command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Main function to handle execution flow
async function main() {
  try {
    // If --company-id is specified, update only that company
    const companyIdArg = args.find(arg => arg.startsWith('--company-id='));
    if (companyIdArg) {
      const companyId = parseInt(companyIdArg.split('=')[1], 10);
      if (isNaN(companyId)) {
        log('Invalid company ID provided', colors.red);
        process.exit(1);
      }
      
      log(`Updating risk clusters for company ID ${companyId} only`, colors.blue);
      await client.connect();
      try {
        await updateCompanyRiskClusters(companyId, dryRun);
      } finally {
        await client.end();
      }
    } else {
      // Update all companies
      await updateAllCompaniesRiskClusters(dryRun);
    }
    
    log('Script completed successfully', colors.green);
  } catch (err) {
    log(`Error: ${err.message}`, colors.red);
    process.exit(1);
  }
}

// Execute the main function
main();