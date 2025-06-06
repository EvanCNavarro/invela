/**
 * Test script to create 10 diverse banks with the improved generator
 */

import { db } from './db/index.js';
import { companies, accreditationHistory } from './db/schema.js';
import { generateBusinessDetails } from './server/utils/business-details-generator.js';
import { generateAdvancedCompanyName } from './server/utils/company-name-utils.js';

// Generate standard platform risk clusters
function generateBankRiskClusters(totalScore) {
  const remaining = Math.max(0, totalScore);
  
  const clusters = {
    'Dark Web Data': Math.floor(remaining * 0.05),
    'Cyber Security': Math.floor(remaining * 0.20), 
    'Public Sentiment': Math.floor(remaining * 0.10),
    'Data Access Scope': Math.floor(remaining * 0.15),
    'Financial Stability': Math.floor(remaining * 0.30),
    'Potential Liability': Math.floor(remaining * 0.20)
  };
  
  return clusters;
}

// Generate risk configuration
function generateBankRiskConfiguration(riskScore, riskClusters) {
  let riskLevel = 'low';
  if (riskScore > 30) riskLevel = 'medium';
  if (riskScore > 35) riskLevel = 'high';
  if (riskScore > 40) riskLevel = 'critical';

  const dimensions = [
    {
      id: 'financial_stability',
      name: 'Financial Stability',
      color: '#4caf50',
      value: riskClusters['Financial Stability'],
      weight: 30,
      description: 'Financial health and sustainability of the banking institution'
    },
    {
      id: 'cyber_security',
      name: 'Cyber Security', 
      color: '#2196f3',
      value: riskClusters['Cyber Security'],
      weight: 25,
      description: 'Protection against digital threats and vulnerabilities'
    },
    {
      id: 'potential_liability',
      name: 'Potential Liability',
      color: '#ff9800', 
      value: riskClusters['Potential Liability'],
      weight: 20,
      description: 'Risk exposure from regulatory compliance and operations'
    },
    {
      id: 'data_access_scope',
      name: 'Data Access Scope',
      color: '#009688',
      value: riskClusters['Data Access Scope'], 
      weight: 15,
      description: 'Extent and sensitivity of customer data being processed'
    },
    {
      id: 'public_sentiment',
      name: 'Public Sentiment',
      color: '#ffc107',
      value: riskClusters['Public Sentiment'],
      weight: 7,
      description: 'Public perception and reputation in the market'
    },
    {
      id: 'dark_web_data',
      name: 'Dark Web Data',
      color: '#9c27b0',
      value: riskClusters['Dark Web Data'],
      weight: 3,
      description: 'Presence of sensitive information on the dark web'
    }
  ];

  return {
    score: riskScore,
    riskLevel,
    dimensions,
    thresholds: {
      low: 30,
      medium: 60,
      high: 85
    }
  };
}

// Generate risk priorities
function generateBankRiskPriorities(riskScore, dimensions) {
  return {
    dimensions,
    riskAcceptanceLevel: riskScore,
    lastUpdated: new Date().toISOString()
  };
}

async function create10Banks() {
  console.log('Creating 10 diverse banks...');
  
  const createdBanks = [];
  
  for (let i = 0; i < 10; i++) {
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
      
      // Generate risk scores (2-40 range for banks)
      const riskScore = Math.floor(Math.random() * 39) + 2;
      const chosenScore = Math.floor(Math.random() * 39) + 2;
      
      // Generate risk clusters
      const riskClusters = generateBankRiskClusters(riskScore);
      
      // Generate risk configuration and priorities
      const riskConfiguration = generateBankRiskConfiguration(riskScore, riskClusters);
      const riskPriorities = generateBankRiskPriorities(riskScore, riskConfiguration.dimensions);
      
      // Insert bank into database
      const [insertedBank] = await db.insert(companies).values({
        name: bankName,
        description: businessDetails.market_position,
        category: 'Bank',
        accreditation_status: 'APPROVED',
        risk_score: riskScore,
        chosen_score: chosenScore,
        risk_clusters: riskClusters,
        risk_configuration: riskConfiguration,
        risk_priorities: riskPriorities,
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
        demo_cleanup_eligible: false,
        demo_persona_type: 'data-provider',
        files_public: businessDetails.files_public,
        files_private: businessDetails.files_private
      }).returning({
        id: companies.id,
        name: companies.name,
        risk_score: companies.risk_score,
        revenue: companies.revenue,
        num_employees: companies.num_employees,
        incorporation_year: companies.incorporation_year
      });
      
      // Create accreditation
      const maxAccreditation = await db.select({ max: sql`MAX(accreditation_number)` }).from(accreditationHistory);
      const nextAccreditationNumber = (maxAccreditation[0]?.max || 0) + 1;
      
      const [accreditation] = await db.insert(accreditationHistory).values({
        company_id: insertedBank.id,
        accreditation_number: nextAccreditationNumber,
        risk_score: riskScore,
        issued_date: new Date(),
        expires_date: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years
        status: 'active',
        risk_clusters: riskClusters
      }).returning({ id: accreditationHistory.id });
      
      // Update bank with accreditation reference
      await db.update(companies)
        .set({
          current_accreditation_id: accreditation.id,
          first_accredited_date: new Date(),
          accreditation_count: 1
        })
        .where(eq(companies.id, insertedBank.id));
      
      createdBanks.push({
        ...insertedBank,
        accreditationId: accreditation.id
      });
      
      console.log(`✅ Created bank ${i + 1}/10: ${insertedBank.name}`);
      
    } catch (error) {
      console.error(`❌ Failed to create bank ${i + 1}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Successfully created ${createdBanks.length}/10 banks:`);
  createdBanks.forEach((bank, index) => {
    console.log(`${index + 1}. ${bank.name} - Risk: ${bank.risk_score}, Revenue: ${bank.revenue}, Employees: ${bank.num_employees}`);
  });
  
  return createdBanks;
}

// Run the test
create10Banks().catch(console.error);