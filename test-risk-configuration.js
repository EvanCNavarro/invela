/**
 * Test script for Risk Score Configuration API
 * 
 * This script tests the risk score configuration API endpoints
 * to ensure they are working correctly.
 */

async function testRiskScoreConfiguration() {
  try {
    console.log('Testing Risk Score Configuration API...');
    
    // Test the non-authenticated test endpoint
    console.log('\nTesting non-authenticated endpoint...');
    const getResponse = await fetch('http://localhost:5000/api/risk-score/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include cookies for authentication
    });
    
    if (!getResponse.ok) {
      throw new Error(`GET request failed with status ${getResponse.status}`);
    }
    
    const currentConfig = await getResponse.json();
    console.log('Current configuration:', currentConfig);
    
    // Create a test configuration
    const testConfig = {
      dimensions: [
        {
          id: 'financial',
          name: 'Financial',
          description: 'Financial stability and performance',
          weight: 0.25,
          value: 75
        },
        {
          id: 'operational',
          name: 'Operational',
          description: 'Operational efficiency and reliability',
          weight: 0.25,
          value: 60
        },
        {
          id: 'cybersecurity',
          name: 'Cybersecurity',
          description: 'Security posture and data protection',
          weight: 0.3,
          value: 85
        },
        {
          id: 'compliance',
          name: 'Compliance',
          description: 'Regulatory compliance and governance',
          weight: 0.2,
          value: 90
        }
      ],
      thresholds: {
        high: 67,
        medium: 34
      },
      score: 77,
      riskLevel: 'high'
    };
    
    // Save the test configuration
    console.log('\nSaving test configuration...');
    const saveResponse = await fetch('http://localhost:5000/api/risk-score/configuration', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testConfig),
      credentials: 'include' // Include cookies for authentication
    });
    
    if (!saveResponse.ok) {
      throw new Error(`POST request failed with status ${saveResponse.status}`);
    }
    
    const savedConfig = await saveResponse.json();
    console.log('Saved configuration:', savedConfig);
    
    // Verify the saved configuration by getting it again
    console.log('\nVerifying saved configuration...');
    const verifyResponse = await fetch('http://localhost:5000/api/risk-score/configuration', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include cookies for authentication
    });
    
    if (!verifyResponse.ok) {
      throw new Error(`Verification GET request failed with status ${verifyResponse.status}`);
    }
    
    const verifiedConfig = await verifyResponse.json();
    console.log('Verified configuration:', verifiedConfig);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRiskScoreConfiguration();
