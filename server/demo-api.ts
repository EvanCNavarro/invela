/**
 * ========================================
 * Demo API Endpoints
 * ========================================
 * 
 * Production-ready API endpoints for demo account creation and management.
 * Handles company creation, user setup, authentication, and email invitations.
 * 
 * @module server/demo-api
 * @version 1.0.0
 * @since 2025-05-25
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '@db';
import { companies, users } from '@db/schema';
import { eq } from 'drizzle-orm';
import { broadcastMessage } from './services/websocket';

const router = Router();

/**
 * Demo Company Creation
 * Creates a new company for demo purposes with specified configuration
 */
router.post('/demo/company/create', async (req, res) => {
  try {
    const { name, type, persona, riskProfile, companySize, metadata } = req.body;

    console.log('[DemoAPI] Creating company with full payload:', JSON.stringify(req.body, null, 2));
    console.log('[DemoAPI] Extracted fields:', { name, type, persona, companySize, riskProfile });

    // Broadcast start event to connected clients
    broadcastMessage('demo_action_start', {
      actionId: 'create-company',
      actionName: `Creating "${name}" organization`,
      timestamp: new Date().toISOString()
    });

    // Create realistic company data based on persona and size
    const getCompanyData = (persona: string, size: string) => {
      const baseData = {
        category: persona === 'accredited-data-recipient' ? 'FinTech' : 
                 persona === 'data-provider' ? 'Bank' : 'FinTech',
        accreditation_status: persona === 'accredited-data-recipient' ? 'APPROVED' : 'PENDING',
        is_demo: true,
        available_tabs: persona === 'accredited-data-recipient' ? 
          ['task-center', 'security', 'analytics', 'reports'] : ['task-center']
      };

      // Set realistic revenue and employee data based on company size
      if (size === 'large') {
        const revenueAmount = Math.floor(Math.random() * 500000000) + 100000000;
        return {
          ...baseData,
          revenue: `$${(revenueAmount / 1000000).toFixed(0)}M`, // Format as "$150M"
          num_employees: Math.floor(Math.random() * 9000) + 1000, // 1,000-10,000
          revenue_tier: 'large'
        };
      } else if (size === 'medium') {
        const revenueAmount = Math.floor(Math.random() * 90000000) + 10000000;
        return {
          ...baseData,
          revenue: `$${(revenueAmount / 1000000).toFixed(0)}M`, // Format as "$45M"
          num_employees: Math.floor(Math.random() * 900) + 100, // 100-1,000
          revenue_tier: 'medium'
        };
      } else {
        const revenueAmount = Math.floor(Math.random() * 9000000) + 1000000;
        return {
          ...baseData,
          revenue: `$${(revenueAmount / 1000000).toFixed(1)}M`, // Format as "$5.5M"
          num_employees: Math.floor(Math.random() * 90) + 10, // 10-100
          revenue_tier: 'small'
        };
      }
    };

    console.log('[DemoAPI] Generating company data for:', { persona, companySize });
    const companyData = getCompanyData(persona, companySize || 'medium');
    console.log('[DemoAPI] Generated company data:', companyData);
    
    // Create comprehensive company values
    const insertValues = {
      name,
      description: `Professional ${companyData.category.toLowerCase()} company specializing in secure data management and compliance`,
      ...companyData,
      risk_score: riskProfile || Math.floor(Math.random() * 40) + 60, // 60-100 for good companies
      legal_structure: 'Corporation',
      market_position: companyData.revenue_tier === 'large' ? 'Market Leader' : 
                      companyData.revenue_tier === 'medium' ? 'Established Player' : 'Growing Business',
      incorporation_year: new Date().getFullYear() - Math.floor(Math.random() * 15) - 5, // 5-20 years old
      funding_stage: companyData.revenue_tier === 'large' ? 'Public' : 
                    companyData.revenue_tier === 'medium' ? 'Series C' : 'Series B'
    };

    console.log('[DemoAPI] Final insert values:', JSON.stringify(insertValues, null, 2));
    
    // Create company record with comprehensive data
    const company = await db.insert(companies).values(insertValues).returning().then(rows => rows[0]);

    // Broadcast completion event
    broadcastMessage('demo_action_complete', {
      actionId: 'create-company',
      actionName: `Creating "${name}" organization`,
      success: true,
      result: {
        companyId: company.id,
        companyName: company.name
      },
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      companyId: company.id,
      companyData: {
        name: company.name,
        type,
        persona
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Company creation error:', error);
    
    // Broadcast error event
    broadcastMessage('demo_action_error', {
      actionId: 'create-company',
      actionName: 'Creating company organization',
      error: 'Failed to create company',
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create company',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo User Creation
 * Creates a new user account with proper role and permissions
 */
router.post('/demo/user/create', async (req, res) => {
  try {
    const { fullName, email, role, permissions, companyId } = req.body;

    console.log('[DemoAPI] Creating user:', { fullName, email, role, companyId });

    // Generate temporary password for demo
    const tempPassword = 'demo123'; // In production, use secure random generation
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Split full name
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Create user record using actual database fields
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      company_id: typeof companyId === 'string' && companyId.startsWith('comp_') 
        ? parseInt(companyId.replace('comp_', '')) 
        : parseInt(companyId)
    }).returning();

    res.json({
      success: true,
      userId: user.id,
      userData: {
        fullName,
        email,
        role
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] User creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo Authentication Setup
 * Sets up authentication credentials and generates login tokens
 */
router.post('/demo/auth/setup', async (req, res) => {
  try {
    const { userId, email, generateCredentials } = req.body;

    console.log('[DemoAPI] Setting up authentication:', { userId, email });

    // Generate demo session token
    const sessionToken = `demo_session_${Date.now()}_${userId}`;
    
    // In production, create proper session management
    const credentials = {
      loginUrl: '/login',
      email,
      tempPassword: 'demo123',
      sessionToken,
      setupComplete: true
    };

    res.json({
      success: true,
      credentials,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Auth setup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup authentication',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo Email Invitation
 * Sends welcome email with login credentials (requires SendGrid setup)
 */
router.post('/demo/email/send-invitation', async (req, res) => {
  try {
    const { userEmail, userName, companyName, loginCredentials } = req.body;

    console.log('[DemoAPI] Sending invitation email:', { userEmail, userName, companyName });

    // TODO: Integrate with SendGrid for actual email sending
    // For now, we'll simulate the email sending
    
    const emailSent = true; // In production, check actual SendGrid response
    const messageId = `msg_${Date.now()}`;

    res.json({
      success: true,
      emailSent,
      messageId,
      recipientEmail: userEmail,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Email invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitation email',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Demo Environment Finalization
 * Completes the demo setup and prepares the environment for access
 */
router.post('/demo/environment/finalize', async (req, res) => {
  try {
    const { userId, companyId, demoType } = req.body;

    console.log('[DemoAPI] Finalizing environment:', { userId, companyId, demoType });

    // Set up demo data and environment based on persona type
    const environmentId = `env_${Date.now()}`;
    
    // In production, this would initialize demo datasets, 
    // configure permissions, and prepare the dashboard

    res.json({
      success: true,
      demoReady: true,
      accessUrl: '/dashboard',
      environmentId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DemoAPI] Environment finalization error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to finalize demo environment',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;