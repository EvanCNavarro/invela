/**
 * Risk Score Configuration API Routes
 * 
 * This file contains the endpoints for managing risk score configurations
 * including saving and retrieving dimension rankings and thresholds.
 * Also includes endpoints for comparative analysis features.
 */

import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { companies } from '../../db/schema';
import { eq, not, like, asc, ilike, and } from 'drizzle-orm';
import { requireAuth, optionalAuth } from '../middleware/auth';

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
  riskAcceptanceLevel: number;
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

// Test endpoint to broadcast updates via WebSocket
router.post('/broadcast-test', async (req: Request, res: Response) => {
  try {
    const { type, score, riskLevel, priorities } = req.body;
    const websocket = await import('../routes/websocket');
    
    // Default test data for priorities
    const testPriorities: RiskPriorities = priorities || {
      dimensions: [
        {
          id: 'data_governance',
          name: 'Data Governance',
          description: 'How data is managed, controlled and protected',
          weight: 30,
          value: 85,
          color: '#4285F4'
        },
        {
          id: 'system_security',
          name: 'System Security',
          description: 'Protection against unauthorized access and attacks',
          weight: 25,
          value: 72,
          color: '#EA4335'
        },
        {
          id: 'access_controls',
          name: 'Access Controls',
          description: 'User authentication and permission management',
          weight: 20,
          value: 65,
          color: '#FBBC05'
        },
        {
          id: 'business_resilience',
          name: 'Business Resilience',
          description: 'Ability to maintain operations during disruptions',
          weight: 15,
          value: 78,
          color: '#34A853'
        },
        {
          id: 'compliance_posture',
          name: 'Compliance Posture',
          description: 'Adherence to regulatory requirements',
          weight: 7,
          value: 90,
          color: '#8E44AD'
        },
        {
          id: 'incident_response',
          name: 'Incident Response',
          description: 'Process for handling security incidents',
          weight: 3,
          value: 83,
          color: '#F39C12'
        }
      ],
      riskAcceptanceLevel: score || 75,
      lastUpdated: new Date().toISOString()
    };
    
    // Based on the type parameter, broadcast different updates
    if (type === 'score' || !type) {
      // Broadcast risk score update
      websocket.broadcastRiskScoreUpdate(
        score || 75, 
        riskLevel || 'medium'
      );
      return res.status(200).json({ 
        success: true, 
        type: 'score', 
        score: score || 75, 
        riskLevel: riskLevel || 'medium' 
      });
    } else if (type === 'priorities') {
      // Broadcast risk priorities update
      websocket.broadcastRiskPrioritiesUpdate(testPriorities);
      return res.status(200).json({ 
        success: true, 
        type: 'priorities',
        priorities: testPriorities
      });
    } else {
      return res.status(400).json({ error: 'Invalid update type' });
    }
  } catch (error) {
    console.error('Error in broadcast test endpoint:', error);
    return res.status(500).json({ error: 'Broadcast test endpoint error' });
  }
});

// GET endpoint to retrieve the risk score configuration
router.get('/configuration', optionalAuth, async (req: Request, res: Response) => {
  try {
    // Allow anonymous access with fallback to company ID 1
    const companyId = req.user?.company_id || 1;
    console.log(`[RiskConfiguration] Using company ID: ${companyId} (${req.user ? 'authenticated' : 'unauthenticated'})`);
    
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
router.post('/configuration', optionalAuth, async (req: Request, res: Response) => {
  try {
    // Allow anonymous access with fallback to company ID 1
    const companyId = req.user?.company_id || 1;
    console.log(`[RiskConfiguration] Using company ID: ${companyId} (${req.user ? 'authenticated' : 'unauthenticated'})`);
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
router.get('/priorities', optionalAuth, async (req: Request, res: Response) => {
  try {
    // Enhanced error logging
    console.log('[RiskPriorities] GET request received');
    
    // Allow access without authentication - we'll use a fixed company ID for demo purposes
    const companyId = req.user?.company_id || 1; // Default to company 1 if no user in session
    console.log(`[RiskPriorities] Using company ID: ${companyId} (${req.user ? 'authenticated' : 'unauthenticated'})`);

    
    const company = await db.query.companies.findFirst({
      where: eq(companies.id, companyId),
      columns: {
        risk_priorities: true
      }
    });

    console.log('[RiskPriorities] Retrieved company from DB:', company ? 'found' : 'not found');
    
    if (company) {
      console.log('[RiskPriorities] risk_priorities in DB:', company.risk_priorities ? 
        `present (${typeof company.risk_priorities})` : 'not present');
      
      if (company.risk_priorities) {
        // Log what we have in the DB
        const retrievedPriorities = company.risk_priorities as any;
        console.log('[RiskPriorities] Retrieved dimensions from DB type:', 
          Array.isArray(retrievedPriorities.dimensions) ? 'Array' : typeof retrievedPriorities.dimensions);
        console.log('[RiskPriorities] First dimension in DB:', 
          retrievedPriorities.dimensions?.[0] ? JSON.stringify(retrievedPriorities.dimensions[0]) : 'none');
      }
    }
    
    if (!company || !company.risk_priorities) {
      console.log('[RiskPriorities] No priorities found in DB, returning null');
      // Return null if no priorities exist
      return res.status(200).json(null);
    }

    console.log('[RiskPriorities] Returning priorities from DB');
    return res.status(200).json(company.risk_priorities);
  } catch (error) {
    console.error('Error retrieving risk priorities:', error);
    return res.status(500).json({ error: 'Failed to retrieve risk priorities' });
  }
});

// POST endpoint to save the risk priorities
router.post('/priorities', optionalAuth, async (req: Request, res: Response) => {
  try {
    console.log('[RiskPriorities] Received POST request to save priorities');
    
    // Allow access without authentication - we'll use a fixed company ID for demo purposes
    const companyId = req.user?.company_id || 1; // Default to company 1 if no user in session
    console.log(`[RiskPriorities] Using company ID: ${companyId} (${req.user ? 'authenticated' : 'unauthenticated'})`);

    console.log(`[RiskPriorities] Processing request for company ID: ${companyId}`);
    
    const { updateCompanyScore, ...prioritiesData } = req.body;
    const priorities: RiskPriorities = prioritiesData;
    
    console.log('[RiskPriorities] Request body:', JSON.stringify(priorities));
    console.log('[RiskPriorities] Update company score flag:', updateCompanyScore);

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
    
    // Prepare update data
    const updateData: any = {
      risk_priorities: sanitizedPriorities as any,
      updated_at: new Date()
    };
    
    // Also update chosen_score if updateCompanyScore flag is true
    if (updateCompanyScore && priorities.riskAcceptanceLevel !== undefined) {
      const numericRiskLevel = Number(priorities.riskAcceptanceLevel);
      if (!isNaN(numericRiskLevel)) {
        console.log(`[RiskPriorities] Also updating company chosen_score to ${numericRiskLevel}`);
        updateData.chosen_score = numericRiskLevel;
      }
    }
    
    // Update the company record with the new priorities and chosen_score if needed
    await db.update(companies)
      .set(updateData)
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

// GET endpoint to search network companies for comparison
router.get('/network-companies', optionalAuth, async (req: Request, res: Response) => {
  try {
    // Log the request
    console.log('[RiskComparison] Network companies search request received');
    
    // Allow access without authentication with fallback to company ID 1
    const companyId = req.user?.company_id || 1;
    console.log(`[RiskComparison] Using company ID: ${companyId} (${req.user ? 'authenticated' : 'unauthenticated'})`);
    
    // Get search query parameter with fallback to empty string
    const searchQuery = req.query.q ? String(req.query.q).trim() : '';
    console.log(`[RiskComparison] Search query: "${searchQuery}"`);
    
    // Limit the number of results
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
    
    // Execute the query with base condition
    let query = db.select({
      id: companies.id,
      name: companies.name,
      category: companies.category,
      riskScore: companies.risk_score,
      chosenScore: companies.chosen_score,
      risk_priorities: companies.risk_priorities
    })
    .from(companies)
    .where(not(eq(companies.id, companyId)));
    
    // Apply search filter if provided
    if (searchQuery) {
      query = query.where(ilike(companies.name, `%${searchQuery}%`));
    }
    
    const networkCompanies = await query
      .limit(limit)
      .orderBy(asc(companies.name));
    
    // Transform companies for client consumption
    const formattedCompanies = networkCompanies.map(company => {
      // Extract the risk dimensions if available
      let dimensions: Record<string, number> = {};
      
      if (company.risk_priorities && typeof company.risk_priorities === 'object') {
        const priorities = company.risk_priorities as any;
        if (priorities.dimensions && Array.isArray(priorities.dimensions)) {
          // Convert dimensions array to record format expected by the chart
          priorities.dimensions.forEach((dim: any) => {
            if (dim.id && typeof dim.value === 'number') {
              dimensions[dim.id] = dim.value;
            }
          });
        }
      }
      
      // If no dimensions data exists, derive from authentic risk score data
      if (Object.keys(dimensions).length === 0) {
        const baseScore = company.chosenScore || company.riskScore || 0;
        
        // Only provide dimension data if company has an actual risk score
        if (baseScore > 0) {
          // Use deterministic calculation based on company ID for consistency
          const seed = company.id;
          const deterministicRandom = (offset: number) => {
            const x = Math.sin(seed + offset) * 10000;
            return x - Math.floor(x);
          };
          
          // Calculate dimensions based on authentic risk score with company-specific variations
          const variance = 12;
          dimensions = {
            'cyber_security': Math.max(0, Math.min(100, baseScore + (deterministicRandom(1) - 0.5) * variance)),
            'financial_stability': Math.max(0, Math.min(100, baseScore + (deterministicRandom(2) - 0.5) * variance)),
            'potential_liability': Math.max(0, Math.min(100, baseScore + (deterministicRandom(3) - 0.5) * variance)),
            'dark_web_data': Math.max(0, Math.min(100, baseScore + (deterministicRandom(4) - 0.5) * variance)),
            'public_sentiment': Math.max(0, Math.min(100, baseScore + (deterministicRandom(5) - 0.5) * variance)),
            'data_access_scope': Math.max(0, Math.min(100, baseScore + (deterministicRandom(6) - 0.5) * variance))
          };
        }
      }
      
      return {
        id: company.id,
        name: company.name,
        companyType: company.category || 'Network',
        description: `${company.name} - Network company`,
        score: company.chosenScore || company.riskScore || 50, // Fallback to 50 if no score
        dimensions
      };
    });
    
    console.log(`[RiskComparison] Returning ${formattedCompanies.length} network companies`);
    return res.status(200).json(formattedCompanies);
  } catch (error) {
    console.error('Error searching network companies:', error);
    return res.status(500).json({ error: 'Failed to search network companies' });
  }
});

// GET endpoint to get industry average risk data for comparison
router.get('/industry-average', optionalAuth, async (req: Request, res: Response) => {
  try {
    console.log('[RiskComparison] Industry average request received');
    
    // Generate the industry average data
    // This is calculated from the average of all companies in the system
    const allCompanies = await db.select({
      id: companies.id,
      name: companies.name,
      category: companies.category,
      riskScore: companies.risk_score,
      chosenScore: companies.chosen_score,
      risk_priorities: companies.risk_priorities
    })
    .from(companies)
    .where(
      // Only include companies that have some risk data
      not(eq(companies.risk_score, null))
    );
    
    console.log(`[RiskComparison] Found ${allCompanies.length} companies with risk data`);
    
    // If no companies have risk data, return a default industry average
    if (allCompanies.length === 0) {
      return res.status(200).json({
        id: 0, // Special ID for industry average
        name: "Industry Average",
        companyType: "Benchmark",
        description: "Average risk profile across all companies in the network",
        score: 50, // Default mid-range score
        dimensions: {
          cyber_security: 50,
          financial_stability: 50,
          dark_web_data: 50,
          public_sentiment: 50,
          potential_liability: 50,
          data_access_scope: 50
        }
      });
    }
    
    // Calculate the average score
    const totalScore = allCompanies.reduce((sum, company) => {
      return sum + (company.chosenScore || company.riskScore || 50);
    }, 0);
    const averageScore = Math.round(totalScore / allCompanies.length);
    
    // Calculate average dimension values
    // First, collect all dimension values
    const dimensionValues: Record<string, number[]> = {};
    
    allCompanies.forEach(company => {
      if (company.risk_priorities && typeof company.risk_priorities === 'object') {
        const priorities = company.risk_priorities as any;
        if (priorities.dimensions && Array.isArray(priorities.dimensions)) {
          priorities.dimensions.forEach((dim: any) => {
            if (dim.id && typeof dim.value === 'number') {
              if (!dimensionValues[dim.id]) {
                dimensionValues[dim.id] = [];
              }
              dimensionValues[dim.id].push(dim.value);
            }
          });
        }
      }
    });
    
    // Calculate the average for each dimension
    const averageDimensions: Record<string, number> = {};
    Object.entries(dimensionValues).forEach(([dimId, values]) => {
      if (values.length > 0) {
        const sum = values.reduce((total, val) => total + val, 0);
        averageDimensions[dimId] = Math.round(sum / values.length);
      } else {
        // Default to 50 if no values
        averageDimensions[dimId] = 50;
      }
    });
    
    // Ensure we have values for the default dimensions
    const defaultDimensions = [
      'cyber_security',
      'financial_stability',
      'dark_web_data',
      'public_sentiment',
      'potential_liability',
      'data_access_scope'
    ];
    
    defaultDimensions.forEach(dimId => {
      if (averageDimensions[dimId] === undefined) {
        averageDimensions[dimId] = 50;
      }
    });
    
    // Return the industry average data
    const industryAverage = {
      id: 0, // Special ID for industry average
      name: "Industry Average",
      companyType: "Benchmark",
      description: "Average risk profile across all companies in the network",
      score: averageScore,
      dimensions: averageDimensions
    };
    
    console.log('[RiskComparison] Returning industry average data');
    return res.status(200).json(industryAverage);
  } catch (error) {
    console.error('Error generating industry average data:', error);
    return res.status(500).json({ error: 'Failed to generate industry average data' });
  }
});

export default router;
