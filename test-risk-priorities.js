/**
 * Simple test script to debug the risk priorities persistence issue
 */
import { db } from './db/index.js';
import { companies } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function testRiskPriorities() {
  console.log('Testing risk priorities persistence...');
  
  try {
    // Get company 1 data
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, 1),
      columns: {
        risk_priorities: true,
        risk_configuration: true
      }
    });
    
    if (!company) {
      console.log('Company 1 not found!');
      return;
    }
    
    console.log('Current Company 1 Risk Priorities:', JSON.stringify(company.risk_priorities, null, 2));
    console.log('Current Company 1 Risk Configuration:', JSON.stringify(company.risk_configuration, null, 2));
    
    // Create test data
    const testPriorities = {
      dimensions: [
        {
          id: 'financial',
          name: 'Financial',
          description: 'Financial stability and performance',
          weight: 35.2,
          value: 78
        },
        {
          id: 'operational',
          name: 'Operational',
          description: 'Operational efficiency and reliability',
          weight: 25.5,
          value: 65
        },
        {
          id: 'cybersecurity',
          name: 'Cybersecurity',
          description: 'Security posture and data protection',
          weight: 24.3,
          value: 82
        },
        {
          id: 'compliance',
          name: 'Compliance',
          description: 'Regulatory compliance and governance',
          weight: 15.0,
          value: 90
        }
      ],
      lastUpdated: new Date().toISOString()
    };
    
    // Update the company record with test priorities
    console.log('Updating company with test priorities...');
    await db.update(companies)
      .set({
        risk_priorities: testPriorities,
        updated_at: new Date()
      })
      .where(eq(companies.id, 1));
    
    // Verify the update
    const updatedCompany = await db.query.companies.findFirst({
      where: eq(companies.id, 1),
      columns: {
        risk_priorities: true
      }
    });
    
    console.log('After update - Company 1 Risk Priorities:', JSON.stringify(updatedCompany?.risk_priorities, null, 2));
    console.log('Test completed. Check the risk configuration page to verify persistence.');
  } catch (error) {
    console.error('Error testing risk priorities:', error);
  }
}

// Execute the test
testRiskPriorities();
