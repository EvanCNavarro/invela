/**
 * Fix Open Banking Post-Submission Process
 * 
 * This script directly addresses the Open Banking post-submission issues:
 * 1. Generates a random risk score (5-95)
 * 2. Updates accreditation status to APPROVED
 * 3. Marks onboarding as complete
 * 4. Generates risk clusters based on the risk score
 * 5. Unlocks Dashboard and Insights tabs
 * 
 * Usage: 
 *   node fix-open-banking-postsubmission.js [companyId]
 * 
 * Example:
 *   node fix-open-banking-postsubmission.js 289
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

const { Pool } = pg;

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Terminal colors for better output readability
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

// Get company ID from command line args or use default
const companyId = parseInt(process.argv[2]) || 289;

/**
 * Calculate risk clusters based on total risk score
 * This follows the same distribution as in the application code
 * 
 * @param {number} totalRiskScore - The total risk score
 * @returns {Object} - Risk clusters with their values
 */
function calculateRiskClusters(totalRiskScore) {
  return {
    "PII Data": Math.floor(totalRiskScore * 0.35),
    "Account Data": Math.floor(totalRiskScore * 0.3),
    "Data Transfers": Math.floor(totalRiskScore * 0.1),
    "Certifications Risk": Math.floor(totalRiskScore * 0.1),
    "Security Risk": Math.floor(totalRiskScore * 0.1),
    "Financial Risk": Math.floor(totalRiskScore * 0.05)
  };
}

/**
 * Update company with Open Banking post-submission data
 */
async function fixOpenBankingPostSubmission(companyId) {
  console.log(`\n${colors.bright}${colors.green}=== Starting Open Banking Post-Submission Fix ===${colors.reset}`);
  console.log(`Company ID: ${companyId}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  try {
    // First check if the company exists and its current state
    const companyCheck = await pool.query(
      `SELECT 
        id, 
        name, 
        onboarding_company_completed, 
        risk_score, 
        accreditation_status, 
        risk_clusters,
        available_tabs
       FROM companies 
       WHERE id = $1`,
      [companyId]
    );
    
    if (companyCheck.rows.length === 0) {
      console.error(`${colors.red}Company with ID ${companyId} not found!${colors.reset}`);
      return false;
    }
    
    const company = companyCheck.rows[0];
    console.log(`${colors.cyan}Current company state:${colors.reset}`, {
      id: company.id,
      name: company.name,
      onboardingCompleted: company.onboarding_company_completed,
      riskScore: company.risk_score,
      accreditationStatus: company.accreditation_status,
      hasRiskClusters: !!company.risk_clusters,
      availableTabs: company.available_tabs
    });
    
    // Generate a random risk score between 5 and 95
    const riskScore = Math.floor(Math.random() * (95 - 5 + 1)) + 5;
    console.log(`${colors.yellow}Generated random risk score: ${riskScore}${colors.reset}`);
    
    // Calculate risk clusters based on the risk score
    const riskClusters = calculateRiskClusters(riskScore);
    console.log(`${colors.yellow}Generated risk clusters:${colors.reset}`, riskClusters);
    
    // Ensure Dashboard and Insights tabs are available
    let availableTabs = Array.isArray(company.available_tabs) ? [...company.available_tabs] : [];
    if (!availableTabs.includes('dashboard')) availableTabs.push('dashboard');
    if (!availableTabs.includes('insights')) availableTabs.push('insights');
    console.log(`${colors.yellow}Updated available tabs:${colors.reset}`, availableTabs);
    
    // Update the company with all post-submission data - note that available_tabs is text[] not jsonb
    const updateResult = await pool.query(
      `UPDATE companies 
       SET onboarding_company_completed = true,
           risk_score = $2,
           accreditation_status = 'APPROVED',
           risk_clusters = $3::jsonb,
           available_tabs = $4::text[],
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, onboarding_company_completed, risk_score, accreditation_status`,
      [companyId, riskScore, JSON.stringify(riskClusters), availableTabs]
    );
    
    if (updateResult.rows.length === 0) {
      console.error(`${colors.red}Failed to update company data${colors.reset}`);
      return false;
    }
    
    const updatedCompany = updateResult.rows[0];
    console.log(`\n${colors.green}${colors.bright}Company updated successfully:${colors.reset}`, {
      id: updatedCompany.id,
      name: updatedCompany.name,
      onboardingCompleted: updatedCompany.onboarding_company_completed,
      riskScore: updatedCompany.risk_score,
      accreditationStatus: updatedCompany.accreditation_status
    });
    
    // Final verification query to confirm all changes
    const verificationQuery = await pool.query(
      `SELECT 
        id, 
        name, 
        onboarding_company_completed, 
        risk_score, 
        accreditation_status, 
        risk_clusters,
        available_tabs
       FROM companies 
       WHERE id = $1`,
      [companyId]
    );
    
    const verifiedCompany = verificationQuery.rows[0];
    console.log(`\n${colors.blue}Verification check:${colors.reset}`, {
      id: verifiedCompany.id,
      name: verifiedCompany.name,
      onboardingCompleted: verifiedCompany.onboarding_company_completed,
      riskScore: verifiedCompany.risk_score,
      accreditationStatus: verifiedCompany.accreditation_status,
      hasRiskClusters: !!verifiedCompany.risk_clusters,
      availableTabs: verifiedCompany.available_tabs,
    });
    
    console.log(`\n${colors.bright}${colors.green}=== Open Banking Post-Submission Fix Completed Successfully ===${colors.reset}`);
    console.log(`Please refresh the application UI to see the changes.\n`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error fixing Open Banking post-submission:${colors.reset}`, error);
    return false;
  } finally {
    // Close the database pool
    await pool.end();
  }
}

// Run the fix function
fixOpenBankingPostSubmission(companyId).catch(error => {
  console.error(colors.red, 'Unhandled error:', error, colors.reset);
  process.exit(1);
});