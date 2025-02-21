import { Router } from 'express';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { db } from '@db';
import { tasks } from '@db/schema';
import { eq } from 'drizzle-orm';
import { TaskStatus } from '../types';

const router = Router();

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