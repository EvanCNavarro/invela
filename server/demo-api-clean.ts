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
    
    console.log('[DemoAPI] Creating demo company:', { name, persona, networkSize });
    
    const company = await db.insert(companies).values({
      name,
      category: persona === 'Data Provider' ? 'Bank' : 'FinTech',
      is_demo: true,
      onboarding_completed: true
    }).returning();
    
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