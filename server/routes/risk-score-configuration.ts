/**
 * Risk Score Configuration API Routes
 * 
 * This file contains the endpoints for managing risk score configurations
 * including saving and retrieving dimension rankings and thresholds.
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { companies } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Define interface for risk dimension
interface RiskDimension {
  id: string;
  name: string;
  description: string;
  weight: number;
  value: number;
  color?: string;
}

// Define interface for risk thresholds
interface RiskThresholds {
  high: number;
  medium: number;
}

// Define interface for risk score configuration
interface RiskScoreConfiguration {
  dimensions: RiskDimension[];
  thresholds: RiskThresholds;
  score: number;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

// GET endpoint to retrieve the risk score configuration
router.get('/configuration', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const companyId = req.user.company_id;
    
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        risk_configuration: true
      }
    });

    if (!company || !company.risk_configuration) {
      // Return a default configuration if none exists
      return res.status(200).json(null);
    }

    return res.status(200).json(company.risk_configuration);
  } catch (error) {
    console.error('Error retrieving risk score configuration:', error);
    return res.status(500).json({ error: 'Failed to retrieve risk score configuration' });
  }
});

// POST endpoint to save the risk score configuration
router.post('/configuration', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const companyId = req.user.company_id;
    const configuration: RiskScoreConfiguration = req.body;

    // Validate the configuration
    if (!configuration.dimensions || !Array.isArray(configuration.dimensions)) {
      return res.status(400).json({ error: 'Invalid dimensions data' });
    }

    if (!configuration.thresholds || typeof configuration.thresholds !== 'object') {
      return res.status(400).json({ error: 'Invalid thresholds data' });
    }

    // Update the company record with the new configuration
    await db.update(companies)
      .set({
        risk_configuration: configuration as any,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));

    // Get the updated company record
    const updatedCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        risk_configuration: true
      }
    });

    return res.status(200).json(updatedCompany?.risk_configuration || configuration);
  } catch (error) {
    console.error('Error saving risk score configuration:', error);
    return res.status(500).json({ error: 'Failed to save risk score configuration' });
  }
});

export default router;
