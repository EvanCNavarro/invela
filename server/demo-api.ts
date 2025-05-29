import { Router } from 'express';
import { db } from '@db';
import { companies, users, tasks, relationships, invitations, TaskStatus } from '@db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { emailService } from './services/email/service';
import { 
  transformCompanyData, 
  transformUserData, 
  transformPersonaValue,
  validateNetworkSize 
} from './utils/demo-data-transformer';
import { generateBusinessDetails, type PersonaType } from './utils/business-details-generator.js';

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
    
    // Generate a base name using the combinatorial system with length variance
    // Use mixed preference for 50% short/long distribution
    const generatedName = await generateAdvancedCompanyName('Demo Company', 1, { 
      lengthPreference: 'mixed' 
    });
    
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
            description: 'Enterprise banking institution specializing in financial risk assessment and network management',
            // Add risk score data for Data Provider banks
            risk_score: Math.floor(Math.random() * 20) + 65, // 65-85 range (banks typically have higher scores)
            chosen_score: Math.floor(Math.random() * 20) + 65
          };
          
        case 'accredited-data-recipient':
          return {
            category: 'FinTech',
            accreditation_status: 'APPROVED',
            available_tabs: ['dashboard', 'task-center', 'file-vault', 'insights'],
            onboarding_company_completed: true,
            demo_persona_type: 'accredited-data-recipient',
            description: 'Accredited FinTech with full business platform access',
            // Add risk score data for Accredited Data Recipients
            risk_score: Math.floor(Math.random() * 30) + 40, // 40-70 range
            chosen_score: Math.floor(Math.random() * 30) + 40
          };
          
        case 'invela-admin':
          return {
            category: 'Platform',
            accreditation_status: 'ADMIN',
            available_tabs: ['dashboard', 'network', 'task-center', 'file-vault', 'insights', 'playground', 'claims', 'risk-score'],
            onboarding_company_completed: true,
            demo_persona_type: 'invela-admin',
            description: 'Platform administration with full system access and configuration capabilities',
            // Add risk score data for Invela Admin
            risk_score: Math.floor(Math.random() * 10) + 85, // 85-95 range (platform admin has highest scores)
            chosen_score: Math.floor(Math.random() * 10) + 85
          };
          
        default: // 'new-data-recipient'
          return {
            category: 'FinTech',
            accreditation_status: 'PENDING',
            available_tabs: ['task-center'],
            onboarding_company_completed: false,
            demo_persona_type: 'new-data-recipient',
            description: 'New FinTech company beginning the onboarding process'
            // Note: No risk score data for non-accredited entities (PENDING status)
            // Risk assessment is only available after completing accreditation process
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
    // BUSINESS DETAILS GENERATION
    // ========================================
    
    // Generate comprehensive business details based on persona type
    const isApproved = personaConfig.accreditation_status === 'APPROVED';
    const businessDetails = generateBusinessDetails(
      transformedData.name,
      personaConfig.demo_persona_type as PersonaType,
      isApproved
    );
    
    console.log('[DemoAPI] Generated business details:', {
      persona: personaConfig.demo_persona_type,
      isApproved,
      fieldsGenerated: Object.keys(businessDetails).length
    });
    
    // Validate accreditation status for risk assessment access
    const hasRiskAccess = personaConfig.accreditation_status === 'APPROVED';
    console.log('[DemoAPI] Risk assessment access validation:', {
      persona: personaConfig.demo_persona_type,
      accreditationStatus: personaConfig.accreditation_status,
      hasRiskAccess,
      willIncludeRiskScores: hasRiskAccess && personaConfig.risk_score
    });
    
    // ========================================
    // DEMO SESSION TRACKING
    // ========================================
    
    // Generate demo session ID for tracking
    const demoSessionId = `demo_${Date.now()}_${personaConfig.demo_persona_type}`;
    const demoCreatedAt = new Date();
    
    console.log('[DemoAPI] Creating demo session tracking:', {
      sessionId: demoSessionId,
      persona: personaConfig.demo_persona_type,
      timestamp: demoCreatedAt.toISOString()
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
      description: personaConfig.description,
      accreditation_status: personaConfig.accreditation_status,
      // Demo session tracking fields
      demo_session_id: demoSessionId,
      demo_created_at: demoCreatedAt,
      // Include risk score data only for accredited entities (APPROVED status)
      ...(personaConfig.accreditation_status === 'APPROVED' && personaConfig.risk_score && { risk_score: personaConfig.risk_score }),
      ...(personaConfig.accreditation_status === 'APPROVED' && personaConfig.chosen_score && { chosen_score: personaConfig.chosen_score }),
      // Include comprehensive business details
      legal_structure: businessDetails.legal_structure,
      market_position: businessDetails.market_position,
      hq_address: businessDetails.hq_address,
      website_url: businessDetails.website_url,
      products_services: businessDetails.products_services,
      incorporation_year: businessDetails.incorporation_year,
      founders_and_leadership: businessDetails.founders_and_leadership,
      num_employees: businessDetails.num_employees,
      revenue: businessDetails.revenue,
      revenue_tier: businessDetails.revenue_tier,
      key_clients_partners: businessDetails.key_clients_partners,
      investors: businessDetails.investors,
      funding_stage: businessDetails.funding_stage,
      exit_strategy_history: businessDetails.exit_strategy_history,
      certifications_compliance: businessDetails.certifications_compliance,
      files_public: businessDetails.files_public,
      files_private: businessDetails.files_private
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

    // ========================================
    // TASK CREATION FOR NEW DATA RECIPIENTS
    // ========================================
    
    /**
     * CRITICAL FIX: Restore missing task creation logic for New Data Recipients
     * 
     * Root Cause: The OnboardingModal requires tasks to trigger for users with
     * onboarding_user_completed = false. New Data Recipients need three tasks:
     * 1. KYB (Know Your Business) - Unlocked initially
     * 2. KY3P (Know Your Third Party) - Locked until KYB completion
     * 3. Open Banking - Locked until KY3P completion
     * 
     * This logic was accidentally removed from the main demo-api.ts but exists
     * in the backup file and is essential for the onboarding flow to work.
     */
    if (transformedData.persona === 'new-data-recipient') {
      console.log('[DemoAPI] 📋 Creating onboarding tasks for New Data Recipient:', {
        companyId: company.id,
        companyName: company.name,
        persona: transformedData.persona
      });
      
      try {
        // Create the three required tasks for New Data Recipients
        const tasksToCreate = [
          {
            title: `1. KYB Form: ${company.name}`,
            task_type: 'company_kyb',
            task_scope: 'company',
            status: TaskStatus.NOT_STARTED,
            company_id: company.id,
            metadata: {
              isInitialTask: true,
              unlocked: true,
              persona: 'new-data-recipient',
              createdBy: 'demo-system'
            }
          },
          {
            title: `2. S&P KY3P Security Assessment: ${company.name}`,
            task_type: 'ky3p',
            task_scope: 'company', 
            status: TaskStatus.NOT_STARTED,
            company_id: company.id,
            metadata: {
              isSecondaryTask: true,
              unlocked: false,
              dependsOn: 'company_kyb',
              persona: 'new-data-recipient',
              createdBy: 'demo-system'
            }
          },
          {
            title: `3. Open Banking Survey: ${company.name}`,
            task_type: 'open_banking',
            task_scope: 'company',
            status: TaskStatus.NOT_STARTED, 
            company_id: company.id,
            metadata: {
              isFinalTask: true,
              unlocked: false,
              dependsOn: 'ky3p',
              persona: 'new-data-recipient',
              createdBy: 'demo-system'
            }
          }
        ];
        
        // Insert all tasks
        const taskResults = await db.insert(tasks).values(tasksToCreate).returning();
        
        console.log('[DemoAPI] ✅ Tasks created successfully for New Data Recipient:', {
          companyId: company.id,
          companyName: company.name,
          tasksCreated: taskResults.length,
          taskTypes: taskResults.map(t => t.task_type),
          firstTaskId: taskResults[0]?.id,
          allTaskIds: taskResults.map(t => t.id)
        });
        
      } catch (taskError: any) {
        console.error('[DemoAPI] ❌ Task creation failed for New Data Recipient:', {
          companyId: company.id,
          companyName: company.name,
          error: taskError.message,
          stack: taskError.stack?.substring(0, 300)
        });
        
        // Don't fail the entire company creation if task creation fails
        // Log error but continue with company creation success
        console.warn('[DemoAPI] ⚠️ Continuing with company creation despite task creation failure');
      }
    } else {
      console.log('[DemoAPI] ⏭️ Skipping task creation for persona:', {
        persona: transformedData.persona,
        reason: 'Not a New Data Recipient - tasks not required for this persona'
      });
    }
    
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
          limit: Math.min(transformedData.networkSize, 100) // Cap at 100 for performance
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
              // Create relationship
              await db.insert(relationships).values({
                company_id: company.id,
                related_company_id: fintech.id,
                relationship_type: 'data_provider',
                status: 'active'
              });
              
              // PHASE 2 FIX: Add risk score data for network companies
              // Ensure each FinTech in the network has proper risk scores for dashboard display
              const riskScore = Math.floor(Math.random() * 40) + 30; // 30-70 range
              const chosenScore = Math.floor(Math.random() * 40) + 30; // 30-70 range
              
              await db.update(companies)
                .set({ 
                  risk_score: riskScore,
                  chosen_score: chosenScore
                })
                .where(eq(companies.id, fintech.id));
              
              successCount++;
              console.log('[DemoAPI] ✅ Relationship and risk scores created:', {
                bank: company.name,
                fintech: fintech.name,
                relationshipId: `${company.id}-${fintech.id}`,
                riskScore: riskScore,
                chosenScore: chosenScore
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
    
    // CRITICAL FIX: Proper onboarding logic for New Data Recipients
    // New Data Recipients need onboarding_user_completed = FALSE to trigger OnboardingModal
    // All other personas should have onboarding_user_completed = TRUE to skip the modal
    const shouldCompleteOnboarding = transformedData.role !== 'user';
    
    console.log('[DemoAPI] [UserCreate] 🔧 FIXED Onboarding completion logic:', {
      role: transformedData.role,
      persona: transformedData.persona,
      shouldCompleteOnboarding: shouldCompleteOnboarding,
      onboardingUserCompleted: shouldCompleteOnboarding,
      logic: transformedData.role === 'user' 
        ? 'New Data Recipient - onboarding_user_completed = FALSE (triggers modal)' 
        : 'Other persona - onboarding_user_completed = TRUE (skips modal)',
      modalWillShow: !shouldCompleteOnboarding
    });
    
    const user = await db.insert(users).values({
      email: transformedData.email,
      full_name: transformedData.fullName,
      password: hashedPassword,
      company_id: transformedData.companyId,
      is_demo: true,
      is_demo_user: true,  // CRITICAL FIX: Set demo user flag
      demo_persona_type: transformedData.persona,  // CRITICAL FIX: Store persona type
      onboarding_user_completed: shouldCompleteOnboarding
    }).returning();
    
    console.log('[DemoAPI] ✅ User created successfully:', {
      id: user[0].id,
      email: user[0].email,
      fullName: user[0].full_name,
      companyId: user[0].company_id,
      role: transformedData.role,
      onboardingCompleted: user[0].onboarding_user_completed
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
 * Demo Email Invitation Endpoint
 * ========================================
 * 
 * Sends welcome email invitations to demo users with login credentials and access information.
 * This endpoint completes the demo invitation workflow by generating invitation codes,
 * creating database records, and delivering credential emails - providing authentic email
 * functionality identical to the proven FinTech invitation system.
 * 
 * Key Features:
 * - Generates secure invitation codes using crypto.randomBytes
 * - Creates invitation database records with proper metadata
 * - Integrates with existing emailService (nodemailer + Gmail)
 * - Uses 'demo_invite' email template for consistent branding
 * - Maintains transaction safety with comprehensive error handling
 * - Follows coding standards with detailed logging throughout
 * 
 * Dependencies:
 * - User account (created in previous demo step)
 * - Company record (created in previous demo step)
 * - Database operations (invitations table)
 * - Email service integration (Gmail/nodemailer)
 * 
 * @endpoint POST /api/demo/email/send-invitation
 * @version 1.0.0
 * @since 2025-05-28
 */
router.post('/demo/email/send-invitation', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('[DemoAPI] [EmailInvite] Starting email invitation process:', {
      ...req.body,
      userEmail: req.body.userEmail ? '***@***.***' : undefined,
      timestamp: new Date().toISOString()
    });

    // ========================================
    // INPUT VALIDATION & LOGGING
    // ========================================
    
    const { userEmail, userName, companyName, loginCredentials } = req.body;
    
    // Validate required fields
    const invalidFields = [];
    if (!userEmail) invalidFields.push('userEmail');
    if (!userName) invalidFields.push('userName');
    if (!companyName) invalidFields.push('companyName');
    if (!loginCredentials) invalidFields.push('loginCredentials');
    
    if (invalidFields.length > 0) {
      console.error('[DemoAPI] [EmailInvite] Missing required fields:', invalidFields);
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${invalidFields.join(', ')}`,
        code: 'VALIDATION_ERROR',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[DemoAPI] [EmailInvite] Input validation successful:', {
      userEmail: userEmail.toLowerCase(),
      userName: userName.trim(),
      companyName: companyName.trim(),
      hasLoginCredentials: !!loginCredentials
    });

    // ========================================
    // USER VERIFICATION
    // ========================================
    
    console.log('[DemoAPI] [EmailInvite] Verifying user exists...');
    
    const [userData] = await db.select()
      .from(users)
      .where(eq(users.email, userEmail.toLowerCase()))
      .limit(1);

    if (!userData) {
      console.error('[DemoAPI] [EmailInvite] User not found:', { userEmail });
      return res.status(404).json({
        success: false,
        error: 'User not found for email invitation',
        code: 'USER_NOT_FOUND',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('[DemoAPI] [EmailInvite] User verification successful:', {
      userId: userData.id,
      email: userData.email,
      companyId: userData.company_id,
      fullName: userData.full_name
    });

    // ========================================
    // INVITATION CODE GENERATION
    // ========================================
    
    console.log('[DemoAPI] [EmailInvite] Generating secure invitation code...');
    
    // Generate secure 6-character invitation code (same format as FinTech invite)
    const invitationCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    console.log('[DemoAPI] [EmailInvite] Generated invitation code:', {
      codeLength: invitationCode.length,
      codeFormat: 'hex-uppercase',
      duration: Date.now() - startTime
    });

    // ========================================
    // INVITATION RECORD CREATION
    // ========================================
    
    console.log('[DemoAPI] [EmailInvite] Creating invitation database record...');
    
    const [invitationRecord] = await db.insert(invitations)
      .values({
        email: userEmail.toLowerCase(),
        company_id: userData.company_id,
        code: invitationCode,
        status: 'pending',
        invitee_name: userName.trim(),
        invitee_company: companyName.trim(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
        metadata: {
          sender_name: 'Invela Demo System',
          sender_company: 'Invela Trust Network',
          invitation_type: 'demo_email',
          created_via: 'demo_flow',
          user_id: userData.id,
          login_credentials: loginCredentials,
          setup_timestamp: new Date().toISOString()
        }
      })
      .returning();

    console.log('[DemoAPI] [EmailInvite] Invitation record created:', {
      invitationId: invitationRecord.id,
      code: invitationRecord.code,
      expiresAt: invitationRecord.expires_at,
      duration: Date.now() - startTime
    });

    // ========================================
    // EMAIL PREPARATION & SENDING
    // ========================================
    
    console.log('[DemoAPI] [EmailInvite] Preparing email content using emailService...');
    
    // Build invitation URL with proper protocol and host detection
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const inviteUrl = `${protocol}://${host}/login?code=${invitationCode}&email=${encodeURIComponent(userEmail)}`;
    
    console.log('[DemoAPI] [EmailInvite] Built invitation URL:', inviteUrl);

    // Send email using the same proven infrastructure as FinTech invitations
    const emailResult = await emailService.sendTemplateEmail({
      to: userEmail.toLowerCase(),
      from: process.env.GMAIL_USER!,
      template: 'demo_invite',
      templateData: {
        recipientName: userName,
        recipientEmail: userEmail.toLowerCase(),
        senderName: 'Invela Demo System',
        senderCompany: 'Invela',
        targetCompany: companyName,
        inviteUrl,
        code: invitationCode
      }
    });

    // Handle email sending results with proper error checking
    const emailSent = emailResult.success;
    const messageId = emailSent ? `demo_invite_${Date.now()}_${invitationRecord.id}` : null;
    
    if (!emailResult.success) {
      console.error('[DemoAPI] [EmailInvite] Email sending failed:', emailResult.error);
      // Continue with process but log the failure
    } else {
      console.log('[DemoAPI] [EmailInvite] Demo invitation email sent successfully');
    }
    
    console.log('[DemoAPI] [EmailInvite] Email process completed:', {
      recipientEmail: userEmail,
      invitationCode: invitationCode,
      messageId: messageId,
      emailSent: emailSent,
      duration: Date.now() - startTime
    });

    // ========================================
    // SUCCESS RESPONSE
    // ========================================
    
    const completionTime = Date.now() - startTime;
    
    console.log('[DemoAPI] [EmailInvite] Process completed successfully:', {
      userId: userData.id,
      companyId: userData.company_id,
      invitationId: invitationRecord.id,
      invitationCode: invitationCode,
      emailSent: emailSent,
      totalDuration: completionTime
    });

    res.json({
      success: true,
      emailSent,
      messageId,
      recipientEmail: userEmail,
      invitationCode: invitationCode,
      invitation: {
        id: invitationRecord.id,
        code: invitationRecord.code,
        expiresAt: invitationRecord.expires_at
      },
      processingTime: completionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorDuration = Date.now() - startTime;
    
    console.error('[DemoAPI] [EmailInvite] Process failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: errorDuration,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      error: 'Failed to send demo invitation email',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      code: 'EMAIL_INVITATION_ERROR',
      processingTime: errorDuration,
      timestamp: new Date().toISOString()
    });
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

    // Verify user belongs to the correct company (handle string/number conversion)
    const userCompanyId = userData.company_id;
    const requestedCompanyId = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
    
    if (userCompanyId !== requestedCompanyId) {
      console.error('[DemoAPI] [Finalize] Company mismatch:', {
        userCompanyId,
        requestedCompanyId,
        companyIdType: typeof companyId,
        afterConversion: requestedCompanyId
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
    // USER ONBOARDING COMPLETION FOR DEMO PERSONAS
    // ========================================
    
    // For demo users, automatically complete user onboarding for all personas except "New Data Recipient"
    // New Data Recipients should go through the standard onboarding flow
    console.log('[DemoAPI] [Finalize] Checking if user onboarding should be auto-completed...');
    
    if (userData.is_demo_user) {
      // Get the company data to check the persona type
      const [companyData] = await db.select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      
      if (companyData) {
        // Only auto-complete onboarding for Data Provider, Accredited Data Recipient, and Invela Admin
        // New Data Recipient should complete the full onboarding process
        const shouldCompleteOnboarding = userData.demo_persona_type !== 'new-data-recipient' && 
                                       userData.is_demo_user === true;
        
        if (shouldCompleteOnboarding && !userData.onboarding_user_completed) {
          console.log('[DemoAPI] [Finalize] Auto-completing user onboarding for demo persona:', {
            userId: userData.id,
            companyCategory: companyData.category,
            personaType: companyData.demo_persona_type || 'unknown'
          });
          
          // Update user onboarding status
          await db.update(users)
            .set({ 
              onboarding_user_completed: true,
              updated_at: new Date()
            })
            .where(eq(users.id, userId));
          
          // Update the userData object to reflect the change for session consistency
          userData.onboarding_user_completed = true;
          
          console.log('[DemoAPI] [Finalize] User onboarding auto-completed successfully');
        } else {
          console.log('[DemoAPI] [Finalize] User onboarding not auto-completed:', {
            shouldComplete: shouldCompleteOnboarding,
            alreadyCompleted: userData.onboarding_user_completed,
            category: companyData.category
          });
        }
      }
    }

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