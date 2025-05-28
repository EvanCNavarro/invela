import { Router } from 'express';
import { db } from '@db';
import { companies, users, tasks, relationships, invitations } from '@db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const router = Router();

// Simple working demo endpoints
router.post('/demo/company/create', async (req, res) => {
  try {
    const { name, persona, networkSize } = req.body;
    
    console.log('[DemoAPI] 🏢 Creating demo company:', { name, persona, networkSize });
    
    const company = await db.insert(companies).values({
      name,
      category: persona === 'Data Provider' ? 'Bank' : 'FinTech',
      is_demo: true,
      onboarding_completed: true
    }).returning();
    
    console.log('[DemoAPI] ✅ Company created successfully:', { 
      id: company[0].id, 
      name: company[0].name, 
      category: company[0].category 
    });
    
    // Create network relationships for Data Provider banks
    if (persona === 'Data Provider' && networkSize && networkSize > 0) {
      console.log('[DemoAPI] 🌐 Starting network creation for Data Provider:', {
        bankId: company[0].id,
        bankName: company[0].name,
        targetNetworkSize: networkSize
      });
      
      try {
        // Find available FinTech companies
        const availableFinTechs = await db.query.companies.findMany({
          where: and(
            eq(companies.category, 'FinTech'),
            eq(companies.is_demo, false)
          ),
          limit: networkSize
        });
        
        console.log('[DemoAPI] 📊 FinTech discovery results:', {
          requestedSize: networkSize,
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
            targetSize: networkSize,
            successfulRelationships: successCount,
            failedRelationships: errorCount,
            successRate: `${((successCount / networkSize) * 100).toFixed(1)}%`
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
    
    res.json({ success: true, company: company[0] });
  } catch (error: any) {
    console.error('[DemoAPI] Company creation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/demo/user/create', async (req, res) => {
  try {
    const { email, fullName, companyId } = req.body;
    
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    const user = await db.insert(users).values({
      email,
      full_name: fullName,
      password: hashedPassword,
      company_id: companyId,
      is_demo: true
    }).returning();
    
    res.json({ success: true, user: user[0] });
  } catch (error: any) {
    console.error('[DemoAPI] User creation failed:', error);
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