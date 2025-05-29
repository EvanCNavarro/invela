/**
 * Simple Demo Data Cleanup API
 * Paired preview and cleanup endpoints for demo data management
 */

import { Router } from 'express';
import { db } from '@db';
import { 
  companies, 
  users, 
  tasks, 
  relationships, 
  files,
  companyLogos
} from '@db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Simple admin check
async function isAdmin(userId: number): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    return user?.email?.includes('@invela.') || false;
  } catch {
    return false;
  }
}

/**
 * Preview demo data that would be deleted
 */
router.get('/demo-data/preview', requireAuth, async (req, res) => {
  try {
    if (!req.user || !(await isAdmin(req.user.id))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get demo companies
    const demoCompanies = await db.query.companies.findMany({
      where: eq(companies.is_demo, true)
    });

    const companyIds = demoCompanies.map(c => c.id);

    // Get related demo users
    const demoUsers = await db.query.users.findMany({
      where: eq(users.is_demo_user, true)
    });

    // Get related data
    let demoTasks: any[] = [];
    let demoFiles: any[] = [];
    let demoRelationships: any[] = [];

    if (companyIds.length > 0) {
      demoTasks = await db.query.tasks.findMany({
        where: inArray(tasks.company_id, companyIds)
      });

      demoFiles = await db.query.files.findMany({
        where: inArray(files.company_id, companyIds)
      });

      demoRelationships = await db.query.relationships.findMany({
        where: inArray(relationships.company_id, companyIds)
      });
    }

    const summary = {
      companies: demoCompanies.length,
      users: demoUsers.length,
      tasks: demoTasks.length,
      files: demoFiles.length,
      relationships: demoRelationships.length,
      total: demoCompanies.length + demoUsers.length + demoTasks.length + demoFiles.length + demoRelationships.length
    };

    console.log('[Demo Cleanup Preview] Found demo data:', summary);

    res.json({
      summary,
      details: {
        companies: demoCompanies.map(c => ({ id: c.id, name: c.name })),
        users: demoUsers.map(u => ({ id: u.id, email: u.email })),
        tasks: demoTasks.map(t => ({ id: t.id, title: t.title })),
        files: demoFiles.map(f => ({ id: f.id, name: f.name })),
        relationships: demoRelationships.map(r => ({ id: r.id, type: r.relationship_type }))
      },
      confirmationToken: 'demo_cleanup_' + Date.now(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Demo Cleanup Preview] Error:', error);
    res.status(500).json({ error: 'Failed to preview demo data' });
  }
});

/**
 * Execute demo data cleanup
 */
router.delete('/demo-data/cleanup', requireAuth, async (req, res) => {
  try {
    if (!req.user || !(await isAdmin(req.user.id))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { confirmationToken } = req.body;
    if (!confirmationToken || !confirmationToken.startsWith('demo_cleanup_')) {
      return res.status(400).json({ error: 'Valid confirmation token required' });
    }

    console.log('[Demo Cleanup] Starting cleanup operation by user:', req.user.id);

    // Get demo companies
    const demoCompanies = await db.query.companies.findMany({
      where: eq(companies.is_demo, true)
    });

    const companyIds = demoCompanies.map(c => c.id);
    let deletedCounts = {
      companies: 0,
      users: 0,
      tasks: 0,
      files: 0,
      relationships: 0
    };

    if (companyIds.length > 0) {
      // Delete in proper order to avoid foreign key constraints
      
      // 1. Delete tasks
      const taskResult = await db.delete(tasks).where(inArray(tasks.company_id, companyIds));
      deletedCounts.tasks = taskResult.rowCount || 0;
      console.log('[Demo Cleanup] Deleted tasks:', deletedCounts.tasks);

      // 2. Delete files
      const fileResult = await db.delete(files).where(inArray(files.company_id, companyIds));
      deletedCounts.files = fileResult.rowCount || 0;
      console.log('[Demo Cleanup] Deleted files:', deletedCounts.files);

      // 3. Delete relationships
      const relResult = await db.delete(relationships).where(inArray(relationships.company_id, companyIds));
      deletedCounts.relationships = relResult.rowCount || 0;
      console.log('[Demo Cleanup] Deleted relationships:', deletedCounts.relationships);

      // 4. Delete demo users
      const userResult = await db.delete(users).where(eq(users.is_demo_user, true));
      deletedCounts.users = userResult.rowCount || 0;
      console.log('[Demo Cleanup] Deleted demo users:', deletedCounts.users);

      // 5. Delete companies last
      const companyResult = await db.delete(companies).where(eq(companies.is_demo, true));
      deletedCounts.companies = companyResult.rowCount || 0;
      console.log('[Demo Cleanup] Deleted demo companies:', deletedCounts.companies);
    }

    const total = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
    
    console.log('[Demo Cleanup] Cleanup completed. Total entities deleted:', total);

    res.json({
      success: true,
      summary: deletedCounts,
      totalDeleted: total,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Demo Cleanup] Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to cleanup demo data' });
  }
});

export default router;