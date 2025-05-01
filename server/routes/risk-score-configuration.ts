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

// Define interface for risk priorities
interface RiskPriorities {
  dimensions: RiskDimension[];
  lastUpdated: string;
}

// Non-authenticated test endpoint - for testing only
router.get('/test', async (req: Request, res: Response) => {
  try {
    // Return a test configuration
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
    
    return res.status(200).json(testConfig);
  } catch (error) {
    console.error('Error in test endpoint:', error);
    return res.status(500).json({ error: 'Test endpoint error' });
  }
});

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

// GET endpoint to retrieve the risk priorities
router.get('/priorities', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const companyId = req.user.company_id;
    
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        risk_priorities: true
      }
    });

    if (!company || !company.risk_priorities) {
      // Return null if no priorities exist
      return res.status(200).json(null);
    }

    return res.status(200).json(company.risk_priorities);
  } catch (error) {
    console.error('Error retrieving risk priorities:', error);
    return res.status(500).json({ error: 'Failed to retrieve risk priorities' });
  }
});

// POST endpoint to save the risk priorities
router.post('/priorities', requireAuth, async (req: Request, res: Response) => {
  try {
    console.log('[RiskPriorities] Received POST request to save priorities');
    
    if (!req.user) {
      console.log('[RiskPriorities] Unauthorized request - no user');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const companyId = req.user.company_id;
    console.log(`[RiskPriorities] Processing request for company ID: ${companyId}`);
    
    const priorities: RiskPriorities = req.body;
    console.log('[RiskPriorities] Request body:', JSON.stringify(priorities));

    // Validate the priorities
    if (!priorities.dimensions || !Array.isArray(priorities.dimensions)) {
      console.log('[RiskPriorities] Invalid dimensions data');
      return res.status(400).json({ error: 'Invalid dimensions data' });
    }

    // Add timestamp if not provided
    if (!priorities.lastUpdated) {
      priorities.lastUpdated = new Date().toISOString();
    }

    // Log the priorities shape before saving
    console.log('[RiskPriorities] Before save - Priorities dimensions type:', 
      Array.isArray(priorities.dimensions) ? 'Array' : typeof priorities.dimensions);
    console.log('[RiskPriorities] Before save - First dimension sample:', 
      priorities.dimensions?.[0] ? JSON.stringify(priorities.dimensions[0]) : 'none');
    
    // Ensure dimensions is always an array (defensive)
    if (!Array.isArray(priorities.dimensions)) {
      console.log('[RiskPriorities] WARNING: dimensions is not an array, trying to fix...');
      try {
        if (typeof priorities.dimensions === 'string') {
          priorities.dimensions = JSON.parse(priorities.dimensions);
        }
      } catch (e) {
        console.error('[RiskPriorities] Failed to parse dimensions:', e);
      }
    }

    // Force stringification and reparsing to avoid any hidden issues with the object
    const sanitizedPriorities = JSON.parse(JSON.stringify(priorities));
    
    // Update the company record with the new priorities
    await db.update(companies)
      .set({
        risk_priorities: sanitizedPriorities as any,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId));

    // Get the updated company record
    const updatedCompany = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        risk_priorities: true
      }
    });
    
    // Log what we got back from the database
    console.log('[RiskPriorities] Retrieved from database:', 
      updatedCompany ? JSON.stringify(updatedCompany) : 'null');
    
    if (updatedCompany?.risk_priorities) {
      const retrievedPriorities = updatedCompany.risk_priorities as any;
      console.log('[RiskPriorities] Retrieved dimensions type:', 
        Array.isArray(retrievedPriorities.dimensions) ? 'Array' : typeof retrievedPriorities.dimensions);
      console.log('[RiskPriorities] First retrieved dimension:', 
        retrievedPriorities.dimensions?.[0] ? JSON.stringify(retrievedPriorities.dimensions[0]) : 'none');
    }
    
    // Import the broadcastRiskPrioritiesUpdate function
    const { broadcastRiskPrioritiesUpdate } = await import('../routes/websocket');
    
    // Broadcast the update to all connected clients
    console.log('[RiskPriorities] Broadcasting update to connected clients');
    broadcastRiskPrioritiesUpdate(updatedCompany?.risk_priorities || priorities);

    return res.status(200).json(updatedCompany?.risk_priorities || priorities);
  } catch (error) {
    console.error('Error saving risk priorities:', error);
    return res.status(500).json({ error: 'Failed to save risk priorities' });
  }
});

export default router;
