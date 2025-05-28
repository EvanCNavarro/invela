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