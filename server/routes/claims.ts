import { Router } from 'express';
import { db } from '@db';
import { eq } from 'drizzle-orm';
// Note: These schema imports are placeholders since they're not used yet
// and will be properly implemented when the database schema is created
import { claims } from '@db/schema';

const router = Router();

// We need to ensure specific routes come before parameter routes
// Reordering Express routes to prevent route conflicts
const ROUTE_PRIORITY = [
  '/active',        // 1. Get active claims
  '/disputed',      // 2. Get disputed claims  
  '/resolved',      // 3. Get resolved claims
  '/dispute/:id',   // 4. Get dispute details
  '/:id'            // 5. Get claim by ID (lowest priority, most generic)
];

// Get all active claims
router.get('/active', async (req, res) => {
  try {
    // In a real app, we would filter by company ID and active status
    // This is mock data for the purpose of this demo
    const activeClaims = [
      {
        id: 1,
        claim_id: 'CLM-2025-001',
        bank_id: 'BNK-12009',
        bank_name: 'First National Bank',
        fintech_name: 'PayQuick Solutions',
        account_number: 'ACCT-46550812',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-15T09:30:00Z',
        claim_amount: 50.00,
        status: 'in_review',
        policy_number: 'POL-2025-88231',
        is_disputed: false,
        is_resolved: false,
        breach_date: '2025-04-12T03:15:00Z',
        affected_records: 250,
        consent_id: 'f0759cbca31766de3d7398d8fb',
        consent_scope: 'PII',
        incident_description: 'Unauthorized access to customer PII data was detected in the system.'
      },
      {
        id: 2,
        claim_id: 'CLM-2025-002',
        bank_id: 'BNK-13557',
        bank_name: 'Commerce Trust Bank',
        fintech_name: 'DataSecure App',
        account_number: 'ACCT-77812345',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-10T14:15:00Z',
        claim_amount: 75.50,
        status: 'processing',
        policy_number: 'POL-2025-77654',
        is_disputed: false,
        is_resolved: false,
      },
      {
        id: 3,
        claim_id: 'CLM-2025-003',
        bank_id: 'BNK-22190',
        bank_name: 'Pacific Regional Bank',
        fintech_name: 'FinFlow Tech',
        account_number: 'ACCT-99123456',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-05T10:20:00Z',
        claim_amount: 120.75,
        status: 'pending_info',
        policy_number: 'POL-2025-33219',
        is_disputed: false,
        is_resolved: false,
      }
    ];
    
    res.json(activeClaims);
  } catch (error) {
    console.error('Error fetching active claims:', error);
    res.status(500).json({ error: 'Failed to fetch active claims' });
  }
});

// Get all disputed claims
router.get('/disputed', async (req, res) => {
  try {
    // Mock data for disputed claims
    const disputedClaims = [
      {
        id: 4,
        claim_id: 'CLM-2025-004',
        bank_id: 'BNK-67890',
        bank_name: 'Metro Credit Union',
        fintech_name: 'LendSecure Technologies',
        account_number: 'ACCT-55578123',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-03T11:25:00Z',
        claim_amount: 95.00,
        status: 'under_review',
        policy_number: 'POL-2025-45678',
        is_disputed: true,
        is_resolved: false,
        dispute: {
          id: 1,
          dispute_date: '2025-04-05T09:15:00Z',
          dispute_reason: 'The bank disputes liability for the PII data loss, claiming the Fintech\'s security measures were inadequate and violated contractual obligations.',
          status: 'under_review'
        }
      },
      {
        id: 5,
        claim_id: 'CLM-2025-005',
        bank_id: 'BNK-54321',
        bank_name: 'Liberty Savings',
        fintech_name: 'Financial Data Connect',
        account_number: 'ACCT-7891235',
        claim_type: 'PII Data Loss',
        claim_date: '2025-03-28T15:45:00Z',
        claim_amount: 150.25,
        status: 'escalated',
        policy_number: 'POL-2025-98765',
        is_disputed: true,
        is_resolved: false,
        dispute: {
          id: 2,
          dispute_date: '2025-03-30T13:20:00Z',
          dispute_reason: 'Dispute over responsibility for security breach that led to data loss.',
          status: 'escalated'
        }
      },
      {
        id: 6,
        claim_id: 'CLM-2025-006',
        bank_id: 'BNK-11223',
        bank_name: 'Central State Bank',
        fintech_name: 'SmartFunds Inc.',
        account_number: 'ACCT-22334455',
        claim_type: 'PII Data Loss',
        claim_date: '2025-03-20T09:10:00Z',
        claim_amount: 200.00,
        status: 'escalated',
        policy_number: 'POL-2025-55443',
        is_disputed: true,
        is_resolved: false,
        dispute: {
          id: 3,
          dispute_date: '2025-03-22T14:35:00Z',
          dispute_reason: 'Liability dispute based on contractual terms regarding data security responsibilities.',
          status: 'under_review'
        }
      }
    ];
    
    res.json(disputedClaims);
  } catch (error) {
    console.error('Error fetching disputed claims:', error);
    res.status(500).json({ error: 'Failed to fetch disputed claims' });
  }
});

// Get all resolved claims
router.get('/resolved', async (req, res) => {
  try {
    // Mock data for resolved claims
    const resolvedClaims = [
      {
        id: 7,
        claim_id: 'CLM-2025-007',
        bank_id: 'BNK-15937',
        bank_name: 'Summit Financial',
        fintech_name: 'QuickTransfer App',
        account_number: 'ACCT-97531246',
        claim_type: 'PII Data Loss',
        claim_date: '2025-03-15T13:20:00Z',
        claim_amount: 75.00,
        status: 'approved',
        policy_number: 'POL-2025-75395',
        is_disputed: false,
        is_resolved: true,
        resolution: {
          id: 1,
          resolution_date: '2025-03-18T11:30:00Z',
          resolution_type: 'approved',
          compensation_amount: 75.00
        }
      },
      {
        id: 8,
        claim_id: 'CLM-2025-008',
        bank_id: 'BNK-95173',
        bank_name: 'Heritage Trust Bank',
        fintech_name: 'MoneyLink Services',
        account_number: 'ACCT-15975346',
        claim_type: 'PII Data Loss',
        claim_date: '2025-03-10T09:45:00Z',
        claim_amount: 125.50,
        status: 'partially_approved',
        policy_number: 'POL-2025-15935',
        is_disputed: true,
        is_resolved: true,
        dispute: {
          id: 4,
          dispute_date: '2025-03-12T14:20:00Z',
          dispute_reason: 'Dispute over extent of liability and amount claimed.',
          status: 'resolved'
        },
        resolution: {
          id: 2,
          resolution_date: '2025-03-17T15:40:00Z',
          resolution_type: 'partially_approved',
          compensation_amount: 80.25
        }
      },
      {
        id: 9,
        claim_id: 'CLM-2025-009',
        bank_id: 'BNK-75391',
        bank_name: 'Valley Community Bank',
        fintech_name: 'SecurePay Solutions',
        account_number: 'ACCT-35791246',
        claim_type: 'PII Data Loss',
        claim_date: '2025-03-05T10:15:00Z',
        claim_amount: 180.00,
        status: 'denied',
        policy_number: 'POL-2025-97531',
        is_disputed: false,
        is_resolved: true,
        resolution: {
          id: 3,
          resolution_date: '2025-03-10T11:25:00Z',
          resolution_type: 'denied',
          compensation_amount: 0.00,
          denial_reason: 'Claim falls outside policy coverage parameters'
        }
      }
    ];
    
    res.json(resolvedClaims);
  } catch (error) {
    console.error('Error fetching resolved claims:', error);
    res.status(500).json({ error: 'Failed to fetch resolved claims' });
  }
});

// Get dispute details for a claim
// This route must be defined BEFORE the '/:id' route to ensure proper route matching
router.get('/dispute/:id', async (req, res) => {
  try {
    const claimId = req.params.id;
    
    // In a real app, we would query the database
    // This is mock data for the purpose of this demo
    const disputeDetails = {
      id: 1,
      claim_id: 'CLM-2025-004',
      bank_id: 'BNK-67890',
      bank_name: 'Metro Credit Union',
      fintech_name: 'LendSecure Technologies',
      account_number: 'ACCT-55578123',
      claim_type: 'PII Data Loss',
      claim_date: '2025-04-03T11:25:00Z',
      claim_amount: 95.00,
      status: 'under_review',
      policy_number: 'POL-2025-45678',
      is_disputed: true,
      is_resolved: false,
      breach_date: '2025-04-01T02:30:00Z',
      affected_records: 175,
      consent_id: 'a9b3451fd7124c8e9ef6ab49dc',
      consent_scope: 'PII',
      incident_description: 'Data breach through improperly secured API endpoints resulted in unauthorized access.',
      dispute: {
        id: 1,
        dispute_date: '2025-04-05T09:15:00Z',
        dispute_reason: 'The bank disputes liability for the PII data loss, claiming the Fintech\'s security measures were inadequate and violated contractual obligations.',
        status: 'under_review',
        documents: [
          {
            id: 1, 
            name: 'Security Audit Report',
            type: 'pdf',
            size: 1.2,
            uploaded_by: 'Metro Credit Union',
            uploaded_at: '2025-04-05T10:30:00Z'
          },
          {
            id: 2,
            name: 'Data Access Logs',
            type: 'xlsx',
            size: 0.845,
            uploaded_by: 'Metro Credit Union',
            uploaded_at: '2025-04-05T10:35:00Z'
          },
          {
            id: 3,
            name: 'Service Agreement',
            type: 'pdf',
            size: 2.8,
            uploaded_by: 'Metro Credit Union',
            uploaded_at: '2025-04-05T10:40:00Z'
          },
          {
            id: 4,
            name: 'Security Compliance Report',
            type: 'pdf',
            size: 3.1,
            uploaded_by: 'LendSecure Technologies',
            uploaded_at: '2025-04-06T14:15:00Z'
          },
          {
            id: 5,
            name: 'Incident Response Timeline',
            type: 'docx',
            size: 0.52,
            uploaded_by: 'LendSecure Technologies',
            uploaded_at: '2025-04-06T14:20:00Z'
          },
          {
            id: 6,
            name: 'Forensic Analysis Report',
            type: 'pdf',
            size: 5.7,
            uploaded_by: 'Third-Party Auditor',
            uploaded_at: '2025-04-07T09:30:00Z'
          }
        ],
        timeline: [
          {
            id: 1,
            event: 'Dispute Filed',
            date: '2025-04-05T09:45:00Z',
            description: 'Metro Credit Union filed a dispute against the claim, citing contractual terms violation.'
          },
          {
            id: 2,
            event: 'Documentation Requested',
            date: '2025-04-05T11:30:00Z',
            description: 'Additional documentation was requested from both parties to support the dispute review.'
          },
          {
            id: 3,
            event: 'Documentation Received',
            date: '2025-04-07T14:15:00Z',
            description: 'Security audit reports and compliance documentation received from both parties.'
          },
          {
            id: 4,
            event: 'Under Review',
            date: '2025-04-08T16:30:00Z',
            description: 'Dispute is currently under review by the resolution team.'
          }
        ]
      }
    };
    
    res.json(disputeDetails);
  } catch (error) {
    console.error('Error fetching dispute details:', error);
    res.status(500).json({ error: 'Failed to fetch dispute details' });
  }
});

// Get a single claim by ID
// This is a generic catch-all route for any claim ID
router.get('/:id', async (req, res) => {
  try {
    const claimId = req.params.id;
    console.log('[API] Fetching claim by ID:', claimId);
    console.log('[API] Request params:', req.params);
    
    // In a real app, we would query the database
    // This is mock data for the purpose of this demo
    const activeClaims = [
      {
        id: 1,
        claim_id: 'CLM-2025-001',
        bank_id: 'BNK-12009',
        bank_name: 'First National Bank',
        fintech_name: 'PayQuick Solutions',
        account_number: 'ACCT-46550812',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-15T09:30:00Z',
        claim_amount: 50.00,
        status: 'in_review',
        policy_number: 'POL-2025-88231',
        is_disputed: false,
        is_resolved: false,
        breach_date: '2025-04-12T03:15:00Z',
        affected_records: 250,
        consent_id: 'f0759cbca31766de3d7398d8fb',
        consent_scope: 'PII',
        incident_description: 'Unauthorized access to customer PII data was detected in the system.'
      },
      {
        id: 2,
        claim_id: 'CLM-2025-002',
        bank_id: 'BNK-13557',
        bank_name: 'Commerce Trust Bank',
        fintech_name: 'DataSecure App',
        account_number: 'ACCT-77812345',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-10T14:15:00Z',
        claim_amount: 75.50,
        status: 'processing',
        policy_number: 'POL-2025-77654',
        is_disputed: false,
        is_resolved: false,
        breach_date: '2025-04-08T06:45:00Z',
        affected_records: 120,
        consent_id: 'b8741ecd92a5687fb143ce09ad',
        consent_scope: 'PII',
        incident_description: 'Security vulnerability exploited resulting in unauthorized data access.'
      },
      {
        id: 3,
        claim_id: 'CLM-2025-003',
        bank_id: 'BNK-22190',
        bank_name: 'Pacific Regional Bank',
        fintech_name: 'FinFlow Tech',
        account_number: 'ACCT-99123456',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-05T10:20:00Z',
        claim_amount: 120.75,
        status: 'pending_info',
        policy_number: 'POL-2025-33219',
        is_disputed: false,
        is_resolved: false,
        breach_date: '2025-04-03T13:15:00Z',
        affected_records: 315,
        consent_id: 'c6532a9b78d01ef4521ab63ec',
        consent_scope: 'PII',
        incident_description: 'Customer PII data exposed through insecure API implementation.'
      },
      {
        id: 4,
        claim_id: 'CLM-2025-004',
        bank_id: 'BNK-67890',
        bank_name: 'Metro Credit Union',
        fintech_name: 'LendSecure Technologies',
        account_number: 'ACCT-55578123',
        claim_type: 'PII Data Loss',
        claim_date: '2025-04-03T11:25:00Z',
        claim_amount: 95.00,
        status: 'under_review',
        policy_number: 'POL-2025-45678',
        is_disputed: true,
        is_resolved: false,
        breach_date: '2025-04-01T02:30:00Z',
        affected_records: 175,
        consent_id: 'a9b3451fd7124c8e9ef6ab49dc',
        consent_scope: 'PII',
        incident_description: 'Data breach through improperly secured API endpoints resulted in unauthorized access.'
      }
    ];
    
    // Include disputed claims (which were missing from the allClaims array)
    const disputedClaims = [
      {
        id: 5,
        claim_id: 'CLM-2025-005',
        bank_id: 'BNK-54321',
        bank_name: 'Liberty Savings',
        fintech_name: 'Financial Data Connect',
        account_number: 'ACCT-7891235',
        claim_type: 'PII Data Loss',
        claim_date: '2025-03-28T15:45:00Z',
        claim_amount: 150.25,
        status: 'escalated',
        policy_number: 'POL-2025-98765',
        is_disputed: true,
        is_resolved: false,
        breach_date: '2025-03-25T07:20:00Z',
        affected_records: 290,
        consent_id: 'd9e4231fa6c7890b3e56d72ab',
        consent_scope: 'PII',
        incident_description: 'API vulnerability exploited by unauthorized party, resulting in customer data exposure.',
        dispute: {
          id: 2,
          dispute_date: '2025-03-30T13:20:00Z',
          dispute_reason: 'Dispute over responsibility for security breach that led to data loss.',
          status: 'escalated'
        }
      },
      {
        id: 6,
        claim_id: 'CLM-2025-006',
        bank_id: 'BNK-11223',
        bank_name: 'Central State Bank',
        fintech_name: 'SmartFunds Inc.',
        account_number: 'ACCT-22334455',
        claim_type: 'PII Data Loss',
        claim_date: '2025-03-20T09:10:00Z',
        claim_amount: 200.00,
        status: 'escalated',
        policy_number: 'POL-2025-55443',
        is_disputed: true,
        is_resolved: false,
        breach_date: '2025-03-18T18:45:00Z',
        affected_records: 420,
        consent_id: 'e3d5620f1a9b7c84d25e97fb',
        consent_scope: 'PII',
        incident_description: 'Unauthorized database access resulted in customer PII data leak.',
        dispute: {
          id: 3,
          dispute_date: '2025-03-22T14:35:00Z',
          dispute_reason: 'Liability dispute based on contractual terms regarding data security responsibilities.',
          status: 'under_review'
        }
      }
    ];
    
    // Combine active and disputed claims to create a complete list
    const allClaims = [...activeClaims, ...disputedClaims];
    
    // Important: Need to handle both number and string IDs
    console.log('[API] Looking for claim with ID:', claimId);
    console.log('[API] ID type:', typeof claimId);
    
    // First try exact match, then try string comparison
    const claim = allClaims.find(c => {
      const stringMatch = c.id.toString() === claimId;
      const claimIdMatch = c.claim_id === claimId;
      console.log(`[API] Checking claim ${c.id}: stringMatch=${stringMatch}, claimIdMatch=${claimIdMatch}`);
      return stringMatch || claimIdMatch;
    });
    
    if (!claim) {
      console.log('[API] No matching claim found for ID:', claimId);
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    console.log('[API] Found matching claim:', claim.id, claim.claim_id);
    res.json(claim);
  } catch (error) {
    console.error('Error fetching claim:', error);
    res.status(500).json({ error: 'Failed to fetch claim' });
  }
});

// Create a new dispute
router.post('/:id/dispute', async (req, res) => {
  try {
    const claimId = req.params.id;
    const disputeData = req.body;
    
    // In a real app, we would insert into the database
    // For now, just respond with success and a mock ID
    
    res.status(201).json({
      success: true,
      message: 'Dispute created successfully',
      dispute_id: 5
    });
  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// Create a new claim
router.post('/', async (req, res) => {
  try {
    const claimData = req.body;
    
    // In a real app, we would insert into the database
    // For now, just respond with success and a mock ID
    
    res.status(201).json({
      success: true,
      message: 'Claim created successfully',
      claim_id: 'CLM-2025-010'
    });
  } catch (error) {
    console.error('Error creating claim:', error);
    res.status(500).json({ error: 'Failed to create claim' });
  }
});

// Submit a dispute for a claim
router.post('/:id/dispute', async (req, res) => {
  try {
    const claimId = req.params.id;
    const disputeData = req.body;
    
    // In a real app, we would insert into the database
    // For now, just respond with success
    
    res.status(201).json({
      success: true,
      message: 'Dispute filed successfully',
      dispute_id: 5
    });
  } catch (error) {
    console.error('Error filing dispute:', error);
    res.status(500).json({ error: 'Failed to file dispute' });
  }
});

// Submit a resolution for a dispute
router.post('/dispute/:id/resolve', async (req, res) => {
  try {
    const disputeId = req.params.id;
    const resolutionData = req.body;
    
    // In a real app, we would insert into the database
    // For now, just respond with success
    
    res.status(201).json({
      success: true,
      message: 'Resolution submitted successfully',
      resolution_id: 4
    });
  } catch (error) {
    console.error('Error submitting resolution:', error);
    res.status(500).json({ error: 'Failed to submit resolution' });
  }
});

export default router;
