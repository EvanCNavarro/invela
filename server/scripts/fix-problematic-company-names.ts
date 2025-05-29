/**
 * ========================================
 * Company Name Cleanup Script
 * ========================================
 * 
 * Replaces all problematic company names identified in the audit with
 * professional alternatives. Updates company names and regenerates
 * associated business data to maintain consistency.
 * 
 * Key Features:
 * - Replaces 25 problematic company names from audit
 * - Generates professional business descriptions
 * - Updates website URLs to match new names
 * - Maintains business data consistency
 * - Comprehensive logging and error handling
 * 
 * @module FixProblematicCompanyNames
 * @version 1.0.0
 * @since 2025-05-29
 */

import { db } from '@db';
import { companies } from '@db/schema';
import { eq } from 'drizzle-orm';
import { generateAdvancedCompanyName } from '../utils/company-name-utils';

// ========================================
// PROBLEMATIC COMPANIES TO REPLACE
// ========================================

const PROBLEMATIC_COMPANIES = [
  // Illegal/Criminal Activities
  { id: 493, name: 'Anonymous Trading' },
  { id: 512, name: 'BitCoin Mixer Pro' },
  { id: 508, name: 'BlackMarket Exchange' },
  { id: 507, name: 'CryptoHeist Insurance' },
  { id: 500, name: 'DarkPool Trading' },
  { id: 514, name: 'Exit Scam Protocol' },
  { id: 513, name: 'SilkRoad Payments' },
  { id: 496, name: 'Underground Exchange' },
  
  // Gambling/Addiction
  { id: 494, name: 'BitGambling Casino' },
  { id: 504, name: 'CryptoAddiction Recovery' },
  { id: 506, name: 'DegenerateFi Protocol' },
  
  // Scams/Fraud
  { id: 499, name: 'CryptoLoan Sharks' },
  { id: 511, name: 'CryptoPonzi Scheme' },
  { id: 501, name: 'MLM CryptoCoin' },
  { id: 510, name: 'MoonShot Ventures' },
  { id: 492, name: 'PonziCoin Platform' },
  { id: 509, name: 'RugPull Analytics' },
  { id: 502, name: 'ScamCoin Alert' },
  
  // High Risk/Negative
  { id: 491, name: 'CryptoTax Shelter' },
  { id: 497, name: 'Leverage Max Trading' },
  { id: 495, name: 'RiskyCoin Ventures' },
  { id: 503, name: 'VolatilityCoin Exchange' },
  
  // Meme/Unprofessional
  { id: 505, name: 'MemeCoin Factory' },
  { id: 489, name: 'MemeToken Exchange' },
  { id: 486, name: 'YieldFarm Aggregator' }
];

// ========================================
// BUSINESS DESCRIPTION GENERATOR
// ========================================

/**
 * Generates professional business description based on company name
 */
function generateBusinessDescription(companyName: string): string {
  const descriptions = [
    `${companyName} is a leading financial technology company specializing in innovative payment solutions and digital banking services for modern enterprises.`,
    `${companyName} provides comprehensive financial analytics and risk management solutions for institutional clients across global markets.`,
    `${companyName} delivers cutting-edge investment management technology and wealth advisory services to high-net-worth individuals and corporate clients.`,
    `${companyName} offers advanced trading platforms and financial data solutions designed for professional traders and investment firms.`,
    `${companyName} specializes in regulatory technology and compliance solutions for financial institutions navigating complex regulatory environments.`,
    `${companyName} provides enterprise-grade credit management and lending platform solutions for banks and financial service providers.`,
    `${companyName} delivers sophisticated portfolio management tools and investment analytics for institutional asset managers.`,
    `${companyName} offers comprehensive banking infrastructure and payment processing solutions for emerging financial markets.`,
  ];
  
  return descriptions[Math.floor(Math.random() * descriptions.length)];
}

/**
 * Generates professional website URL based on company name
 */
function generateWebsiteUrl(companyName: string): string {
  const cleanName = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);
  
  return `https://www.${cleanName}.com`;
}

// ========================================
// MAIN REPLACEMENT FUNCTION
// ========================================

export async function fixProblematicCompanyNames(): Promise<void> {
  console.log('🚀 Starting company name cleanup process...');
  console.log(`📋 Found ${PROBLEMATIC_COMPANIES.length} problematic companies to replace`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const problematicCompany of PROBLEMATIC_COMPANIES) {
    try {
      console.log(`\n🔄 Processing: ${problematicCompany.name} (ID: ${problematicCompany.id})`);
      
      // Generate new professional company name
      const newName = await generateAdvancedCompanyName('Professional Financial', 1);
      const newDescription = generateBusinessDescription(newName);
      const newWebsiteUrl = generateWebsiteUrl(newName);
      
      console.log(`   ✅ Generated replacement: "${newName}"`);
      
      // Update company in database
      await db
        .update(companies)
        .set({
          name: newName,
          description: newDescription,
          websiteUrl: newWebsiteUrl,
        })
        .where(eq(companies.id, problematicCompany.id));
      
      console.log(`   ✅ Updated database successfully`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Error processing ${problematicCompany.name}:`, error);
      errorCount++;
    }
  }
  
  console.log('\n🎉 Company name cleanup completed!');
  console.log(`   ✅ Successfully updated: ${successCount} companies`);
  console.log(`   ❌ Errors encountered: ${errorCount} companies`);
  
  if (errorCount > 0) {
    console.log('\n⚠️  Some companies could not be updated. Please review the errors above.');
  } else {
    console.log('\n🎯 All problematic company names have been successfully replaced with professional alternatives!');
  }
}

// ========================================
// EXECUTE SCRIPT
// ========================================

fixProblematicCompanyNames()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });