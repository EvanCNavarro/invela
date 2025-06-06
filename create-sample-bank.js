/**
 * Create a sample bank using the improved generator
 */

import { db } from './db/index.js';
import { companies, accreditationHistory } from './db/schema.js';
import { generateBusinessDetails } from './server/utils/business-details-generator.js';
import { generateAdvancedCompanyName } from './server/utils/company-name-utils.js';
import { AccreditationService } from './server/services/accreditation-service.js';

async function createSampleBank() {
  console.log('Creating sample bank with improved generator...');
  
  try {
    // Generate professional banking name
    const bankName = await generateAdvancedCompanyName(
      'Banking Institution',
      1,
      { 
        persona: 'data-provider',
        lengthPreference: 'mixed',
        suffixStyle: 'professional'
      }
    );
    
    // Generate comprehensive business details
    const businessDetails = generateBusinessDetails(bankName, 'data-provider', true);
    
    // Generate banking-appropriate risk scores (2-40 range)
    const riskScore = Math.floor(Math.random() * 39) + 2;
    const chosenScore = Math.floor(Math.random() * 39) + 2;
    
    // Generate risk clusters for banks
    const riskClusters = {
      'Operational Risk': 2 + Math.floor((riskScore - 12) * 0.25),
      'Credit Risk': 2 + Math.floor((riskScore - 12) * 0.20),
      'Market Risk': 2 + Math.floor((riskScore - 12) * 0.15),
      'Liquidity Risk': 2 + Math.floor((riskScore - 12) * 0.15),
      'Compliance Risk': 2 + Math.floor((riskScore - 12) * 0.15),
      'Technology Risk': 2 + Math.floor((riskScore - 12) * 0.10)
    };
    
    // Insert bank into database
    const [insertedBank] = await db.insert(companies).values({
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
      onboarding_company_completed: true,
      available_tabs: ['dashboard', 'network', 'file-vault', 'company-profile', 'risk-monitoring', 'accreditation'],
      is_demo: false,
      demo_persona_type: 'data-provider',
      files_public: businessDetails.files_public,
      files_private: businessDetails.files_private
    }).returning({
      id: companies.id,
      name: companies.name,
      risk_score: companies.risk_score
    });
    
    // Create accreditation
    await AccreditationService.createAccreditation({
      companyId: insertedBank.id,
      category: 'Bank',
      riskScore: insertedBank.risk_score,
      riskClusters: riskClusters
    });
    
    console.log(`✅ Created bank: ${insertedBank.name} (ID: ${insertedBank.id}, Risk: ${insertedBank.risk_score})`);
    
    return insertedBank;
    
  } catch (error) {
    console.error('❌ Failed to create sample bank:', error);
    throw error;
  }
}

// Export for use
export { createSampleBank };