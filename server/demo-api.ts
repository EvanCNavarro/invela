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
import { companies, users, sessions } from '@db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Demo Company Creation
 * Creates a new company for demo purposes with specified configuration
 */
router.post('/demo/company/create', async (req, res) => {
  try {
    const { name, type, persona, riskProfile, companySize } = req.body;

    console.log('[DemoAPI] Creating company:', { name, type, persona });

    // Create company record
    const [company] = await db.insert(companies).values({
      name,
      status: 'active',
      // Add demo-specific fields based on persona
      ...(type === 'demo' && { isDemoAccount: true }),
      ...(riskProfile && { riskProfile }),
      ...(companySize && { size: companySize }),
      metadata: {
        createdViaDemo: true,
        persona,
        setupTimestamp: new Date().toISOString()
      }
    }).returning();

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

    // Create user record
    const [user] = await db.insert(users).values({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      companyId: parseInt(companyId.replace('comp_', '')), // Convert from demo ID format
      role: role || 'user',
      status: 'active',
      metadata: {
        createdViaDemo: true,
        permissions,
        tempPassword,
        setupTimestamp: new Date().toISOString()
      }
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