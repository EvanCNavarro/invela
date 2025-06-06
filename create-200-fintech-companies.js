/**
 * Create 200 Fintech companies with corrected accreditation logic
 * Uses the improved generator with proper accreditation consistency
 */

import { Pool } from 'pg';

// Initialize database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Fintech specializations for diversity
const fintechSpecializations = [
  'Digital payment processing',
  'AI-powered credit scoring',
  'Cryptocurrency trading',
  'Robo-advisory services',
  'RegTech compliance automation',
  'Supply chain financing',
  'Peer-to-peer lending',
  'Digital banking platform',
  'InsurTech solutions',
  'Blockchain analytics',
  'Trade finance automation',
  'Wealth management technology',
  'Financial data analytics',
  'Identity verification services',
  'API banking solutions',
  'Investment platform technology',
  'Cross-border remittances',
  'Digital asset custody',
  'Automated underwriting',
  'Financial planning software',
  'Open banking solutions',
  'Real estate fintech',
  'Carbon credit trading',
  'Embedded finance solutions',
  'Alternative credit scoring'
];

// Professional fintech company name patterns
const fintechNamePatterns = [
  'Tech', 'Pay', 'Finance', 'Capital', 'Solutions', 'Analytics', 'Digital', 
  'Smart', 'Pro', 'Edge', 'Flow', 'Dynamics', 'Innovation', 'Vault', 
  'Connect', 'Bridge', 'Stream', 'Core', 'Prime', 'Nexus', 'Wave', 
  'Link', 'Sphere', 'Matrix', 'Fusion', 'Labs', 'Systems', 'Platform'
];

const fintechPrefixes = [
  'Apex', 'Nova', 'Quantum', 'Stellar', 'Vertex', 'Zenith', 'Prism',
  'Vector', 'Nexus', 'Sigma', 'Delta', 'Alpha', 'Beta', 'Gamma',
  'Omega', 'Pulse', 'Peak', 'Core', 'Edge', 'Flow', 'Swift', 'Rapid',
  'Ultra', 'Meta', 'Neo', 'Pro', 'Max', 'Elite', 'Prime', 'Crown'
];

function generateFintechCompanyName() {
  const prefix = fintechPrefixes[Math.floor(Math.random() * fintechPrefixes.length)];
  const suffix = fintechNamePatterns[Math.floor(Math.random() * fintechNamePatterns.length)];
  return `${prefix}${suffix}`;
}

function generateRiskScore() {
  // Weighted distribution: 40% low (15-30), 35% medium (31-60), 25% high (61-90)
  const rand = Math.random();
  if (rand < 0.4) {
    return Math.floor(Math.random() * 16) + 15; // 15-30 (low)
  } else if (rand < 0.75) {
    return Math.floor(Math.random() * 30) + 31; // 31-60 (medium)
  } else {
    return Math.floor(Math.random() * 30) + 61; // 61-90 (high)
  }
}

function generateRiskClusters(riskScore) {
  const total = riskScore;
  const clusters = {};
  const categories = ["Dark Web Data", "Cyber Security", "Public Sentiment", "Data Access Scope", "Financial Stability", "Potential Liability"];
  
  let remaining = total;
  for (let i = 0; i < categories.length - 1; i++) {
    const maxForThis = Math.min(remaining - (categories.length - 1 - i), Math.floor(total * 0.4));
    const minForThis = Math.max(1, Math.floor(remaining / (categories.length - i) * 0.5));
    const value = Math.floor(Math.random() * (maxForThis - minForThis + 1)) + minForThis;
    clusters[categories[i]] = value;
    remaining -= value;
  }
  clusters[categories[categories.length - 1]] = Math.max(1, remaining);
  
  return clusters;
}

function generateRevenue(riskScore) {
  // Higher risk often correlates with smaller, newer companies
  let baseRevenue;
  if (riskScore <= 30) {
    baseRevenue = Math.floor(Math.random() * 180) + 70; // $70M-$250M
  } else if (riskScore <= 60) {
    baseRevenue = Math.floor(Math.random() * 80) + 25; // $25M-$105M
  } else {
    baseRevenue = Math.floor(Math.random() * 35) + 5; // $5M-$40M
  }
  return `$${baseRevenue}M`;
}

function getRevenueTier(revenue) {
  const amount = parseInt(revenue.replace('$', '').replace('M', ''));
  if (amount >= 100) return 'large';
  if (amount >= 25) return 'medium';
  return 'small';
}

function generateEmployeeCount(revenueTier, riskScore) {
  if (revenueTier === 'large') {
    return Math.floor(Math.random() * 3000) + 1500; // 1500-4500
  } else if (revenueTier === 'medium') {
    return Math.floor(Math.random() * 1200) + 800; // 800-2000
  } else {
    return Math.floor(Math.random() * 600) + 200; // 200-800
  }
}

function generateIncorporationYear(riskScore) {
  // Higher risk companies tend to be newer
  if (riskScore <= 30) {
    return Math.floor(Math.random() * 8) + 2016; // 2016-2023
  } else if (riskScore <= 60) {
    return Math.floor(Math.random() * 6) + 2018; // 2018-2023
  } else {
    return Math.floor(Math.random() * 4) + 2020; // 2020-2023
  }
}

function generateAccreditationStatus() {
  // 70% APPROVED, 30% PENDING for realistic distribution
  return Math.random() < 0.7 ? 'APPROVED' : 'PENDING';
}

function generatePersonaType(accreditationStatus) {
  return accreditationStatus === 'APPROVED' ? 'accredited-data-recipient' : 'new-data-recipient';
}

function generateBusinessDescription(specialization) {
  const descriptions = {
    'Digital payment processing': 'Advanced payment processing platform enabling seamless digital transactions',
    'AI-powered credit scoring': 'Machine learning platform for intelligent credit risk assessment',
    'Cryptocurrency trading': 'Institutional-grade cryptocurrency trading and custody platform',
    'Robo-advisory services': 'Automated investment advisory platform with portfolio optimization',
    'RegTech compliance automation': 'Regulatory compliance automation for financial institutions',
    'Supply chain financing': 'Trade finance technology streamlining supply chain payments',
    'Peer-to-peer lending': 'Direct lending platform connecting borrowers with investors',
    'Digital banking platform': 'Cloud-native banking infrastructure for financial institutions',
    'InsurTech solutions': 'Insurance technology platform with AI-powered underwriting',
    'Blockchain analytics': 'Blockchain intelligence and cryptocurrency compliance platform'
  };
  
  return descriptions[specialization] || `Innovative ${specialization.toLowerCase()} platform for financial services`;
}

async function createFintechCompany(specialization) {
  const name = generateFintechCompanyName();
  const riskScore = generateRiskScore();
  const chosenScore = Math.max(1, riskScore - Math.floor(Math.random() * 5));
  const riskClusters = generateRiskClusters(riskScore);
  const revenue = generateRevenue(riskScore);
  const revenueTier = getRevenueTier(revenue);
  const numEmployees = generateEmployeeCount(revenueTier, riskScore);
  const incorporationYear = generateIncorporationYear(riskScore);
  const accreditationStatus = generateAccreditationStatus();
  const personaType = generatePersonaType(accreditationStatus);
  const description = generateBusinessDescription(specialization);

  const riskConfiguration = {
    score: riskScore,
    riskLevel: riskScore <= 30 ? 'low' : riskScore <= 60 ? 'medium' : 'high',
    dimensions: [
      {
        id: 'financial_stability',
        name: 'Financial Stability',
        color: '#4caf50',
        value: riskClusters['Financial Stability'],
        weight: 30
      }
    ],
    thresholds: { low: 30, medium: 60, high: 85 }
  };

  const riskPriorities = {
    dimensions: riskConfiguration.dimensions,
    riskAcceptanceLevel: riskScore,
    lastUpdated: new Date().toISOString()
  };

  return {
    name,
    description,
    category: 'FinTech',
    accreditation_status: accreditationStatus,
    risk_score: riskScore,
    chosen_score: chosenScore,
    risk_clusters: JSON.stringify(riskClusters),
    risk_configuration: JSON.stringify(riskConfiguration),
    risk_priorities: JSON.stringify(riskPriorities),
    revenue,
    revenue_tier: revenueTier,
    legal_structure: revenueTier === 'small' ? 'Limited Liability Company' : 'Corporation',
    market_position: description,
    hq_address: `${Math.floor(Math.random() * 9000) + 1000} ${specialization.split(' ')[0]} Plaza, ${['San Francisco, CA', 'New York, NY', 'Boston, MA', 'Austin, TX', 'Seattle, WA'][Math.floor(Math.random() * 5)]}`,
    website_url: `https://${name.toLowerCase().replace(/\s+/g, '')}.com`,
    products_services: `${specialization}, API solutions, financial technology platform, compliance monitoring`,
    incorporation_year: incorporationYear,
    founders_and_leadership: `${['Sarah', 'Michael', 'Jennifer', 'David', 'Amanda', 'Kevin', 'Lisa', 'Robert'][Math.floor(Math.random() * 8)]} ${['Chen', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore'][Math.floor(Math.random() * 8)]} (CEO)`,
    num_employees: numEmployees,
    key_clients_partners: revenueTier === 'large' ? 'Fortune 500 companies, Financial institutions' : revenueTier === 'medium' ? 'Mid-market companies, Regional banks' : 'Small businesses, Community banks',
    investors: revenueTier === 'large' ? 'Tier 1 VCs, Strategic investors' : revenueTier === 'medium' ? 'Growth equity, Series B investors' : 'Seed funds, Angel investors',
    funding_stage: revenueTier === 'large' ? 'Series C' : revenueTier === 'medium' ? 'Series B' : 'Series A',
    certifications_compliance: 'SOC 2 Type II, PCI DSS compliant, financial services certified',
    onboarding_company_completed: true,
    available_tabs: '{"dashboard", "network", "file-vault", "company-profile", "risk-monitoring", "accreditation"}',
    is_demo: false,
    demo_cleanup_eligible: false,
    demo_persona_type: personaType,
    files_public: '["annual_report_2024.pdf", "product_overview.pdf"]',
    files_private: '["technical_documentation.pdf", "compliance_framework.pdf"]',
    current_accreditation_id: null,
    first_accredited_date: null,
    accreditation_count: 0
  };
}

async function insertFintechBatch(companies) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO companies (
        name, description, category, accreditation_status, risk_score, chosen_score,
        risk_clusters, risk_configuration, risk_priorities,
        revenue, revenue_tier, legal_structure, market_position, hq_address,
        website_url, products_services, incorporation_year, founders_and_leadership,
        num_employees, key_clients_partners, investors, funding_stage,
        certifications_compliance, onboarding_company_completed, available_tabs,
        is_demo, demo_cleanup_eligible, demo_persona_type, files_public, files_private,
        current_accreditation_id, first_accredited_date, accreditation_count
      ) VALUES ${companies.map((_, i) => `($${i * 32 + 1}, $${i * 32 + 2}, $${i * 32 + 3}, $${i * 32 + 4}, $${i * 32 + 5}, $${i * 32 + 6}, $${i * 32 + 7}, $${i * 32 + 8}, $${i * 32 + 9}, $${i * 32 + 10}, $${i * 32 + 11}, $${i * 32 + 12}, $${i * 32 + 13}, $${i * 32 + 14}, $${i * 32 + 15}, $${i * 32 + 16}, $${i * 32 + 17}, $${i * 32 + 18}, $${i * 32 + 19}, $${i * 32 + 20}, $${i * 32 + 21}, $${i * 32 + 22}, $${i * 32 + 23}, $${i * 32 + 24}, $${i * 32 + 25}, $${i * 32 + 26}, $${i * 32 + 27}, $${i * 32 + 28}, $${i * 32 + 29}, $${i * 32 + 30}, $${i * 32 + 31}, $${i * 32 + 32})`).join(', ')}
      RETURNING id, name, accreditation_status, demo_persona_type
    `;
    
    const values = companies.flatMap(company => [
      company.name, company.description, company.category, company.accreditation_status,
      company.risk_score, company.chosen_score, company.risk_clusters, company.risk_configuration,
      company.risk_priorities, company.revenue, company.revenue_tier, company.legal_structure,
      company.market_position, company.hq_address, company.website_url, company.products_services,
      company.incorporation_year, company.founders_and_leadership, company.num_employees,
      company.key_clients_partners, company.investors, company.funding_stage,
      company.certifications_compliance, company.onboarding_company_completed, company.available_tabs,
      company.is_demo, company.demo_cleanup_eligible, company.demo_persona_type,
      company.files_public, company.files_private, company.current_accreditation_id,
      company.first_accredited_date, company.accreditation_count
    ]);
    
    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');
    
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function createAccreditationsForApproved(companyIds) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Get next accreditation number
    const maxAccreditationResult = await client.query(
      'SELECT COALESCE(MAX(accreditation_number), 0) as max_num FROM accreditation_history'
    );
    let nextAccreditationNumber = maxAccreditationResult.rows[0].max_num + 1;
    
    // Create accreditations for APPROVED companies
    const approvedCompanies = await client.query(`
      SELECT id, risk_score, risk_clusters 
      FROM companies 
      WHERE id = ANY($1) AND accreditation_status = 'APPROVED'
    `, [companyIds]);
    
    if (approvedCompanies.rows.length > 0) {
      const accreditationInserts = approvedCompanies.rows.map((company, index) => [
        company.id,
        nextAccreditationNumber + index,
        company.risk_score,
        new Date(),
        new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000), // 3 years from now
        'active',
        company.risk_clusters
      ]);
      
      const accreditationQuery = `
        INSERT INTO accreditation_history (
          company_id, accreditation_number, risk_score, issued_date, expires_date, status, risk_clusters
        ) VALUES ${accreditationInserts.map((_, i) => `($${i * 7 + 1}, $${i * 7 + 2}, $${i * 7 + 3}, $${i * 7 + 4}, $${i * 7 + 5}, $${i * 7 + 6}, $${i * 7 + 7})`).join(', ')}
        RETURNING id, company_id
      `;
      
      const accreditationValues = accreditationInserts.flat();
      const accreditationResult = await client.query(accreditationQuery, accreditationValues);
      
      // Update companies with accreditation references
      for (const accreditation of accreditationResult.rows) {
        await client.query(`
          UPDATE companies 
          SET current_accreditation_id = $1, first_accredited_date = NOW(), accreditation_count = 1
          WHERE id = $2
        `, [accreditation.id, accreditation.company_id]);
      }
    }
    
    await client.query('COMMIT');
    return approvedCompanies.rows.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function create200FintechCompanies() {
  console.log('Starting creation of 200 Fintech companies...');
  
  let totalCreated = 0;
  let totalAccredited = 0;
  const batchSize = 25;
  const totalBatches = Math.ceil(200 / batchSize);
  
  for (let batch = 0; batch < totalBatches; batch++) {
    const companiesInThisBatch = batch === totalBatches - 1 ? 200 - (batch * batchSize) : batchSize;
    console.log(`Creating batch ${batch + 1}/${totalBatches} (${companiesInThisBatch} companies)...`);
    
    const companies = [];
    for (let i = 0; i < companiesInThisBatch; i++) {
      const specialization = fintechSpecializations[Math.floor(Math.random() * fintechSpecializations.length)];
      companies.push(await createFintechCompany(specialization));
    }
    
    const insertedCompanies = await insertFintechBatch(companies);
    const companyIds = insertedCompanies.map(c => c.id);
    const accreditedCount = await createAccreditationsForApproved(companyIds);
    
    totalCreated += insertedCompanies.length;
    totalAccredited += accreditedCount;
    
    console.log(`Batch ${batch + 1} completed: ${insertedCompanies.length} companies created, ${accreditedCount} accredited`);
  }
  
  console.log(`\n✅ Successfully created ${totalCreated} Fintech companies`);
  console.log(`✅ ${totalAccredited} companies received accreditation records`);
  console.log(`✅ ${totalCreated - totalAccredited} companies remain as new data recipients`);
  
  // Final verification
  const verification = await pool.query(`
    SELECT 
      accreditation_status,
      demo_persona_type,
      COUNT(*) as count,
      AVG(risk_score) as avg_risk_score
    FROM companies 
    WHERE category = 'FinTech' AND id >= (
      SELECT MAX(id) - 199 FROM companies WHERE category = 'FinTech'
    )
    GROUP BY accreditation_status, demo_persona_type
    ORDER BY accreditation_status, demo_persona_type
  `);
  
  console.log('\n📊 Final Distribution:');
  verification.rows.forEach(row => {
    console.log(`${row.accreditation_status} (${row.demo_persona_type}): ${row.count} companies, avg risk: ${Math.round(row.avg_risk_score)}`);
  });
}

create200FintechCompanies()
  .then(() => {
    console.log('✅ All Fintech companies created successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error creating Fintech companies:', error);
    process.exit(1);
  });