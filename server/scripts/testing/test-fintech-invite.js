/**
 * Test script for FinTech invite endpoint
 * 
 * This script tests the FinTech invite endpoint by sending a request to create
 * a demo company, then checking if the file vault was properly populated.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import axios from 'axios';

const { Client } = pg;

// Configuration
const config = {
  baseUrl: 'http://localhost:5000',
  sessionCookiePath: './.session-cookie',
  // Company name will be generated dynamically using secure API
  recipient: {
    name: 'John Doe7',
    email: '7@e.com'
  }
};

// Helper functions
async function readSessionCookie() {
  try {
    const cookieData = fs.readFileSync(config.sessionCookiePath, 'utf8');
    const lines = cookieData.split('\n').filter(line => !line.startsWith('#') && line.trim());
    
    if (lines.length === 0) {
      throw new Error('No cookie found in session file');
    }
    
    const lastLine = lines[lines.length - 1];
    const cookieParts = lastLine.split('\t');
    const cookieName = cookieParts[5]; // The session ID name
    const cookieValue = cookieParts[6]; // The session ID value
    
    return `${cookieName}=${cookieValue}`;
  } catch (error) {
    console.error('Error reading session cookie:', error.message);
    return null;
  }
}

// Create a connection to the database
async function connectToDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  console.log('Connected to database');
  
  return client;
}

// Check if files exist for a company
async function checkCompanyFiles(client, companyId) {
  const query = 'SELECT id, name, company_id, user_id, status FROM files WHERE company_id = $1';
  const result = await client.query(query, [companyId]);
  
  console.log(`Found ${result.rows.length} files for company ${companyId}`);
  
  return result.rows;
}

// Main function
async function main() {
  try {
    console.log('Starting FinTech invite test...');
    
    // Get the session cookie
    const sessionCookie = await readSessionCookie();
    if (!sessionCookie) {
      throw new Error('Failed to read session cookie');
    }
    
    // Generate secure company name using API
    const nameResponse = await axios.get(`${config.baseUrl}/api/demo/generate-company-name`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    const secureCompanyName = nameResponse.data.companyName;
    console.log(`Creating demo company: ${secureCompanyName}`);
    
    const response = await axios.post(
      `${config.baseUrl}/api/fintech/invite`,
      {
        name: secureCompanyName,
        category: 'FinTech',
        revenue_tier: 'xlarge',
        recipient_name: config.recipient.name,
        recipient_email: config.recipient.email,
        is_demo: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie
        }
      }
    );
    
    console.log('FinTech invite response:', response.data);
    
    if (!response.data.company || !response.data.company.id) {
      throw new Error('Failed to create company');
    }
    
    const companyId = response.data.company.id;
    console.log(`Created company with ID: ${companyId}`);
    
    // Wait a moment for the file vault population to complete
    console.log('Waiting for file vault population to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if files were created
    const client = await connectToDatabase();
    const files = await checkCompanyFiles(client, companyId);
    
    console.log('Files:', files);
    
    if (files.length === 0) {
      console.error('❌ No files were created for the company');
    } else {
      console.log(`✅ ${files.length} files were created for the company`);
    }
    
    // Clean up
    await client.end();
    console.log('Test completed');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
main();