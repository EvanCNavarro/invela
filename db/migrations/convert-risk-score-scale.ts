/**
 * Migration script to convert risk_score from 0-1500 scale to 0-100 scale
 * 
 * This script:
 * 1. Gets all companies with risk scores
 * 2. Converts each risk score from the 0-1500 scale to the 0-100 scale
 * 3. Updates the company records with the new scale
 * 4. Also updates chosen_score to match the new scale
 */
import { db } from '@db';
import { companies } from '@db/schema';
import { sql } from 'drizzle-orm';

/**
 * Convert a risk score from the 0-1500 scale to the 0-100 scale
 * @param oldScore The score in the old 0-1500 scale
 * @returns The score in the new 0-100 scale
 */
function convertRiskScore(oldScore: number | null): number | null {
  if (oldScore === null) return null;
  
  // Convert from 0-1500 scale to 0-100 scale
  const percentage = (oldScore / 1500) * 100;
  
  // Round to the nearest integer
  return Math.round(percentage);
}

async function migrateRiskScores() {
  console.log('[Migration] Starting migration of risk scores from 0-1500 to 0-100 scale');
  
  try {
    // Get all companies with their current risk scores
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      riskScore: companies.risk_score,
      chosenScore: companies.chosen_score
    }).from(companies);
    
    console.log(`[Migration] Found ${allCompanies.length} companies to process`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each company
    for (const company of allCompanies) {
      const oldRiskScore = company.riskScore;
      const oldChosenScore = company.chosenScore;
      
      // Convert risk scores to new scale
      const newRiskScore = convertRiskScore(oldRiskScore);
      const newChosenScore = convertRiskScore(oldChosenScore);
      
      // Skip if no risk scores to update
      if (oldRiskScore === null && oldChosenScore === null) {
        skippedCount++;
        continue;
      }
      
      // Logging before update
      console.log(`[Migration] Converting risk scores for company ${company.id} (${company.name})`, {
        oldRiskScore,
        newRiskScore,
        oldChosenScore,
        newChosenScore
      });
      
      // Update the company record
      await db.update(companies)
        .set({
          risk_score: newRiskScore,
          chosen_score: newChosenScore,
          updated_at: new Date()
        })
        .where(sql`${companies.id} = ${company.id}`);
      
      updatedCount++;
    }
    
    console.log('[Migration] Risk score migration completed successfully', {
      totalCompanies: allCompanies.length,
      updatedCompanies: updatedCount,
      skippedCompanies: skippedCount
    });
  } catch (error) {
    console.error('[Migration] Error migrating risk scores:', error);
    throw error;
  }
}

async function run() {
  try {
    await migrateRiskScores();
    console.log('[Migration] Risk score scale conversion successfully completed');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
run();
