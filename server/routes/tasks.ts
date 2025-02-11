import { Router } from "express";
import { db } from "@db";
import { tasks, TaskStatus } from "@db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const updateTaskStatusSchema = z.object({
  status: z.enum([TaskStatus.EMAIL_SENT, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]),
});

router.patch("/api/tasks/:id/status", async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const validation = updateTaskStatusSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({ 
        message: "Invalid status value",
        errors: validation.error.errors 
      });
    }

    const { status } = validation.data;

    const [updatedTask] = await db
      .update(tasks)
      .set({ 
        status,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("[Task Routes] Error updating task status:", error);
    res.status(500).json({ message: "Failed to update task status" });
  }
});

export default router;