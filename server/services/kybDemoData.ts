/**
 * KYB Demo Data Service
 * 
 * This module provides demo data generation functions for KYB (Know Your Business) forms.
 * It generates realistic looking data that can be used to auto-fill KYB forms for testing or demo purposes.
 */

export async function getKybDemoData() {
  // Create some demo fields with sample data
  const fields = [
    // Company Information
    { id: 2001, value: 'ABC Technologies Ltd.', status: 'COMPLETE' },
    { id: 2002, value: '123 Main Street, Suite 500, San Francisco, CA 94105, USA', status: 'COMPLETE' },
    { id: 2003, value: '+1 (415) 555-1234', status: 'COMPLETE' },
    { id: 2004, value: 'contact@abctech.com', status: 'COMPLETE' },
    { id: 2005, value: 'www.abctech.com', status: 'COMPLETE' },
    
    // Business Structure
    { id: 2011, value: 'Corporation', status: 'COMPLETE' },
    { id: 2012, value: 'USA', status: 'COMPLETE' },
    { id: 2013, value: 'DE12345678', status: 'COMPLETE' },
    { id: 2014, value: '2010-03-15', status: 'COMPLETE' },
    { id: 2015, value: 'Delaware', status: 'COMPLETE' },
    
    // Business Activity
    { id: 2021, value: 'Financial Technology Services', status: 'COMPLETE' },
    { id: 2022, value: 'SaaS, Payment Processing, Data Analytics', status: 'COMPLETE' },
    { id: 2023, value: 'United States, Canada, United Kingdom, France, Germany', status: 'COMPLETE' },
    { id: 2024, value: 'Consumers, Small Businesses, Enterprise', status: 'COMPLETE' },
    { id: 2025, value: '$25M - $50M', status: 'COMPLETE' },
    
    // Ownership & Management
    { id: 2031, value: 'Jane Smith', status: 'COMPLETE' },
    { id: 2032, value: 'CEO', status: 'COMPLETE' },
    { id: 2033, value: 'jane.smith@abctech.com', status: 'COMPLETE' },
    { id: 2034, value: '+1 (415) 555-5678', status: 'COMPLETE' },
    { id: 2035, value: '45%', status: 'COMPLETE' },
    
    // Secondary Owner/Manager
    { id: 2041, value: 'Michael Johnson', status: 'COMPLETE' },
    { id: 2042, value: 'CTO', status: 'COMPLETE' },
    { id: 2043, value: 'michael.johnson@abctech.com', status: 'COMPLETE' },
    { id: 2044, value: '+1 (415) 555-9012', status: 'COMPLETE' },
    { id: 2045, value: '30%', status: 'COMPLETE' },
    
    // Regulatory & Compliance
    { id: 2051, value: 'MSB Registration #12345', status: 'COMPLETE' },
    { id: 2052, value: 'PCI-DSS Level 1', status: 'COMPLETE' },
    { id: 2053, value: 'SOC 2 Type II', status: 'COMPLETE' },
    { id: 2054, value: 'ISO 27001', status: 'COMPLETE' },
    { id: 2055, value: 'Yes, all jurisdictions', status: 'COMPLETE' },
    
    // Banking Information
    { id: 2061, value: 'First National Bank', status: 'COMPLETE' },
    { id: 2062, value: '1234567890', status: 'COMPLETE' },
    { id: 2063, value: 'FNBUS12345', status: 'COMPLETE' },
    { id: 2064, value: '123 Banking St, New York, NY 10001', status: 'COMPLETE' },
    { id: 2065, value: '2015-06-01', status: 'COMPLETE' },
    
    // Verification Data
    { id: 2071, value: 'Yes', status: 'COMPLETE' },
    { id: 2072, value: 'Yes', status: 'COMPLETE' },
    { id: 2073, value: 'No', status: 'COMPLETE' },
    { id: 2074, value: 'Yes', status: 'COMPLETE' },
    { id: 2075, value: 'Yes', status: 'COMPLETE' },
    
    // Additional Fields
    { id: 2081, value: '12-3456789', status: 'COMPLETE' },
    { id: 2082, value: 'DUNS: 123456789', status: 'COMPLETE' },
    { id: 2083, value: 'Private', status: 'COMPLETE' },
    { id: 2084, value: '250-500', status: 'COMPLETE' },
    { id: 2085, value: 'Venture Capital, Series C', status: 'COMPLETE' },
    
    // Board Members
    { id: 2091, value: 'Sarah Williams, Robert Chen, David Garcia', status: 'COMPLETE' },
    { id: 2092, value: 'Independent', status: 'COMPLETE' },
    { id: 2093, value: 'Quarterly', status: 'COMPLETE' },
    { id: 2094, value: 'Audit, Compensation, Governance', status: 'COMPLETE' },
    { id: 2095, value: '5 years', status: 'COMPLETE' },
    
    // Risk Assessment
    { id: 2101, value: 'Medium', status: 'COMPLETE' },
    { id: 2102, value: 'Low', status: 'COMPLETE' },
    { id: 2103, value: 'Low', status: 'COMPLETE' },
    { id: 2104, value: 'Medium', status: 'COMPLETE' },
    { id: 2105, value: 'Low', status: 'COMPLETE' },
  ];

  return {
    fields
  };
}
