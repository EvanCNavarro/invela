/**
 * Test Standardized Form Submission Handler
 * 
 * This script tests the standardized form submission handler by submitting
 * a form directly to the API endpoint created by our standardized form routes.
 * 
 * Example usage:
 * node test-standardized-submission.js 792 open_banking
 */

const axios = require('axios');
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Get command line arguments
const taskId = parseInt(process.argv[2], 10);
const formType = process.argv[3];
const debug = process.argv[4] === '--debug';

if (!taskId || isNaN(taskId)) {
  console.error(`${colors.red}Error: taskId is required as the first argument${colors.reset}`);
  console.log(`${colors.yellow}Usage: node test-standardized-submission.js <taskId> <formType> [--debug]${colors.reset}`);
  process.exit(1);
}

if (!formType) {
  console.error(`${colors.red}Error: formType is required as the second argument${colors.reset}`);
  console.log(`${colors.yellow}Usage: node test-standardized-submission.js <taskId> <formType> [--debug]${colors.reset}`);
  console.log(`${colors.yellow}Valid form types: kyb, ky3p, open_banking${colors.reset}`);
  process.exit(1);
}

// Validate form type
const validFormTypes = ['kyb', 'ky3p', 'open_banking', 'card'];
if (!validFormTypes.includes(formType)) {
  console.error(`${colors.red}Error: Invalid form type "${formType}"${colors.reset}`);
  console.log(`${colors.yellow}Valid form types: ${validFormTypes.join(', ')}${colors.reset}`);
  process.exit(1);
}

/**
 * Get sample form data for the specified form type
 */
function getSampleFormData(formType) {
  // Generic form data with a few common fields
  const formData = {
    timestamp: new Date().toISOString(),
    submittedBy: 'test-script'
  };
  
  // Add form-specific fields
  switch (formType) {
    case 'kyb':
      return {
        ...formData,
        company_name: 'Test Company',
        company_address: '123 Test Street',
        company_city: 'Test City',
        company_country: 'Test Country',
        company_registration_number: 'ABC123456',
        company_tax_id: 'TAX123456',
        company_incorporation_date: '2020-01-01',
        company_type: 'Corporation',
        company_status: 'Active',
        company_industry: 'Technology',
        company_website: 'https://example.com',
        company_phone: '+1234567890',
        company_email: 'test@example.com',
        company_size: '50-200',
        company_revenue: '$10M-$50M',
        company_description: 'This is a test company for KYB submission',
        authorized_representative_name: 'John Doe',
        authorized_representative_title: 'CEO',
        authorized_representative_email: 'john@example.com',
        authorized_representative_phone: '+1234567890'
      };
      
    case 'ky3p':
      return {
        ...formData,
        vendor_name: 'Test Vendor',
        vendor_address: '123 Vendor Street',
        vendor_city: 'Vendor City',
        vendor_country: 'Vendor Country',
        vendor_registration_number: 'VEN123456',
        vendor_tax_id: 'VTAX123456',
        vendor_incorporation_date: '2019-01-01',
        vendor_type: 'Service Provider',
        vendor_status: 'Active',
        vendor_industry: 'Finance',
        vendor_website: 'https://vendor-example.com',
        vendor_phone: '+1987654321',
        vendor_email: 'vendor@example.com',
        vendor_size: '200-500',
        vendor_revenue: '$50M-$100M',
        vendor_description: 'This is a test vendor for KY3P submission',
        vendor_services: 'Payment Processing, Data Analytics',
        vendor_contact_name: 'Jane Smith',
        vendor_contact_title: 'Account Manager',
        vendor_contact_email: 'jane@vendor-example.com',
        vendor_contact_phone: '+1987654321',
        data_security_compliance: 'Yes',
        data_security_certifications: 'ISO 27001, SOC 2',
        business_continuity_plan: 'Yes',
        disaster_recovery_plan: 'Yes',
        risk_assessment_completed: 'Yes',
        risk_level: 'Medium'
      };
      
    case 'open_banking':
      return {
        ...formData,
        api_name: 'Test API',
        api_description: 'This is a test API for Open Banking submission',
        api_version: '1.0.0',
        api_endpoint: 'https://api.example.com/v1',
        api_documentation: 'https://docs.example.com',
        api_auth_method: 'OAuth 2.0',
        api_data_format: 'JSON',
        data_sharing_consent: 'Yes',
        data_retention_period: '90 days',
        data_categories: 'Account Information, Transaction History',
        pii_data_handling: 'Encrypted at rest and in transit',
        account_data_access: 'Read-only',
        data_transfers_frequency: 'Daily',
        third_party_sharing: 'No',
        security_measures: 'TLS 1.3, JWT, IP Whitelisting',
        security_testing: 'Regular penetration testing',
        incident_response_plan: 'Yes',
        regulatory_compliance: 'PSD2, GDPR',
        certifications: 'ISO 27001, SOC 2 Type II',
        privacy_policy_url: 'https://example.com/privacy',
        terms_of_service_url: 'https://example.com/terms'
      };
      
    case 'card':
      return {
        ...formData,
        cardholder_name: 'Test Cardholder',
        card_type: 'Visa',
        expiry_date: '12/2025',
        billing_address: '123 Billing Street, Billing City, BC 12345'
      };
      
    default:
      return formData;
  }
}

/**
 * Submit the form to the standardized form submission endpoint
 */
async function submitForm() {
  try {
    console.log(`${colors.blue}Preparing to test form submission for task ${taskId} (${formType})...${colors.reset}`);
    
    // Get sample form data
    const formData = getSampleFormData(formType);
    
    if (debug) {
      console.log(`${colors.magenta}Form data:${colors.reset}`);
      console.log(JSON.stringify(formData, null, 2));
    }
    
    // Prepare the request
    const url = `http://localhost:3000/api/forms/${formType}/submit`;
    const payload = {
      taskId,
      formData
    };
    
    console.log(`${colors.blue}Submitting form to ${url}...${colors.reset}`);
    
    // Send the request
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Handle the response
    if (response.status === 200 && response.data.success) {
      console.log(`${colors.green}Form submission successful!${colors.reset}`);
      console.log(`${colors.green}Task ${taskId} status: ${response.data.status}${colors.reset}`);
      console.log(`${colors.green}Task ${taskId} progress: ${response.data.progress}%${colors.reset}`);
      
      if (response.data.fileId) {
        console.log(`${colors.green}Generated file ID: ${response.data.fileId}${colors.reset}`);
      }
      
      if (response.data.warning) {
        console.log(`${colors.yellow}Warning: ${response.data.warning}${colors.reset}`);
      }
      
      if (debug) {
        console.log(`${colors.magenta}Full response:${colors.reset}`);
        console.log(JSON.stringify(response.data, null, 2));
      }
    } else {
      console.error(`${colors.red}Form submission failed with status ${response.status}${colors.reset}`);
      console.error(`${colors.red}Error: ${response.data.error || 'Unknown error'}${colors.reset}`);
      
      if (debug) {
        console.log(`${colors.magenta}Full response:${colors.reset}`);
        console.log(JSON.stringify(response.data, null, 2));
      }
    }
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    
    if (error.response) {
      console.error(`${colors.red}Status: ${error.response.status}${colors.reset}`);
      console.error(`${colors.red}Response:${colors.reset}`);
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error(`${colors.red}No response received from server${colors.reset}`);
      console.error(`${colors.red}Request:${colors.reset}`);
      console.error(error.request);
    }
    
    process.exit(1);
  }
}

// Run the test
submitForm();