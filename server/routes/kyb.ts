import { Router } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { TaskStatus } from '../types';

const router = Router();

// Get KYB task by company name
router.get('/api/tasks/kyb/:companyName', async (req, res) => {
  try {
    const { companyName } = req.params;
    const formattedCompanyName = companyName.replace(/-/g, ' ');

    const [task] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'company_kyb'),
          ilike(tasks.title, `%${formattedCompanyName}%`)
        )
      );

    if (!task) {
      return res.status(404).json({ error: 'KYB task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching KYB task:', error);
    res.status(500).json({ error: 'Failed to fetch KYB task' });
  }
});

// Save KYB form data
router.post('/api/kyb/save', async (req, res) => {
  try {
    const { fileName, formData, taskId } = req.body;

    // Save form data to a file
    const filePath = join(process.cwd(), 'uploads', 'kyb', `${fileName}.json`);
    await writeFile(filePath, JSON.stringify(formData, null, 2), 'utf-8');

    // Update task status
    if (taskId) {
      await db.update(tasks)
        .set({
          status: TaskStatus.COMPLETED,
          progress: 100,
          updated_at: new Date(),
          metadata: {
            ...formData,
            kybFormFile: `${fileName}.json`
          }
        })
        .where(eq(tasks.id, taskId));
    }

    res.json({ success: true, filePath });
  } catch (error) {
    console.error('Error saving KYB form:', error);
    res.status(500).json({ error: 'Failed to save KYB form data' });
  }
});

export default router;