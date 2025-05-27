/**
 * ========================================
 * FinTech Company Generator Utility
 * ========================================
 * 
 * Comprehensive utility for generating 100 diverse FinTech companies
 * for bank network selection scenarios. Creates authentic business data
 * with proper variance across all dimensions while maintaining data integrity.
 * 
 * Key Features:
 * - Authentic business name and address generation
 * - Mathematical risk score consistency
 * - Balanced accreditation status distribution
 * - Realistic financial and operational data
 * - Comprehensive logging and error handling
 * 
 * Dependencies:
 * - Database: Drizzle ORM for data persistence
 * - Logging: Console-based with structured formatting
 * 
 * @module FinTechCompanyGenerator
 * @version 1.0.0
 * @since 2025-05-27
 */

// ========================================
// IMPORTS
// ========================================

import { db } from "@db";
import { companies as companiesTable, relationships as relationshipsTable } from "@db/schema";
import { eq, and } from "drizzle-orm";

// ========================================
// TYPES & INTERFACES
// ========================================

interface FinTechCompany {
  name: string;
  description: string;
  category: 'FinTech';
  legal_structure: string;
  market_position: string;
  hq_address: string;
  website_url: string;
  products_services: string;
  incorporation_year: number;
  founders_and_leadership: string;
  num_employees: number;
  revenue: string;
  revenue_tier: 'small' | 'medium' | 'large' | 'xlarge';
  key_clients_partners: string;
  investors: string;
  funding_stage: string;
  exit_strategy_history: string | null;
  certifications_compliance: string;
  risk_score: number | null; // Only populated for APPROVED companies
  risk_clusters: {
    "Dark Web Data": number;
    "Cyber Security": number;
    "Public Sentiment": number;
    "Data Access Scope": number;
    "Financial Stability": number;
    "Potential Liability": number;
  } | null; // Only populated for APPROVED companies
  accreditation_status: 'APPROVED' | 'PENDING';
  onboarding_company_completed: boolean;
  files_public: string[];
  files_private: string[];
  available_tabs: string[];
  is_demo: boolean;
  demo_cleanup_eligible: boolean;
}

interface NetworkRelationship {
  company_id: number; // Invela ID
  related_company_id: number; // New FinTech company ID
  relationship_type: 'network_member';
  status: 'active';
  metadata: {
    created_via: 'bulk_fintech_generation';
    auto_created: boolean;
    company_name: string;
    creation_date: string;
  };
}

interface GenerationProgress {
  current: number;
  total: number;
  phase: string;
  percentage: number;
}

// ========================================
// CONSTANTS
// ========================================

const COMPANY_NAME_PREFIXES = [
  'Stream', 'Nova', 'Quantum', 'Velocity', 'Secure', 'Flexi', 'Neo', 'Tech', 'Crypto', 'Digital',
  'Smart', 'Rapid', 'Elite', 'Prime', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Sigma', 'Apex'
];

const COMPANY_NAME_CORES = [
  'Pay', 'Finance', 'Capital', 'Vault', 'Credit', 'Flow', 'Link', 'Core', 'Net', 'Sync',
  'Wave', 'Bridge', 'Path', 'Gate', 'Hub', 'Zone', 'Edge', 'Pulse', 'Spark', 'Beam'
];

const COMPANY_NAME_SUFFIXES = [
  'Solutions', 'Technologies', 'Systems', 'Ventures', 'Labs', 'Financial', 'Capital', 'Corp',
  'Inc', 'Group', 'Partners', 'Holdings', 'Dynamics', 'Innovations', 'Analytics', 'Platforms'
];

const LEGAL_STRUCTURES = {
  APPROVED: ['Corporation', 'Public company', 'Corporation'],
  PENDING: ['LLC', 'Private', 'Private Limited Company', 'Private Company']
};

const FUNDING_STAGES = {
  APPROVED: ['Series C', 'Series D', 'Series E', 'Series F', 'IPO', 'Public'],
  PENDING: ['Seed', 'Series A', 'Series B', 'Early-stage', 'Pre-Series A']
};

const BUSINESS_SECTORS = [
  'Payment Processing', 'Lending Platforms', 'Wealth Management', 'Cryptocurrency',
  'Insurance Tech', 'B2B Financial Services', 'Credit Services', 'RegTech',
  'Open Banking', 'Digital Banking', 'Robo-Advisory', 'Fraud Detection'
];

const CITIES = [
  { city: 'San Francisco', state: 'CA', country: 'USA' },
  { city: 'New York', state: 'NY', country: 'USA' },
  { city: 'Austin', state: 'TX', country: 'USA' },
  { city: 'Boston', state: 'MA', country: 'USA' },
  { city: 'Seattle', state: 'WA', country: 'USA' },
  { city: 'Miami', state: 'FL', country: 'USA' },
  { city: 'Denver', state: 'CO', country: 'USA' },
  { city: 'Portland', state: 'OR', country: 'USA' },
  { city: 'Chicago', state: 'IL', country: 'USA' },
  { city: 'London', state: '', country: 'UK' },
  { city: 'Toronto', state: 'ON', country: 'Canada' },
  { city: 'Singapore', state: '', country: 'Singapore' }
];

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generates random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Selects random element from array
 */
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Logs progress with structured formatting
 */
function logProgress(progress: GenerationProgress): void {
  const percentage = Math.round(progress.percentage);
  console.log(`[FinTechGenerator] Progress: ${percentage}% (${progress.current}/${progress.total}) - ${progress.phase}`);
}

/**
 * Generates authentic company name with proper variance
 */
function generateCompanyName(): string {
  const patterns = [
    () => `${randomChoice(COMPANY_NAME_PREFIXES)}${randomChoice(COMPANY_NAME_CORES)} ${randomChoice(COMPANY_NAME_SUFFIXES)}`,
    () => `${randomChoice(COMPANY_NAME_PREFIXES)}${randomChoice(COMPANY_NAME_CORES)}`,
    () => `${randomChoice(COMPANY_NAME_CORES)}${randomChoice(COMPANY_NAME_SUFFIXES)}`,
    () => `${randomChoice(COMPANY_NAME_PREFIXES)} ${randomChoice(COMPANY_NAME_CORES)} ${randomChoice(COMPANY_NAME_SUFFIXES)}`
  ];
  
  return randomChoice(patterns)();
}

/**
 * Generates realistic business address
 */
function generateAddress(): string {
  const location = randomChoice(CITIES);
  const streetNumber = randomInt(100, 9999);
  const streetNames = ['Main St', 'Market St', 'Broadway', 'First Ave', 'Tech Blvd', 'Innovation Dr', 'Financial Way'];
  const streetName = randomChoice(streetNames);
  
  if (location.state) {
    return `${streetNumber} ${streetName}, ${location.city}, ${location.state}, ${location.country}`;
  }
  return `${streetNumber} ${streetName}, ${location.city}, ${location.country}`;
}

/**
 * Generates risk clusters that mathematically sum to risk score
 */
function generateRiskClusters(targetRiskScore: number): FinTechCompany['risk_clusters'] {
  const clusters = {
    "Dark Web Data": 0,
    "Cyber Security": 0,
    "Public Sentiment": 0,
    "Data Access Scope": 0,
    "Financial Stability": 0,
    "Potential Liability": 0
  };
  
  const clusterKeys = Object.keys(clusters) as Array<keyof typeof clusters>;
  let remainingScore = targetRiskScore;
  
  // Distribute score across clusters with some randomness
  for (let i = 0; i < clusterKeys.length - 1; i++) {
    const maxForThisCluster = Math.min(remainingScore, Math.floor(targetRiskScore / 3));
    const clusterScore = randomInt(0, maxForThisCluster);
    clusters[clusterKeys[i]] = clusterScore;
    remainingScore -= clusterScore;
  }
  
  // Assign remaining score to last cluster
  clusters[clusterKeys[clusterKeys.length - 1]] = remainingScore;
  
  return clusters;
}

// ========================================
// MAIN GENERATOR FUNCTIONS
// ========================================

/**
 * Generates a single FinTech company with authentic data
 */
function generateFinTechCompany(index: number, isApproved: boolean): FinTechCompany {
  const companyName = generateCompanyName();
  const riskScore = isApproved ? randomInt(1, 35) : randomInt(65, 95);
  const sector = randomChoice(BUSINESS_SECTORS);
  const location = randomChoice(CITIES);
  
  // Employee count based on revenue tier and approval status
  const employeeRanges = {
    small: { min: 25, max: 500 },
    medium: { min: 501, max: 3000 },
    large: { min: 3001, max: 8000 },
    xlarge: { min: 8001, max: 15000 }
  };
  
  const revenueTiers = isApproved 
    ? ['medium', 'large', 'xlarge']
    : ['small', 'medium'];
  
  const revenueTier = randomChoice(revenueTiers) as 'small' | 'medium' | 'large' | 'xlarge';
  const numEmployees = randomInt(
    employeeRanges[revenueTier].min, 
    employeeRanges[revenueTier].max
  );
  
  return {
    name: companyName,
    description: `Innovative ${sector.toLowerCase()} platform focused on ${isApproved ? 'enterprise-grade' : 'emerging market'} solutions`,
    category: 'FinTech',
    legal_structure: randomChoice(LEGAL_STRUCTURES[isApproved ? 'APPROVED' : 'PENDING']),
    market_position: isApproved 
      ? `Leading ${sector.toLowerCase()} provider serving enterprise clients`
      : `Emerging ${sector.toLowerCase()} platform targeting ${randomChoice(['SMBs', 'retail customers', 'startups'])}`,
    hq_address: generateAddress(),
    website_url: `https://${companyName.toLowerCase().replace(/\s+/g, '')}.${randomChoice(['com', 'io', 'co'])}`,
    products_services: `${sector} solutions, API integrations, ${randomChoice(['compliance tools', 'analytics platform', 'mobile apps', 'enterprise dashboard'])}`,
    incorporation_year: isApproved ? randomInt(2010, 2018) : randomInt(2018, 2022),
    founders_and_leadership: `${randomChoice(['Sarah Chen', 'Michael Rodriguez', 'Jessica Park', 'David Kim', 'Maria Garcia'])} (CEO), ${randomChoice(['Former Goldman Sachs', 'Ex-Stripe', 'Ex-PayPal', 'Former JPMorgan', 'Ex-Square'])} executive`,
    num_employees: numEmployees,
    revenue: `$${randomInt(10, 200)} million ARR`,
    revenue_tier: revenueTier,
    key_clients_partners: isApproved 
      ? `${randomChoice(['Microsoft', 'Salesforce', 'Adobe', 'Oracle'])}, ${randomChoice(['JPMorgan', 'Wells Fargo', 'Bank of America'])}`
      : `${randomChoice(['Various startups', 'Regional banks', 'SMB clients', 'Emerging markets'])}`,
    investors: isApproved
      ? `${randomChoice(['Andreessen Horowitz', 'Sequoia Capital', 'Kleiner Perkins'])}, ${randomChoice(['Goldman Sachs Ventures', 'JPMorgan Strategic'])} `
      : `${randomChoice(['Pantera Capital', 'Coinbase Ventures', 'Individual angels', 'Seed funds'])}`,
    funding_stage: randomChoice(FUNDING_STAGES[isApproved ? 'APPROVED' : 'PENDING']),
    exit_strategy_history: isApproved && randomInt(1, 4) === 1 
      ? `Acquired ${randomChoice(['payment processor', 'compliance platform', 'analytics company'])} in ${randomInt(2019, 2023)}`
      : null,
    certifications_compliance: isApproved
      ? `PCI DSS Level 1, SOC 2 Type II, ${randomChoice(['ISO 27001', 'GDPR compliant', 'FedRAMP certified'])}`
      : `Basic PCI compliance, ${randomChoice(['SOC 2 in progress', 'ISO 27001 planned', 'GDPR compliant'])}`,
    risk_score: isApproved ? riskScore : null, // Only APPROVED companies have risk scores
    risk_clusters: isApproved ? generateRiskClusters(riskScore) : null, // Only APPROVED companies have risk clusters
    accreditation_status: isApproved ? 'APPROVED' : 'PENDING',
    onboarding_company_completed: isApproved, // Only APPROVED companies have completed onboarding
    files_public: isApproved 
      ? ['compliance_report_2024.pdf', 'audit_summary.pdf', 'security_overview.pdf']
      : ['business_overview.pdf', 'compliance_basic.pdf'],
    files_private: isApproved
      ? ['internal_audit_2024.pdf', 'security_assessment.pdf', 'financial_statements.pdf', 'risk_analysis.pdf']
      : ['risk_assessment.pdf', 'technical_architecture.pdf', 'financial_projections.pdf'],
    available_tabs: isApproved 
      ? ['dashboard', 'task-center', 'file-vault', 'insights'] // APPROVED companies get all tabs
      : ['task-center'], // PENDING companies only get task-center
    is_demo: false, // Production companies for network selection
    demo_cleanup_eligible: false // Protect from deletion
  };
}

// ========================================
// MAIN EXECUTION FUNCTIONS
// ========================================

/**
 * Generates specified number of FinTech companies and inserts them into database
 */
export async function generateFinTechCompanies(count: number = 100): Promise<void> {
  console.log(`[FinTechGenerator] Starting generation of ${count} FinTech companies...`);
  
  try {
    // ========================================
    // PHASE 1: GENERATE COMPANY DATA (20%)
    // ========================================
    
    logProgress({ current: 0, total: count, phase: 'Generating company data structures', percentage: 5 });
    
    const companies: FinTechCompany[] = [];
    
    // Calculate split between approved and pending (50/50 split)
    const approvedCount = Math.ceil(count / 2);
    const pendingCount = count - approvedCount;
    
    // Generate approved companies
    for (let i = 0; i < approvedCount; i++) {
      companies.push(generateFinTechCompany(i, true));
      if (i % Math.max(1, Math.floor(approvedCount / 5)) === 0) {
        logProgress({ 
          current: i, 
          total: approvedCount, 
          phase: `Generating APPROVED companies (${i}/${approvedCount})`, 
          percentage: 5 + (i / count) * 10 
        });
      }
    }
    
    // Generate pending companies  
    for (let i = 0; i < pendingCount; i++) {
      companies.push(generateFinTechCompany(i + approvedCount, false));
      if (i % Math.max(1, Math.floor(pendingCount / 5)) === 0) {
        logProgress({ 
          current: approvedCount + i, 
          total: count, 
          phase: `Generating PENDING companies (${i}/${pendingCount})`, 
          percentage: 15 + ((approvedCount + i) / count) * 10 
        });
      }
    }
    
    logProgress({ current: count, total: count, phase: 'Company data generation complete', percentage: 25 });
    
    // ========================================
    // PHASE 2: DATABASE INSERTION (50%)
    // ========================================
    
    logProgress({ current: 0, total: count, phase: 'Inserting companies into database', percentage: 30 });
    
    const insertedCompanies = [];
    const batchSize = Math.min(10, count);
    
    // Insert companies in batches
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      const batchResults = await db.insert(companiesTable).values(batch).returning({ id: companiesTable.id, name: companiesTable.name });
      insertedCompanies.push(...batchResults);
      
      const batchNumber = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(companies.length / batchSize);
      logProgress({ 
        current: i + batch.length, 
        total: count, 
        phase: `Inserting companies (batch ${batchNumber}/${totalBatches})`, 
        percentage: 30 + ((i + batch.length) / count) * 40 
      });
    }
    
    logProgress({ current: count, total: count, phase: 'Company insertion complete', percentage: 70 });
    
    // ========================================
    // PHASE 3: RELATIONSHIP CREATION (25%)
    // ========================================
    
    logProgress({ current: 0, total: count, phase: 'Creating network relationships', percentage: 75 });
    
    const relationshipData: NetworkRelationship[] = insertedCompanies.map((company, index) => ({
      company_id: 1, // Invela
      related_company_id: company.id,
      relationship_type: 'network_member',
      status: 'active',
      metadata: {
        created_via: 'bulk_fintech_generation',
        auto_created: true,
        company_name: company.name,
        creation_date: new Date().toISOString()
      }
    }));
    
    // Insert relationships in batches
    const relationshipBatchSize = Math.min(20, count);
    for (let i = 0; i < relationshipData.length; i += relationshipBatchSize) {
      const batch = relationshipData.slice(i, i + relationshipBatchSize);
      await db.insert(relationshipsTable).values(batch);
      
      const batchNumber = Math.floor(i/relationshipBatchSize) + 1;
      const totalBatches = Math.ceil(relationshipData.length / relationshipBatchSize);
      logProgress({ 
        current: i + batch.length, 
        total: count, 
        phase: `Creating relationships (batch ${batchNumber}/${totalBatches})`, 
        percentage: 75 + ((i + batch.length) / count) * 20 
      });
    }
    
    // ========================================
    // COMPLETION (100%)
    // ========================================
    
    logProgress({ current: count, total: count, phase: 'Generation complete!', percentage: 100 });
    
    console.log(`[FinTechGenerator] ✅ Successfully generated ${count} FinTech companies`);
    console.log(`[FinTechGenerator] - ${approvedCount} APPROVED companies (risk scores 1-35)`);
    console.log(`[FinTechGenerator] - ${pendingCount} PENDING companies (risk scores 65-95)`);
    console.log(`[FinTechGenerator] - All companies linked to Invela network`);
    console.log(`[FinTechGenerator] - Company IDs: ${insertedCompanies[0]?.id} - ${insertedCompanies[insertedCompanies.length - 1]?.id}`);
    
  } catch (error) {
    console.error('[FinTechGenerator] ❌ Generation failed:', error);
    throw error;
  }
}

/**
 * Validates generation results
 */
export async function validateGeneration(): Promise<void> {
  console.log('[FinTechGenerator] Validating generation results...');
  
  try {
    const fintechCount = await db.select().from(companiesTable).where(eq(companiesTable.category, 'FinTech'));
    const approvedCount = await db.select().from(companiesTable).where(
      and(eq(companiesTable.category, 'FinTech'), eq(companiesTable.accreditation_status, 'APPROVED'))
    );
    const pendingCount = await db.select().from(companiesTable).where(
      and(eq(companiesTable.category, 'FinTech'), eq(companiesTable.accreditation_status, 'PENDING'))
    );
    
    console.log(`[FinTechGenerator] ✅ Validation complete:`);
    console.log(`- Total FinTech companies: ${fintechCount.length}`);
    console.log(`- APPROVED companies: ${approvedCount.length}`);
    console.log(`- PENDING companies: ${pendingCount.length}`);
    
  } catch (error) {
    console.error('[FinTechGenerator] ❌ Validation failed:', error);
    throw error;
  }
}