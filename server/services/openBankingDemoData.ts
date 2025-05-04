/**
 * Open Banking Demo Data Service
 * 
 * This module provides demo data generation functions for Open Banking Survey forms.
 * It generates realistic looking data that can be used to auto-fill forms for testing or demo purposes.
 */

export async function getOpenBankingDemoData() {
  // Create some demo fields with sample data
  const fields = [
    // Banking Integration & Capabilities
    { id: 3001, value: 'UK Open Banking Standard', status: 'COMPLETE' },
    { id: 3002, value: 'Account Information, Payment Initiation', status: 'COMPLETE' },
    { id: 3003, value: 'Yes, FCA Authorized', status: 'COMPLETE' },
    { id: 3004, value: 'OAuth 2.0, OpenID Connect', status: 'COMPLETE' },
    { id: 3005, value: 'Multiple institutions', status: 'COMPLETE' },
    
    // Compliance & Security
    { id: 3011, value: 'FCA, ICO, PSD2', status: 'COMPLETE' },
    { id: 3012, value: 'SOC 2 Type II, ISO 27001', status: 'COMPLETE' },
    { id: 3013, value: 'Yes, quarterly', status: 'COMPLETE' },
    { id: 3014, value: 'mTLS, API keys, OAuth tokens', status: 'COMPLETE' },
    { id: 3015, value: '24 month retention policy', status: 'COMPLETE' },
    
    // Data Usage & Privacy
    { id: 3021, value: 'Account balance, transaction data, spending analysis', status: 'COMPLETE' },
    { id: 3022, value: 'YES', status: 'COMPLETE' },
    { id: 3023, value: 'YES', status: 'COMPLETE' },
    { id: 3024, value: '90 days after user termination', status: 'COMPLETE' },
    { id: 3025, value: 'YES', status: 'COMPLETE' },
    
    // Technical Implementation
    { id: 3031, value: 'RESTful API, Webhook notifications', status: 'COMPLETE' },
    { id: 3032, value: 'OAuth 2.0', status: 'COMPLETE' },
    { id: 3033, value: 'YES', status: 'COMPLETE' },
    { id: 3034, value: 'AES-256, TLS 1.3', status: 'COMPLETE' },
    { id: 3035, value: 'YES', status: 'COMPLETE' },
    
    // Banking Partners
    { id: 3041, value: 'HSBC, Barclays, Lloyds, Santander, NatWest', status: 'COMPLETE' },
    { id: 3042, value: '45+ institutions, 95% market coverage', status: 'COMPLETE' },
    { id: 3043, value: 'YES', status: 'COMPLETE' },
    { id: 3044, value: '99.9% (monthly)', status: 'COMPLETE' },
    { id: 3045, value: '< 300ms average', status: 'COMPLETE' },
    
    // Risk & Incident Management
    { id: 3051, value: 'YES', status: 'COMPLETE' },
    { id: 3052, value: 'Full audit trail, anomaly detection', status: 'COMPLETE' },
    { id: 3053, value: 'YES', status: 'COMPLETE' },
    { id: 3054, value: '< 15 minutes SLA', status: 'COMPLETE' },
    { id: 3055, value: 'Rate limiting, fraud detection, behavioral analysis', status: 'COMPLETE' },
    
    // Business Continuity
    { id: 3061, value: 'Multi-region deployment', status: 'COMPLETE' },
    { id: 3062, value: 'RTO < 1 hour, RPO < 5 minutes', status: 'COMPLETE' },
    { id: 3063, value: 'Quarterly', status: 'COMPLETE' },
    { id: 3064, value: 'YES', status: 'COMPLETE' },
    { id: 3065, value: 'Automatic failover', status: 'COMPLETE' },
    
    // User Experience
    { id: 3071, value: 'Embedded, redirect, and decoupled flows', status: 'COMPLETE' },
    { id: 3072, value: 'YES', status: 'COMPLETE' },
    { id: 3073, value: 'English, French, German, Spanish, Italian', status: 'COMPLETE' },
    { id: 3074, value: 'Web, iOS, Android', status: 'COMPLETE' },
    { id: 3075, value: 'YES', status: 'COMPLETE' },
    
    // Support & SLAs
    { id: 3081, value: '24/7 technical support', status: 'COMPLETE' },
    { id: 3082, value: '< 2 hours (critical), < 24 hours (standard)', status: 'COMPLETE' },
    { id: 3083, value: 'Email, phone, dedicated Slack', status: 'COMPLETE' },
    { id: 3084, value: 'YES', status: 'COMPLETE' },
    { id: 3085, value: 'YES', status: 'COMPLETE' },
    
    // Performance Metrics
    { id: 3091, value: '> 99.95%', status: 'COMPLETE' },
    { id: 3092, value: '< 5 minutes/month', status: 'COMPLETE' },
    { id: 3093, value: 'YES', status: 'COMPLETE' },
    { id: 3094, value: '> 100,000 daily API calls', status: 'COMPLETE' },
    { id: 3095, value: 'Real-time dashboards, weekly reports', status: 'COMPLETE' },
  ];

  return {
    fields
  };
}
