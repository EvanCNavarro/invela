/**
 * Migration: Update existing risk clusters to new schema
 * 
 * This migration updates existing companies' risk_clusters data from the old
 * category format (PII Data, Account Data, etc.) to the new schema format
 * (Cyber Security, Dark Web Data, etc.) while preserving risk score totals.
 */

import { db } from "../index";
import { companies } from "@db/schema";
import { sql } from "drizzle-orm";

/**
 * Convert old risk cluster categories to new schema categories
 */
function convertRiskClustersToNewSchema(oldRiskClusters: any, totalScore: number): any {
  // If already using new schema, return as-is
  if (oldRiskClusters && 
      ('Cyber Security' in oldRiskClusters || 
       'Dark Web Data' in oldRiskClusters)) {
    return oldRiskClusters;
  }

  // Fixed weights based on risk priorities (matching other generation functions)
  const weights = {
    "Cyber Security": 0.30,        // 30% - Highest priority
    "Financial Stability": 0.25,   // 25% - Second highest
    "Potential Liability": 0.20,   // 20% - Third priority
    "Dark Web Data": 0.15,         // 15% - Fourth priority
    "Public Sentiment": 0.07,      // 7% - Fifth priority
    "Data Access Scope": 0.03      // 3% - Lowest priority
  };

  const result: Record<string, number> = {};
  let sumOfValues = 0;

  // Calculate base values for each new category using fixed weights
  Object.entries(weights).forEach(([category, weight]) => {
    let value = Math.round(totalScore * weight);
    value = Math.max(value, 1); // Ensure minimum visibility
    result[category] = value;
    sumOfValues += value;
  });

  // Ensure the sum equals the total risk score by adjusting the main category
  if (sumOfValues !== totalScore) {
    const adjustment = totalScore - sumOfValues;
    const mainCategory = "Cyber Security"; // Adjust the highest weight category
    result[mainCategory] = Math.max(1, result[mainCategory] + adjustment);
  }

  return result;
}

async function run() {
  try {
    console.log("Running migration: update-risk-clusters-to-new-schema");

    // Get all companies with risk_clusters data
    const companiesWithRiskClusters = await db.select({
      id: companies.id,
      name: companies.name,
      risk_score: companies.risk_score,
      chosen_score: companies.chosen_score,
      risk_clusters: companies.risk_clusters
    }).from(companies)
    .where(sql`${companies.risk_clusters} IS NOT NULL`);

    console.log(`Found ${companiesWithRiskClusters.length} companies with risk clusters data`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const company of companiesWithRiskClusters) {
      try {
        const totalScore = company.chosen_score || company.risk_score || 50;
        const oldRiskClusters = company.risk_clusters;

        // Convert to new schema
        const newRiskClusters = convertRiskClustersToNewSchema(oldRiskClusters, totalScore);

        // Check if conversion was needed
        if (JSON.stringify(oldRiskClusters) === JSON.stringify(newRiskClusters)) {
          console.log(`Skipping company ${company.id} (${company.name}) - already using new schema`);
          skippedCount++;
          continue;
        }

        // Update the company record
        await db.update(companies)
          .set({
            risk_clusters: newRiskClusters,
            updated_at: new Date()
          })
          .where(sql`${companies.id} = ${company.id}`);

        console.log(`Updated company ${company.id} (${company.name}) with new risk cluster schema`);
        updatedCount++;

      } catch (error) {
        console.error(`Error updating company ${company.id} (${company.name}):`, error);
      }
    }

    console.log(`Migration completed successfully:`);
    console.log(`- Updated: ${updatedCount} companies`);
    console.log(`- Skipped: ${skippedCount} companies (already using new schema)`);
    console.log(`- Total: ${companiesWithRiskClusters.length} companies processed`);

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

run().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});