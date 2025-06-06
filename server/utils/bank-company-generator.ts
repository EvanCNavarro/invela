/**
 * ========================================
 * Bank Company Generator
 * ========================================
 * 
 * Comprehensive bank company generation system to populate the database
 * with realistic Data Provider banks for network relationship testing
 * and comparative risk analysis.
 * 
 * Key Features:
 * - Banking-specific business patterns and legal structures
 * - Risk score distribution optimized for banks (2-40 range)
 * - Permanent accreditation (no expiration dates)
 * - Automatic network relationship creation with FinTechs
 * - Comprehensive progress tracking and logging
 * 
 * Complements the existing FinTech generator to provide complete
 * ecosystem coverage for demo and testing scenarios.
 * 
 * @module server/utils/bank-company-generator
 * @version 1.0.0
 * @since 2025-06-06
 */

import { db } from '../../db/index.js';
import { companies, relationships, accreditationHistory } from '../../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { generateBusinessDetails } from './business-details-generator.js';
import { generateAdvancedCompanyName } from './company-name-utils.js';
import { AccreditationService } from '../services/accreditation-service.js';

// Type definitions matching database schema
interface BankCompany {
  name: string;
  description: string;
  category: 'Bank';
  accreditation_status: 'APPROVED';
  risk_score: number;
  chosen_score: number;
  risk_clusters: any;
  revenue: string;
  revenue_tier: 'small' | 'medium' | 'large' | 'xlarge';
  legal_structure: string;
  market_position: string;
  hq_address: string;
  website_url: string;
  products_services: string;
  incorporation_year: number;
  founders_and_leadership: string;
  num_employees: number;
  key_clients_partners: string;
  investors: string;
  funding_stage: string;
  exit_strategy_history: string | null;
  certifications_compliance: string;
  onboarding_company_completed: boolean;
  available_tabs: string[];
  is_demo: boolean;
  demo_persona_type: 'data-provider';
  files_public: string[];
  files_private: string[];
}

interface NetworkRelationship {
  company_id: number;
  related_company_id: number;
  relationship_type: 'data_provider';
  status: 'active';
  metadata: any;
}

interface ProgressCallback {
  current: number;
  total: number;
  phase: string;
  percentage: number;
}

/**
 * Generate risk clusters for bank companies
 * Banks typically have lower and more stable risk profiles
 */
function generateBankRiskClusters(totalScore: number): any {
  // Ensure minimum viable distribution
  const minPerCategory = 2;
  const remaining = Math.max(0, totalScore - (minPerCategory * 6));
  
  // Banks have more conservative risk distribution
  const clusters = {
    'Operational Risk': minPerCategory + Math.floor(remaining * 0.25),
    'Credit Risk': minPerCategory + Math.floor(remaining * 0.20),
    'Market Risk': minPerCategory + Math.floor(remaining * 0.15),
    'Liquidity Risk': minPerCategory + Math.floor(remaining * 0.15),
    'Compliance Risk': minPerCategory + Math.floor(remaining * 0.15),
    'Technology Risk': minPerCategory + Math.floor(remaining * 0.10)
  };
  
  return clusters;
}

/**
 * Generate realistic bank risk scores
 * Banks typically have lower risk scores than FinTechs
 */
function generateBankRiskScore(): { riskScore: number; chosenScore: number } {
  // Bank risk scores: 2-40 range (lower than FinTech 5-98)
  const riskScore = Math.floor(Math.random() * 39) + 2; // 2-40
  const chosenScore = Math.floor(Math.random() * 39) + 2; // 2-40
  
  return { riskScore, chosenScore };
}

/**
 * Configure bank-specific available tabs
 * Data Provider banks get full access including network management
 */
function getBankAvailableTabs(): string[] {
  return [
    'dashboard',
    'network',
    'file-vault',
    'company-profile',
    'risk-monitoring',
    'accreditation'
  ];
}

/**
 * Generate bank company data using proper business details and naming
 */
async function generateBankData(index: number): Promise<BankCompany> {
  // Generate professional banking name using data-provider persona
  const bankName = await generateAdvancedCompanyName(
    'Banking Institution', // Base name for context
    1, // First attempt
    { 
      persona: 'data-provider',
      lengthPreference: 'mixed',
      suffixStyle: 'professional'
    }
  );
  
  // Generate comprehensive business details for data provider persona
  const businessDetails = generateBusinessDetails(bankName, 'data-provider', true);
  
  // Generate risk scores appropriate for banks
  const { riskScore, chosenScore } = generateBankRiskScore();
  
  // Generate risk clusters matching the score
  const riskClusters = generateBankRiskClusters(riskScore);
  
  return {
    name: bankName,
    description: businessDetails.market_position,
    category: 'Bank',
    accreditation_status: 'APPROVED',
    risk_score: riskScore,
    chosen_score: chosenScore,
    risk_clusters: riskClusters,
    revenue: businessDetails.revenue,
    revenue_tier: businessDetails.revenue_tier,
    legal_structure: businessDetails.legal_structure,
    market_position: businessDetails.market_position,
    hq_address: businessDetails.hq_address,
    website_url: businessDetails.website_url,
    products_services: businessDetails.products_services,
    incorporation_year: businessDetails.incorporation_year,
    founders_and_leadership: businessDetails.founders_and_leadership,
    num_employees: businessDetails.num_employees,
    key_clients_partners: businessDetails.key_clients_partners,
    investors: businessDetails.investors,
    funding_stage: businessDetails.funding_stage,
    exit_strategy_history: businessDetails.exit_strategy_history,
    certifications_compliance: businessDetails.certifications_compliance,
    onboarding_company_completed: true, // Banks are fully onboarded
    available_tabs: getBankAvailableTabs(),
    is_demo: false, // Production data, not demo
    demo_persona_type: 'data-provider',
    files_public: businessDetails.files_public,
    files_private: businessDetails.files_private
  };
}

/**
 * Main bank generation function
 */
export async function generateBankCompanies(
  count: number = 75,
  logProgress?: (progress: ProgressCallback) => void
): Promise<void> {
  const startTime = Date.now();
  
  console.log(`[BankGenerator] 🏦 Starting generation of ${count} bank companies`);
  
  // Default progress logger
  const defaultLogProgress = (progress: ProgressCallback) => {
    console.log(`[BankGenerator] ${progress.phase}: ${progress.current}/${progress.total} (${progress.percentage}%)`);
  };
  
  const progressLogger = logProgress || defaultLogProgress;
  
  try {
    // ========================================
    // PHASE 1: DATA GENERATION (25%)
    // ========================================
    
    progressLogger({ current: 0, total: count, phase: 'Generating bank company data', percentage: 5 });
    
    const bankCompanies: BankCompany[] = [];
    
    for (let i = 0; i < count; i++) {
      const bankData = await generateBankData(i);
      bankCompanies.push(bankData);
      
      // Progress tracking
      const currentProgress = Math.floor((i + 1) / count * 20) + 5;
      progressLogger({
        current: i + 1,
        total: count,
        phase: `Generating bank data (${i + 1}/${count})`,
        percentage: currentProgress
      });
    }
    
    progressLogger({ current: count, total: count, phase: 'Bank data generation complete', percentage: 25 });
    
    // ========================================
    // PHASE 2: DATABASE INSERTION (50%)
    // ========================================
    
    progressLogger({ current: 0, total: count, phase: 'Inserting banks into database', percentage: 30 });
    
    const insertedBanks = [];
    const batchSize = Math.min(5, count); // Smaller batches for banks
    
    // Insert banks in batches
    for (let i = 0; i < bankCompanies.length; i += batchSize) {
      const batch = bankCompanies.slice(i, i + batchSize);
      
      const batchResults = await db.insert(companies).values(batch.map(bank => ({
        name: bank.name,
        description: bank.description,
        category: bank.category,
        accreditation_status: bank.accreditation_status,
        risk_score: bank.risk_score,
        chosen_score: bank.chosen_score,
        risk_clusters: bank.risk_clusters,
        revenue: bank.revenue,
        revenue_tier: bank.revenue_tier,
        legal_structure: bank.legal_structure,
        market_position: bank.market_position,
        hq_address: bank.hq_address,
        website_url: bank.website_url,
        products_services: bank.products_services,
        incorporation_year: bank.incorporation_year,
        founders_and_leadership: bank.founders_and_leadership,
        num_employees: bank.num_employees,
        key_clients_partners: bank.key_clients_partners,
        investors: bank.investors,
        funding_stage: bank.funding_stage,
        exit_strategy_history: bank.exit_strategy_history,
        certifications_compliance: bank.certifications_compliance,
        onboarding_company_completed: bank.onboarding_company_completed,
        available_tabs: bank.available_tabs,
        is_demo: bank.is_demo,
        demo_persona_type: bank.demo_persona_type,
        files_public: bank.files_public,
        files_private: bank.files_private
      }))).returning({
        id: companies.id,
        name: companies.name,
        risk_score: companies.risk_score,
        risk_clusters: companies.risk_clusters
      });
      
      insertedBanks.push(...batchResults);
      
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(bankCompanies.length / batchSize);
      const currentProgress = 30 + ((i + batch.length) / count) * 20;
      
      progressLogger({
        current: i + batch.length,
        total: count,
        phase: `Inserting banks (batch ${batchNumber}/${totalBatches})`,
        percentage: Math.round(currentProgress)
      });
    }
    
    progressLogger({ current: count, total: count, phase: 'Bank insertion complete', percentage: 50 });
    
    // ========================================
    // PHASE 3: ACCREDITATION CREATION (75%)
    // ========================================
    
    progressLogger({ current: 0, total: count, phase: 'Creating bank accreditations', percentage: 55 });
    
    let accreditationCount = 0;
    for (const bank of insertedBanks) {
      try {
        // Create permanent accreditation for banks
        await AccreditationService.createAccreditation({
          companyId: bank.id,
          category: 'Bank',
          riskScore: bank.risk_score,
          riskClusters: bank.risk_clusters
        });
        
        accreditationCount++;
        
        const currentProgress = 55 + (accreditationCount / count) * 20;
        progressLogger({
          current: accreditationCount,
          total: count,
          phase: `Creating accreditations (${accreditationCount}/${count})`,
          percentage: Math.round(currentProgress)
        });
        
      } catch (error: any) {
        console.error(`[BankGenerator] ❌ Accreditation creation failed for bank ${bank.id}:`, error.message);
      }
    }
    
    progressLogger({ current: count, total: count, phase: 'Accreditation creation complete', percentage: 75 });
    
    // ========================================
    // PHASE 4: NETWORK RELATIONSHIPS (100%)
    // ========================================
    
    progressLogger({ current: 0, total: count, phase: 'Creating network relationships', percentage: 80 });
    
    // Get available FinTech companies for relationships
    const availableFinTechs = await db.query.companies.findMany({
      where: and(
        eq(companies.category, 'FinTech'),
        eq(companies.is_demo, false)
      ),
      limit: 200 // Ensure we have enough FinTechs
    });
    
    console.log(`[BankGenerator] Found ${availableFinTechs.length} available FinTech companies for relationships`);
    
    let relationshipCount = 0;
    const targetRelationshipsPerBank = Math.min(5, Math.floor(availableFinTechs.length / count));
    
    for (const bank of insertedBanks) {
      // Create relationships with random FinTechs
      const selectedFinTechs = availableFinTechs
        .sort(() => 0.5 - Math.random())
        .slice(0, targetRelationshipsPerBank);
      
      for (const fintech of selectedFinTechs) {
        try {
          // Create data provider relationship
          await db.insert(relationships).values({
            company_id: bank.id,
            related_company_id: fintech.id,
            relationship_type: 'data_provider',
            status: 'active',
            metadata: {
              created_via: 'bank_generation',
              auto_created: true,
              bank_name: bank.name,
              fintech_name: fintech.name,
              creation_date: new Date().toISOString()
            }
          });
          
          relationshipCount++;
          
        } catch (error: any) {
          console.error(`[BankGenerator] ❌ Relationship creation failed:`, {
            bank: bank.name,
            fintech: fintech.name,
            error: error.message
          });
        }
      }
      
      const currentProgress = 80 + ((insertedBanks.indexOf(bank) + 1) / count) * 20;
      progressLogger({
        current: insertedBanks.indexOf(bank) + 1,
        total: count,
        phase: `Creating relationships for ${bank.name}`,
        percentage: Math.round(currentProgress)
      });
    }
    
    // ========================================
    // COMPLETION (100%)
    // ========================================
    
    const completionTime = Date.now() - startTime;
    
    progressLogger({ current: count, total: count, phase: 'Bank generation complete!', percentage: 100 });
    
    console.log(`[BankGenerator] 🎉 Generation completed successfully:`, {
      banksCreated: insertedBanks.length,
      accreditationsCreated: accreditationCount,
      relationshipsCreated: relationshipCount,
      avgRelationshipsPerBank: Math.round(relationshipCount / insertedBanks.length * 100) / 100,
      totalDuration: `${Math.round(completionTime / 1000)}s`,
      successRate: `${Math.round((insertedBanks.length / count) * 100)}%`
    });
    
  } catch (error: any) {
    console.error('[BankGenerator] 💥 Generation failed:', {
      error: error.message,
      stack: error.stack?.substring(0, 500)
    });
    throw error;
  }
}

/**
 * Validate bank generation results
 */
export async function validateBankGeneration(): Promise<void> {
  console.log('[BankGenerator] 🔍 Validating generation results...');
  
  try {
    const bankCount = await db.select().from(companies).where(eq(companies.category, 'Bank'));
    const bankAccreditations = await db.select().from(accreditationHistory).where(
      sql`company_id IN (SELECT id FROM companies WHERE category = 'Bank')`
    );
    const bankRelationships = await db.select().from(relationships).where(
      sql`company_id IN (SELECT id FROM companies WHERE category = 'Bank')`
    );
    
    console.log(`[BankGenerator] ✅ Validation complete:`);
    console.log(`- Total Bank companies: ${bankCount.length}`);
    console.log(`- Bank accreditations: ${bankAccreditations.length}`);
    console.log(`- Bank relationships: ${bankRelationships.length}`);
    console.log(`- Avg relationships per bank: ${Math.round(bankRelationships.length / bankCount.length * 100) / 100}`);
    
  } catch (error) {
    console.error('[BankGenerator] ❌ Validation failed:', error);
    throw error;
  }
}

/**
 * Export utility functions for testing
 */
export {
  generateBankRiskScore,
  generateBankRiskClusters,
  getBankAvailableTabs
};