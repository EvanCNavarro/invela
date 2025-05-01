/**
 * Claims Management API Routes
 * 
 * This module provides API endpoints for managing PII data loss claims,
 * including listing, creating, updating, and viewing details of claims.
 */

import { Router, Request, Response } from 'express';
import { db } from '@db';
import { claims, claimBreaches, claimDisputes, claimResolutions } from '@db/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { auth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Schema for claim creation
const createClaimSchema = z.object({
  bankId: z.string(),
  bankName: z.string(),
  fintechName: z.string(),
  accountNumber: z.string().optional(),
  claimDate: z.string().transform((val) => new Date(val)),
  policyNumber: z.string().optional(),
  // Breach details
  breachDate: z.string().transform((val) => new Date(val)),
  consentId: z.string().optional(),
  consentScope: z.string().optional(),
  affectedRecords: z.number().optional(),
  incidentDescription: z.string().optional(),
});

/**
 * GET /api/claims
 * Get all claims for the company
 */
router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    const allClaims = await db.query.claims.findMany({
      where: eq(claims.company_id, companyId),
      orderBy: [desc(claims.claim_date)]
    });
    
    return res.json(allClaims);
  } catch (error) {
    console.error('Error fetching claims:', error);
    return res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

/**
 * GET /api/claims/active
 * Get active claims (not disputed or resolved)
 */
router.get('/active', auth, async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    const activeClaims = await db.query.claims.findMany({
      where: and(
        eq(claims.company_id, companyId),
        eq(claims.is_disputed, false),
        eq(claims.is_resolved, false)
      ),
      orderBy: [desc(claims.claim_date)]
    });
    
    return res.json(activeClaims);
  } catch (error) {
    console.error('Error fetching active claims:', error);
    return res.status(500).json({ error: 'Failed to fetch active claims' });
  }
});

/**
 * GET /api/claims/disputed
 * Get disputed claims
 */
router.get('/disputed', auth, async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    // First get all disputed claims
    const disputedClaims = await db.query.claims.findMany({
      where: and(
        eq(claims.company_id, companyId),
        eq(claims.is_disputed, true)
      ),
      orderBy: [desc(claims.claim_date)]
    });
    
    // Then get the dispute details for each claim
    const claimsWithDisputes = await Promise.all(
      disputedClaims.map(async (claim) => {
        const dispute = await db.query.claimDisputes.findFirst({
          where: eq(claimDisputes.claim_id, claim.id)
        });
        
        return {
          ...claim,
          dispute
        };
      })
    );
    
    return res.json(claimsWithDisputes);
  } catch (error) {
    console.error('Error fetching disputed claims:', error);
    return res.status(500).json({ error: 'Failed to fetch disputed claims' });
  }
});

/**
 * GET /api/claims/resolved
 * Get resolved claims
 */
router.get('/resolved', auth, async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    // First get all resolved claims
    const resolvedClaims = await db.query.claims.findMany({
      where: and(
        eq(claims.company_id, companyId),
        eq(claims.is_resolved, true)
      ),
      orderBy: [desc(claims.claim_date)]
    });
    
    // Then get the resolution details for each claim
    const claimsWithResolutions = await Promise.all(
      resolvedClaims.map(async (claim) => {
        const resolution = await db.query.claimResolutions.findFirst({
          where: eq(claimResolutions.claim_id, claim.id)
        });
        
        return {
          ...claim,
          resolution
        };
      })
    );
    
    return res.json(claimsWithResolutions);
  } catch (error) {
    console.error('Error fetching resolved claims:', error);
    return res.status(500).json({ error: 'Failed to fetch resolved claims' });
  }
});

/**
 * GET /api/claims/:claimId
 * Get a specific claim by its ID
 */
router.get('/:claimId', auth, async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;
    const companyId = req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    const claim = await db.query.claims.findFirst({
      where: and(
        eq(claims.claim_id, claimId),
        eq(claims.company_id, companyId)
      )
    });
    
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    // Get breach details
    const breach = await db.query.claimBreaches.findFirst({
      where: eq(claimBreaches.claim_id, claim.id)
    });
    
    // Get dispute details if disputed
    let dispute = null;
    if (claim.is_disputed) {
      dispute = await db.query.claimDisputes.findFirst({
        where: eq(claimDisputes.claim_id, claim.id)
      });
    }
    
    // Get resolution details if resolved
    let resolution = null;
    if (claim.is_resolved) {
      resolution = await db.query.claimResolutions.findFirst({
        where: eq(claimResolutions.claim_id, claim.id)
      });
    }
    
    return res.json({
      ...claim,
      breach,
      dispute,
      resolution
    });
  } catch (error) {
    console.error('Error fetching claim details:', error);
    return res.status(500).json({ error: 'Failed to fetch claim details' });
  }
});

/**
 * POST /api/claims
 * Create a new claim
 */
router.post('/', auth, async (req: Request, res: Response) => {
  try {
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    
    if (!companyId || !userId) {
      return res.status(400).json({ error: 'Company ID and User ID are required' });
    }
    
    // Validate request body
    const validationResult = createClaimSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid claim data', 
        details: validationResult.error.format() 
      });
    }
    
    const data = validationResult.data;
    
    // Generate a unique claim ID (format: CLM-YYYY-XXX)
    const year = new Date().getFullYear();
    const claimCount = await db.query.claims.findMany();
    const claimNumber = String(claimCount.length + 1).padStart(3, '0');
    const claimId = `CLM-${year}-${claimNumber}`;
    
    // Create the new claim
    const [newClaim] = await db.insert(claims).values({
      claim_id: claimId,
      bank_id: data.bankId,
      bank_name: data.bankName,
      fintech_name: data.fintechName,
      account_number: data.accountNumber,
      claim_date: data.claimDate,
      claim_amount: 50.00, // Default amount
      policy_number: data.policyNumber,
      company_id: companyId,
      created_by: userId
    }).returning();
    
    // Create breach details
    const [breach] = await db.insert(claimBreaches).values({
      claim_id: newClaim.id,
      breach_date: data.breachDate,
      consent_id: data.consentId,
      consent_scope: data.consentScope,
      affected_records: data.affectedRecords,
      incident_description: data.incidentDescription
    }).returning();
    
    return res.status(201).json({
      ...newClaim,
      breach
    });
  } catch (error) {
    console.error('Error creating claim:', error);
    return res.status(500).json({ error: 'Failed to create claim' });
  }
});

/**
 * POST /api/claims/:claimId/dispute
 * Create a dispute for a claim
 */
router.post('/:claimId/dispute', auth, async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;
    const { disputeReason, disputeDetails } = req.body;
    const companyId = req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    // Find the claim
    const claim = await db.query.claims.findFirst({
      where: and(
        eq(claims.claim_id, claimId),
        eq(claims.company_id, companyId)
      )
    });
    
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    // Mark claim as disputed
    await db.update(claims)
      .set({ 
        is_disputed: true,
        status: 'under_review'
      })
      .where(eq(claims.id, claim.id));
    
    // Create the dispute record
    const [dispute] = await db.insert(claimDisputes).values({
      claim_id: claim.id,
      dispute_reason: disputeReason,
      dispute_details: disputeDetails,
      dispute_date: new Date()
    }).returning();
    
    return res.status(201).json(dispute);
  } catch (error) {
    console.error('Error creating dispute:', error);
    return res.status(500).json({ error: 'Failed to create dispute' });
  }
});

/**
 * POST /api/claims/:claimId/resolve
 * Resolve a claim
 */
router.post('/:claimId/resolve', auth, async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params;
    const { resolutionType, paymentAmount, resolutionNotes } = req.body;
    const companyId = req.user?.company_id;
    
    if (!companyId) {
      return res.status(400).json({ error: 'Company ID is required' });
    }
    
    // Find the claim
    const claim = await db.query.claims.findFirst({
      where: and(
        eq(claims.claim_id, claimId),
        eq(claims.company_id, companyId)
      )
    });
    
    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }
    
    // Determine status based on resolution type
    let status = 'approved';
    if (resolutionType === 'partial_payment') {
      status = 'partially_approved';
    } else if (resolutionType === 'policy_exclusion' || resolutionType === 'claim_withdrawn') {
      status = 'denied';
    }
    
    // Mark claim as resolved
    await db.update(claims)
      .set({ 
        is_resolved: true,
        status: status
      })
      .where(eq(claims.id, claim.id));
    
    // Create the resolution record
    const [resolution] = await db.insert(claimResolutions).values({
      claim_id: claim.id,
      resolution_type: resolutionType,
      resolution_date: new Date(),
      payment_amount: paymentAmount,
      resolution_notes: resolutionNotes
    }).returning();
    
    return res.status(201).json(resolution);
  } catch (error) {
    console.error('Error resolving claim:', error);
    return res.status(500).json({ error: 'Failed to resolve claim' });
  }
});

export default router;