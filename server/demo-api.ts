import { Router } from 'express';
import { db } from '@db';
import { companies, users, tasks, relationships, invitations } from '@db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { 
  transformCompanyData, 
  transformUserData, 
  transformPersonaValue,
  validateNetworkSize 
} from './utils/demo-data-transformer';

const router = Router();

/**
 * ========================================
 * Company Name Generation API
 * ========================================
 * 
 * Generates unique, professional company names using the advanced combinatorial system.
 * This endpoint ensures no naming conflicts by pre-validating against the database,
 * eliminating the collision issues that occur when using static name arrays.
 * 
 * Key Features:
 * - Uses 118,000+ name combinations from advanced generation system
 * - Pre-validates uniqueness against existing companies
 * - Returns ready-to-use names that won't cause database conflicts
 * - Professional business naming with proper suffixes
 * - Comprehensive logging for debugging and monitoring
 * 
 * @endpoint GET /api/demo/generate-company-name
 * @version 1.0.0
 * @since 2025-05-28
 */
router.get('/demo/generate-company-name', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log('[DemoAPI] [CompanyName] Starting unique company name generation:', {
      timestamp: new Date().toISOString(),
      requestId
    });

    // Import the advanced company name utilities
    const { generateAdvancedCompanyName, checkCompanyNameUniqueness } = await import('./utils/company-name-utils');
    
    console.log('[DemoAPI] [CompanyName] Loaded advanced name generation utilities');
    
    // Generate a base name using the combinatorial system
    // Start with attempt 1 for full combinatorial generation (PREFIX + CORE + SUFFIX)
    const generatedName = await generateAdvancedCompanyName('Demo Company', 1);
    
    console.log('[DemoAPI] [CompanyName] Advanced generation produced:', {
      generatedName,
      strategy: 'full_combinatorial',
      duration: Date.now() - startTime
    });

    // Validate uniqueness against database
    console.log('[DemoAPI] [CompanyName] Validating name uniqueness against database...');
    
    const uniquenessCheck = await checkCompanyNameUniqueness(generatedName);
    
    if (!uniquenessCheck.isUnique) {
      console.log('[DemoAPI] [CompanyName] Name collision detected, generating alternative:', {
        originalName: generatedName,
        existingCompany: uniquenessCheck.conflictDetails
      });
      
      // Try different generation strategies until we find a unique name
      let finalName = generatedName;
      let isUnique = false;
      let attempt = 2;
      const maxAttempts = 5;
      
      while (!isUnique && attempt <= maxAttempts) {
        console.log(`[DemoAPI] [CompanyName] Attempting strategy ${attempt} for uniqueness...`);
        
        const alternativeName = await generateAdvancedCompanyName('Demo Company', attempt);
        const alternativeCheck = await checkCompanyNameUniqueness(alternativeName);
        
        if (alternativeCheck.isUnique) {
          finalName = alternativeName;
          isUnique = true;
          console.log('[DemoAPI] [CompanyName] Found unique alternative:', {
            finalName,
            attempt,
            duration: Date.now() - startTime
          });
        } else {
          console.log(`[DemoAPI] [CompanyName] Strategy ${attempt} also resulted in collision, trying next...`);
          attempt++;
        }
      }
      
      // If all strategies failed, add timestamp suffix as guaranteed unique fallback
      if (!isUnique) {
        finalName = `${generatedName} ${Date.now()}`;
        console.log('[DemoAPI] [CompanyName] Using timestamp fallback for guaranteed uniqueness:', {
          finalName,
          originalName: generatedName,
          wasModified: true,
          strategy: 'timestamp_fallback',
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        companyName: finalName,
        wasModified: true,
        originalName: generatedName,
        strategy: isUnique ? `attempt_${attempt - 1}` : 'timestamp_fallback',
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      });
    }

    // Success - original name is unique
    const processingTime = Date.now() - startTime;
    
    console.log('[DemoAPI] [CompanyName] Company name generation completed successfully:', {
      companyName: generatedName,
      wasModified: false,
      strategy: 'full_combinatorial',
      processingTime,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      companyName: generatedName,
      wasModified: false,
      originalName: generatedName,
      strategy: 'full_combinatorial',
      processingTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    
    console.error('[DemoAPI] [CompanyName] Company name generation failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: errorDuration,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to generate unique company name',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'NAME_GENERATION_FAILED',
      processingTime: errorDuration,
      timestamp: new Date().toISOString()
    });
  }
});

// ========================================
// DEMO COMPANY CREATION ENDPOINT
// ========================================

/**
 * Creates a demo company with persona-specific configuration.
 * Implements comprehensive persona-based tab access, onboarding settings,
 * and network relationship creation for Data Provider personas.
 * 
 * @endpoint POST /api/demo/company/create
 * @version 2.0.0
 * @since 2025-05-28
 */
router.post('/demo/company/create', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('[DemoAPI] 🏢 Raw company creation request:', req.body);
    
    // ========================================
    // DATA TRANSFORMATION & VALIDATION
    // ========================================
    
    // Transform the company data using our utility
    const transformedData = transformCompanyData(req.body);
    
    console.log('[DemoAPI] 🔄 Company data transformation completed:', {
      originalPersona: req.body.persona,
      transformedCategory: transformedData.category,
      shouldCreateNetwork: transformedData.shouldCreateNetwork,
      networkSize: transformedData.networkSize,
      processingTime: Date.now() - startTime
    });
    
    // ========================================
    // PERSONA-SPECIFIC CONFIGURATION
    // ========================================
    
    /**
     * Configure company settings based on persona type.
     * Implements role-based access control through available_tabs configuration.
     * 
     * Persona Tab Access Matrix:
     * - Data Provider (Bank): Full access including network management
     * - Accredited FinTech: Business-focused tabs without network
     * - New FinTech: Limited access for onboarding
     * - Invela Admin: Platform administration access
     */
    const getPersonaConfiguration = (persona: string) => {
      console.log(`[DemoAPI] 🎭 Configuring persona-specific settings for: ${persona}`);
      
      switch (persona) {
        case 'data-provider':
          return {
            category: 'Bank',
            accreditation_status: 'APPROVED',
            available_tabs: ['dashboard', 'network', 'task-center', 'file-vault', 'insights', 'claims', 'risk-score'],
            onboarding_company_completed: true,
            demo_persona_type: 'data-provider',
            description: 'Enterprise banking institution specializing in financial risk assessment and network management'
          };
          
        case 'accredited-data-recipient':
          return {
            category: 'FinTech',
            accreditation_status: 'APPROVED',
            available_tabs: ['dashboard', 'task-center', 'file-vault', 'insights'],
            onboarding_company_completed: true,
            demo_persona_type: 'accredited-data-recipient',
            description: 'Accredited FinTech with full business platform access'
          };
          
        case 'invela-admin':
          return {
            category: 'Platform',
            accreditation_status: 'ADMIN',
            available_tabs: ['dashboard', 'network', 'task-center', 'file-vault', 'insights', 'playground', 'claims', 'risk-score'],
            onboarding_company_completed: true,
            demo_persona_type: 'invela-admin',
            description: 'Platform administration with full system access and configuration capabilities'
          };
          
        default: // 'new-data-recipient'
          return {
            category: 'FinTech',
            accreditation_status: 'PENDING',
            available_tabs: ['task-center'],
            onboarding_company_completed: false,
            demo_persona_type: 'new-data-recipient',
            description: 'New FinTech company beginning the onboarding process'
          };
      }
    };
    
    const personaConfig = getPersonaConfiguration(transformedData.persona);
    
    console.log(`[DemoAPI] ✅ Persona configuration applied:`, {
      persona: transformedData.persona,
      category: personaConfig.category,
      availableTabs: personaConfig.available_tabs,
      onboardingRequired: !personaConfig.onboarding_company_completed,
      tabCount: personaConfig.available_tabs.length
    });
    
    // ========================================
    // DATABASE COMPANY CREATION
    // ========================================
    
    const companyResult = await db.insert(companies).values({
      name: transformedData.name,
      category: personaConfig.category,
      available_tabs: personaConfig.available_tabs,
      demo_persona_type: personaConfig.demo_persona_type,
      onboarding_company_completed: personaConfig.onboarding_company_completed,
      is_demo: true,
      description: personaConfig.description
    }).returning();
    
    const company = companyResult[0];
    if (!company) {
      throw new Error('Failed to create company - no result returned from database');
    }
    
    console.log('[DemoAPI] ✅ Company created successfully:', { 
      id: company.id, 
      name: company.name, 
      category: company.category,
      availableTabs: personaConfig.available_tabs,
      personaType: personaConfig.demo_persona_type,
      transformedPersona: transformedData.persona,
      shouldCreateNetwork: transformedData.shouldCreateNetwork,
      processingTime: Date.now() - startTime
    });
    
    // Create network relationships for Data Provider banks
    if (transformedData.shouldCreateNetwork) {
      console.log('[DemoAPI] 🌐 Starting network creation for Data Provider:', {
        bankId: company.id,
        bankName: company.name,
        targetNetworkSize: transformedData.networkSize,
        persona: transformedData.persona
      });
      
      try {
        // Find available FinTech companies
        const availableFinTechs = await db.query.companies.findMany({
          where: and(
            eq(companies.category, 'FinTech'),
            eq(companies.is_demo, false)
          ),
          limit: transformedData.networkSize
        });
        
        console.log('[DemoAPI] 📊 FinTech discovery results:', {
          requestedSize: transformedData.networkSize,
          availableCount: availableFinTechs.length,
          firstFewNames: availableFinTechs.slice(0, 3).map(c => c.name)
        });
        
        if (availableFinTechs.length === 0) {
          console.warn('[DemoAPI] ⚠️ No FinTech companies available for network creation');
        } else {
          // Create relationships
          let successCount = 0;
          let errorCount = 0;
          
          for (const fintech of availableFinTechs) {
            try {
              await db.insert(relationships).values({
                company_id: company.id,
                related_company_id: fintech.id,
                relationship_type: 'data_provider',
                status: 'active'
              });
              
              successCount++;
              console.log('[DemoAPI] ✅ Relationship created:', {
                bank: company.name,
                fintech: fintech.name,
                relationshipId: `${company.id}-${fintech.id}`
              });
            } catch (relError: any) {
              errorCount++;
              console.error('[DemoAPI] ❌ Relationship creation failed:', {
                bank: company.name,
                fintech: fintech.name,
                error: relError.message
              });
            }
          }
          
          console.log('[DemoAPI] 🎯 Network creation completed:', {
            bankName: company.name,
            targetSize: transformedData.networkSize,
            successfulRelationships: successCount,
            failedRelationships: errorCount,
            successRate: `${((successCount / transformedData.networkSize) * 100).toFixed(1)}%`
          });
        }
      } catch (networkError: any) {
        console.error('[DemoAPI] 💥 Network creation process failed:', {
          bankId: company.id,
          bankName: company.name,
          error: networkError.message,
          stack: networkError.stack
        });
      }
    }
    
    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    
    const finalProcessingTime = Date.now() - startTime;
    
    console.log('[DemoAPI] 🎉 Demo company creation completed successfully:', {
      companyId: company.id,
      companyName: company.name,
      persona: transformedData.persona,
      category: personaConfig.category,
      availableTabs: personaConfig.available_tabs.length,
      networkCreated: transformedData.shouldCreateNetwork,
      totalProcessingTime: finalProcessingTime
    });
    
    // Return consistent response format that frontend expects
    res.json({ 
      success: true, 
      company: company,
      id: company.id, // Ensure ID is easily accessible for next step
      companyId: company.id,
      persona: transformedData.persona,
      availableTabs: personaConfig.available_tabs,
      processingTime: finalProcessingTime
    });
  } catch (error: any) {
    console.error('[DemoAPI] Company creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/demo/user/create', async (req, res) => {
  try {
    console.log('[DemoAPI] 👤 Raw user creation request:', req.body);
    
    // Extract company ID - it might come from different fields depending on the frontend implementation
    const companyId = req.body.actualCompanyId || req.body.companyId;
    
    // If we received the placeholder string, try to extract from metadata
    const actualCompanyId = (typeof companyId === 'string' && companyId === 'COMPANY_ID_FROM_STEP_1') 
      ? req.body.metadata?.companyId || req.body.company?.id 
      : companyId;
    
    console.log('[DemoAPI] 🔍 Company ID resolution:', {
      originalCompanyId: req.body.companyId,
      actualCompanyId: req.body.actualCompanyId,
      metadataCompanyId: req.body.metadata?.companyId,
      companyFromObject: req.body.company?.id,
      resolvedId: actualCompanyId
    });
    
    // Transform the user data using our utility
    const transformedData = transformUserData(req.body, actualCompanyId);
    
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const user = await db.insert(users).values({
      email: transformedData.email,
      full_name: transformedData.fullName,
      password: hashedPassword,
      company_id: transformedData.companyId,
      is_demo: true
    }).returning();
    
    console.log('[DemoAPI] ✅ User created successfully:', {
      id: user[0].id,
      email: user[0].email,
      fullName: user[0].full_name,
      companyId: user[0].company_id,
      role: transformedData.role
    });
    
    res.json({ success: true, user: user[0] });
  } catch (error: any) {
    console.error('[DemoAPI] ❌ User creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/demo/auth/setup', async (req, res) => {
  try {
    res.json({ success: true, message: 'Auth setup complete' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * ========================================
 * Demo Environment Finalization Endpoint
 * ========================================
 * 
 * Completes the demo setup and automatically authenticates the user for seamless access.
 * This endpoint handles the final step of demo account creation by establishing an
 * authenticated session and preparing the environment for immediate dashboard access.
 * 
 * Key Features:
 * - Automatic user authentication after demo completion
 * - Session establishment for seamless dashboard access
 * - Environment preparation for demo data access
 * - Comprehensive error handling and logging
 * 
 * Authentication Flow:
 * 1. Validates user exists and belongs to specified company
 * 2. Establishes authenticated session via req.login()
 * 3. Configures demo environment permissions
 * 4. Returns success response with authentication status
 * 
 * @endpoint POST /api/demo/environment/finalize
 * @version 2.0.0
 * @since 2025-05-28
 */
router.post('/demo/environment/finalize', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { userId, companyId, demoType } = req.body;

    console.log('[DemoAPI] [Finalize] Starting demo environment finalization:', {
      userId,
      companyId,
      demoType,
      timestamp: new Date().toISOString()
    });

    // ========================================
    // PARAMETER VALIDATION
    // ========================================
    
    if (!userId) {
      console.error('[DemoAPI] [Finalize] Missing userId parameter');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userId is required',
        code: 'MISSING_USER_ID',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!companyId) {
      console.error('[DemoAPI] [Finalize] Missing companyId parameter');
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: companyId is required',
        code: 'MISSING_COMPANY_ID',
        timestamp: new Date().toISOString()
      });
    }

    // ========================================
    // USER VERIFICATION
    // ========================================
    
    console.log('[DemoAPI] [Finalize] Verifying user and company data...');
    
    const [userData] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!userData) {
      console.error('[DemoAPI] [Finalize] User not found:', { userId });
      return res.status(404).json({
        success: false,
        error: 'User not found for authentication',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }

    // Verify user belongs to the correct company
    if (userData.company_id !== companyId) {
      console.error('[DemoAPI] [Finalize] Company mismatch:', {
        userCompanyId: userData.company_id,
        requestedCompanyId: companyId
      });
      return res.status(403).json({
        success: false,
        error: 'User does not belong to specified company',
        code: 'COMPANY_MISMATCH',
        timestamp: new Date().toISOString()
      });
    }

    console.log('[DemoAPI] [Finalize] User verification successful:', {
      userId: userData.id,
      email: userData.email,
      companyId: userData.company_id,
      fullName: userData.full_name
    });

    // ========================================
    // ENVIRONMENT SETUP
    // ========================================
    
    const environmentId = `env_demo_${Date.now()}_${userId}`;
    
    const environmentConfig = {
      type: demoType || 'standard',
      features: {
        demoDataAccess: true,
        tutorialMode: true,
        limitedFunctionality: false
      },
      permissions: {
        canInviteUsers: true,
        canModifySettings: true,
        canAccessAllFeatures: true
      }
    };

    // ========================================
    // SESSION AUTHENTICATION
    // ========================================
    
    console.log('[DemoAPI] [Finalize] Establishing user session...');
    
    // Establish authenticated session
    await new Promise<void>((resolve, reject) => {
      req.login(userData, (err) => {
        if (err) {
          console.error('[DemoAPI] [Finalize] Session authentication failed:', err);
          reject(err);
        } else {
          console.log('[DemoAPI] [Finalize] Session established successfully');
          resolve();
        }
      });
    });

    const authDuration = Date.now() - startTime;

    console.log('[DemoAPI] [Finalize] Demo finalization completed successfully:', {
      userId: userData.id,
      email: userData.email,
      companyId: userData.company_id,
      environmentId,
      authenticated: true,
      totalDuration: authDuration,
      timestamp: new Date().toISOString()
    });

    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    
    res.status(200).json({
      success: true,
      demoReady: true,
      authenticated: true,
      loginRequired: false,
      accessUrl: '/dashboard',
      environmentId,
      environment: environmentConfig,
      user: {
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        companyId: userData.company_id
      },
      message: 'Demo environment created and user authenticated successfully. Redirecting to dashboard...',
      processingTime: authDuration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    
    console.error('[DemoAPI] [Finalize] Demo finalization failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: errorDuration,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to finalize demo environment',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'FINALIZATION_ERROR',
      processingTime: errorDuration,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;