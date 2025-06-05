/**
 * ========================================
 * Single Company Test Generator
 * ========================================
 * 
 * Test utility to generate and validate a single FinTech company
 * before running the full 100-company generation process.
 * 
 * @module TestSingleCompany
 * @version 1.0.0
 * @since 2025-05-27
 */

import { db } from "@db";
import { companies as companiesTable, relationships as relationshipsTable } from "@db/schema";
import { eq } from "drizzle-orm";

/**
 * Test generates a single FinTech company to validate the process
 */
export async function testSingleCompanyGeneration(): Promise<void> {
  console.log('[TestCompany] Starting single company generation test...');
  
  try {
    // Create test company data
    const testCompany = {
      name: 'StreamPay Solutions',
      description: 'Innovative payment processing platform focused on enterprise-grade solutions',
      category: 'FinTech' as const,
      legal_structure: 'Corporation',
      market_position: 'Leading payment processing provider serving enterprise clients',
      hq_address: '123 Tech Blvd, San Francisco, CA, USA',
      website_url: 'https://streampay.com',
      products_services: 'Payment Processing solutions, API integrations, compliance tools',
      incorporation_year: 2015,
      founders_and_leadership: 'Sarah Chen (CEO), Former Goldman Sachs executive',
      num_employees: 1500,
      revenue: '$85 million ARR',
      revenue_tier: 'large' as const,
      key_clients_partners: 'Microsoft, JPMorgan',
      investors: 'Andreessen Horowitz, Goldman Sachs Ventures',
      funding_stage: 'Series C',
      exit_strategy_history: null,
      certifications_compliance: 'PCI DSS Level 1, SOC 2 Type II, ISO 27001',
      risk_score: 25,
      risk_clusters: {
        "Dark Web Data": 5,
        "Cyber Security": 4,
        "Public Sentiment": 3,
        "Data Access Scope": 4,
        "Financial Stability": 5,
        "Potential Liability": 4
      },
      accreditation_status: 'APPROVED' as const,
      onboarding_company_completed: true,
      files_public: ['compliance_report_2024.pdf', 'audit_summary.pdf', 'security_overview.pdf'],
      files_private: ['internal_audit_2024.pdf', 'security_assessment.pdf', 'financial_statements.pdf', 'risk_analysis.pdf'],
      available_tabs: ['task-center'],
      is_demo: false
    };

    console.log('[TestCompany] Inserting test company into database...');
    
    // Insert company
    const [insertedCompany] = await db.insert(companiesTable).values([testCompany]).returning({ 
      id: companiesTable.id, 
      name: companiesTable.name 
    });

    console.log('[TestCompany] ✅ Company inserted:', {
      id: insertedCompany.id,
      name: insertedCompany.name
    });

    // Create network relationship
    const relationshipData = {
      company_id: 1, // Invela
      related_company_id: insertedCompany.id,
      relationship_type: 'network_member' as const,
      status: 'active' as const,
      metadata: {
        created_via: 'test_single_company',
        auto_created: true,
        company_name: insertedCompany.name,
        creation_date: new Date().toISOString()
      }
    };

    console.log('[TestCompany] Creating network relationship...');
    
    await db.insert(relationshipsTable).values([relationshipData]);

    console.log('[TestCompany] ✅ Network relationship created');

    // Validate by querying the company back
    const [validatedCompany] = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.id, insertedCompany.id));

    if (!validatedCompany) {
      throw new Error('Company validation failed - could not retrieve inserted company');
    }

    console.log('[TestCompany] ✅ Validation successful:', {
      id: validatedCompany.id,
      name: validatedCompany.name,
      category: validatedCompany.category,
      accreditation_status: validatedCompany.accreditation_status,
      risk_score: validatedCompany.risk_score,
      is_demo: validatedCompany.is_demo
    });

    console.log('[TestCompany] ✅ Single company test completed successfully!');
    
  } catch (error) {
    console.error('[TestCompany] ❌ Test failed:', error);
    throw error;
  }
}

/**
 * Validates the test company creation
 */
export async function validateTestCompany(): Promise<void> {
  console.log('[TestCompany] Validating test results...');
  
  try {
    const testCompanies = await db.select()
      .from(companiesTable)
      .where(eq(companiesTable.name, 'StreamPay Solutions'));

    console.log(`[TestCompany] ✅ Found ${testCompanies.length} test company(ies)`);
    
    if (testCompanies.length > 0) {
      console.log('[TestCompany] Test company details:', {
        id: testCompanies[0].id,
        name: testCompanies[0].name,
        category: testCompanies[0].category,
        accreditation_status: testCompanies[0].accreditation_status
      });
    }
    
  } catch (error) {
    console.error('[TestCompany] ❌ Validation failed:', error);
    throw error;
  }
}