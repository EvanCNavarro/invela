/**
 * ========================================
 * FinTech Company Test Generator
 * ========================================
 * 
 * Test script for generating a single FinTech company with secure name validation.
 * Uses the validated company name generation API to ensure all names pass
 * blacklist validation and maintain professional standards.
 * 
 * Key Features:
 * - Secure company name generation via API
 * - Complete company profile creation
 * - Network relationship establishment
 * - Professional data integrity validation
 * 
 * Dependencies:
 * - Neon Database: Production database connection
 * - Company Name API: Validated name generation endpoint
 * 
 * @module TestFintechGenerator
 * @version 1.0.0
 * @since 2025-05-29
 */

// ========================================
// IMPORTS
// ========================================

import { neon } from '@neondatabase/serverless';

// ========================================
// TYPES & INTERFACES
// ========================================

interface CompanyData {
  name: string;
  description: string;
  category: string;
  legal_structure: string;
  market_position: string;
  hq_address: string;
  website_url: string;
  products_services: string;
  incorporation_year: number;
  founders_and_leadership: string;
  num_employees: number;
  revenue: string;
  revenue_tier: string;
  key_clients_partners: string;
  investors: string;
  funding_stage: string;
  exit_strategy_history: null;
  certifications_compliance: string;
  risk_score: number;
  risk_clusters: Record<string, number>;
  accreditation_status: string;
  onboarding_company_completed: boolean;
  files_public: string[];
  files_private: string[];
  available_tabs: string[];
  is_demo: boolean;
}

// ========================================
// MAIN FUNCTION
// ========================================

/**
 * Generates a single test FinTech company with validated data
 * 
 * @returns Promise<boolean> - Success status of company creation
 */
async function generateTestFintechCompany(): Promise<boolean> {
  console.log('Starting FinTech company generation test...');
  
  try {
    // Create database connection
    const sql = neon(process.env.DATABASE_URL);
    
    // Generate secure company name using validated API
    const nameResponse = await fetch('http://localhost:5000/api/demo/generate-company-name');
    const nameData = await nameResponse.json();
    
    if (!nameData.success || !nameData.companyName) {
      throw new Error('Failed to generate secure company name');
    }
    
    // Create comprehensive company profile
    const company: CompanyData = {
      name: nameData.companyName,
      description: 'Innovative payment processing and financial technology solutions for modern businesses.',
      category: 'FinTech',
      legal_structure: 'Private Limited Company',
      market_position: 'emerging',
      hq_address: '789 Innovation Drive, Suite 200, Austin, TX 78701, USA',
      website_url: `https://${nameData.companyName.toLowerCase().replace(/\s+/g, '')}.com`,
      products_services: 'Payment processing, API banking, financial analytics',
      incorporation_year: 2020,
      founders_and_leadership: 'Sarah Chen (CEO), Marcus Rodriguez (CTO), Li Wei (COO)',
      num_employees: 85,
      revenue: '$8.2M',
      revenue_tier: 'small',
      key_clients_partners: 'Regional credit unions, small business networks',
      investors: 'Series A: Austin Ventures, Fintech Forward Fund',
      funding_stage: 'Series A',
      exit_strategy_history: null,
      certifications_compliance: 'SOC 2 Type II, PCI DSS Level 1',
      risk_score: 25,
      risk_clusters: {
        "Dark Web Data": 3,
        "Cyber Security": 4,
        "Public Sentiment": 2,
        "Data Access Scope": 5,
        "Financial Stability": 6,
        "Potential Liability": 5
      },
      accreditation_status: 'APPROVED',
      onboarding_company_completed: false,
      files_public: ['company_profile.pdf', 'certifications.pdf'],
      files_private: ['financial_statements.pdf', 'audit_report.pdf'],
      available_tabs: ['task-center'],
      is_demo: false
    };
    
    // Insert company into database
    const result = await sql`
      INSERT INTO companies (
        name, description, category, legal_structure, market_position,
        hq_address, website_url, products_services, incorporation_year,
        founders_and_leadership, num_employees, revenue, revenue_tier,
        key_clients_partners, investors, funding_stage, exit_strategy_history,
        certifications_compliance, risk_score, risk_clusters,
        accreditation_status, onboarding_company_completed,
        files_public, files_private, available_tabs, is_demo
      ) VALUES (
        ${company.name}, ${company.description}, ${company.category},
        ${company.legal_structure}, ${company.market_position},
        ${company.hq_address}, ${company.website_url}, ${company.products_services},
        ${company.incorporation_year}, ${company.founders_and_leadership},
        ${company.num_employees}, ${company.revenue}, ${company.revenue_tier},
        ${company.key_clients_partners}, ${company.investors}, ${company.funding_stage},
        ${company.exit_strategy_history}, ${company.certifications_compliance},
        ${company.risk_score}, ${JSON.stringify(company.risk_clusters)},
        ${company.accreditation_status}, ${company.onboarding_company_completed},
        ${company.files_public}, ${company.files_private},
        ${company.available_tabs}, ${company.is_demo}
      ) RETURNING id, name
    `;
    
    const newCompany = result[0];
    
    // Establish network relationship with Invela
    await sql`
      INSERT INTO relationships (
        company_id, related_company_id, relationship_type, status, metadata
      ) VALUES (
        1, ${newCompany.id}, 'network_member', 'active',
        ${JSON.stringify({
          created_via: 'test_generation',
          auto_created: true,
          company_name: newCompany.name,
          creation_date: new Date().toISOString()
        })}
      )
    `;
    
    console.log('Successfully created test company:');
    console.log(`  - ID: ${newCompany.id}`);
    console.log(`  - Name: ${newCompany.name}`);
    console.log(`  - Status: ${company.accreditation_status}`);
    console.log(`  - Risk Score: ${company.risk_score}`);
    console.log('  - Network relationship established');
    
    return true;
    
  } catch (error) {
    console.error('Test generation failed:', error);
    return false;
  }
}

// ========================================
// EXECUTION
// ========================================

generateTestFintechCompany();