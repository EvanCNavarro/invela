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

// Simple working demo endpoints
router.post('/demo/company/create', async (req, res) => {
  try {
    console.log('[DemoAPI] 🏢 Raw company creation request:', req.body);
    
    // Transform the company data using our utility
    const transformedData = transformCompanyData(req.body);
    
    const company = await db.insert(companies).values({
      name: transformedData.name,
      category: transformedData.category,
      is_demo: true,
      onboarding_completed: true
    }).returning();
    
    console.log('[DemoAPI] ✅ Company created successfully:', { 
      id: company[0].id, 
      name: company[0].name, 
      category: company[0].category,
      transformedPersona: transformedData.persona,
      shouldCreateNetwork: transformedData.shouldCreateNetwork
    });
    
    // Create network relationships for Data Provider banks
    if (transformedData.shouldCreateNetwork) {
      console.log('[DemoAPI] 🌐 Starting network creation for Data Provider:', {
        bankId: company[0].id,
        bankName: company[0].name,
        targetNetworkSize: transformedData.networkSize
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
                company_id: company[0].id,
                related_company_id: fintech.id,
                relationship_type: 'data_provider',
                status: 'active'
              });
              
              successCount++;
              console.log('[DemoAPI] ✅ Relationship created:', {
                bank: company[0].name,
                fintech: fintech.name,
                relationshipId: `${company[0].id}-${fintech.id}`
              });
            } catch (relError: any) {
              errorCount++;
              console.error('[DemoAPI] ❌ Relationship creation failed:', {
                bank: company[0].name,
                fintech: fintech.name,
                error: relError.message
              });
            }
          }
          
          console.log('[DemoAPI] 🎯 Network creation completed:', {
            bankName: company[0].name,
            targetSize: transformedData.networkSize,
            successfulRelationships: successCount,
            failedRelationships: errorCount,
            successRate: `${((successCount / transformedData.networkSize) * 100).toFixed(1)}%`
          });
        }
      } catch (networkError: any) {
        console.error('[DemoAPI] 💥 Network creation process failed:', {
          bankId: company[0].id,
          bankName: company[0].name,
          error: networkError.message,
          stack: networkError.stack
        });
      }
    }
    
    // Return consistent response format that frontend expects
    res.json({ 
      success: true, 
      company: company[0],
      id: company[0].id // Ensure ID is easily accessible for next step
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

export default router;