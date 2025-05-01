/**
 * Test script to check risk configuration and priorities persistence
 * 
 * This script tests both GET and POST endpoints for the risk configuration
 * to diagnose the persistence issue.
 */

import { db } from './db/index.js';
import { companies } from './db/schema.js';
import { eq } from 'drizzle-orm';

// Get current company data
async function getCompanyRiskData(companyId) {
  try {
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        risk_priorities: true,
        risk_configuration: true
      }
    });
    
    return company;
  } catch (error) {
    console.error('Error getting company risk data:', error);
    return null;
  }
}

// Update risk priorities directly
async function updateRiskPrioritiesDirectly(companyId, priorities) {
  try {
    await db.update(companies)
      .set({
        risk_priorities: priorities,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));
    
    console.log('Updated risk priorities directly.');
    return true;
  } catch (error) {
    console.error('Error updating risk priorities:', error);
    return false;
  }
}

// Test GET endpoint by actually fetching the data
async function testGetEndpoints() {
  try {
    // Manually construct the API request to simulate what the frontend is doing
    const response = await fetch('http://localhost:5000/api/risk-score/priorities', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error(`HTTP error ${response.status}: ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log('GET /api/risk-score/priorities response:', data);
    return data;
  } catch (error) {
    console.error('Error testing GET endpoint:', error);
    return null;
  }
}

// Test POST endpoint by directly calling it
async function testPostEndpoint(priorities) {
  try {
    const response = await fetch('http://localhost:5000/api/risk-score/priorities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(priorities),
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error(`HTTP error ${response.status}: ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    console.log('POST /api/risk-score/priorities response:', data);
    return true;
  } catch (error) {
    console.error('Error testing POST endpoint:', error);
    return false;
  }
}

async function runTests() {
  const companyId = 1;
  
  // 1. First, get the current company data
  console.log('\n--- Step 1: Getting current company risk data ---');
  const companyData = await getCompanyRiskData(companyId);
  console.log('Current risk_priorities:', JSON.stringify(companyData?.risk_priorities, null, 2));
  console.log('Current risk_configuration:', JSON.stringify(companyData?.risk_configuration, null, 2));
  
  // 2. Test the GET endpoint
  console.log('\n--- Step 2: Testing GET endpoint ---');
  const endpointData = await testGetEndpoints();
  
  // 3. Create test priorities data
  console.log('\n--- Step 3: Preparing test priorities data ---');
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
  console.log('Test priorities data prepared.');
  
  // 4. Update directly via database
  console.log('\n--- Step 4: Updating risk priorities directly via database ---');
  const updateResult = await updateRiskPrioritiesDirectly(companyId, testPriorities);
  
  // 5. Verify the direct update
  console.log('\n--- Step 5: Verifying direct database update ---');
  const updatedData = await getCompanyRiskData(companyId);
  console.log('Updated risk_priorities:', JSON.stringify(updatedData?.risk_priorities, null, 2));
  
  // 6. Test the POST endpoint
  console.log('\n--- Step 6: Testing POST endpoint ---');
  const modifiedPriorities = { ...testPriorities };
  modifiedPriorities.dimensions[0].value = 85; // Change a value to test the endpoint
  const postResult = await testPostEndpoint(modifiedPriorities);
  
  // 7. Final verification
  console.log('\n--- Step 7: Final verification ---');
  const finalData = await getCompanyRiskData(companyId);
  console.log('Final risk_priorities:', JSON.stringify(finalData?.risk_priorities, null, 2));
  
  console.log('\n--- Test Results Summary ---');
  console.log(`Direct DB update success: ${updateResult}`);
  console.log(`POST endpoint success: ${postResult}`);
  console.log(`Priorities before: ${companyData?.risk_priorities ? 'Exists' : 'Not found'}`);
  console.log(`Priorities after direct update: ${updatedData?.risk_priorities ? 'Exists' : 'Not found'}`);
  console.log(`Priorities after POST: ${finalData?.risk_priorities ? 'Exists' : 'Not found'}`);
  
  if (finalData?.risk_priorities) {
    const beforeValues = companyData?.risk_priorities?.dimensions?.map(d => d.value) || [];
    const directValues = updatedData?.risk_priorities?.dimensions?.map(d => d.value) || [];
    const postValues = finalData?.risk_priorities?.dimensions?.map(d => d.value) || [];
    
    console.log('Original dimension values:', beforeValues);
    console.log('After direct update values:', directValues);
    console.log('After POST update values:', postValues);
  }
}

// Run the tests
runTests().catch(console.error);
