import { Request, Response } from "express";
import { db } from "@db";
import { tasks, users, type InsertTask } from "@db/schema";
import { eq, and } from "drizzle-orm";

export async function getTasks(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userTasks = await db.query.tasks.findMany({
      where: eq(tasks.companyId, req.user.companyId),
      with: {
        assignedToUser: true,
        createdByUser: true,
      },
    });

    res.json(userTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
}

export async function createTask(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { title, description, assignedTo, dueDate } = req.body;

    const [task] = await db.insert(tasks)
      .values({
        title,
        description,
        status: "pending",
        assignedTo,
        createdBy: req.user.id,
        companyId: req.user.companyId,
        dueDate: dueDate ? new Date(dueDate) : null,
      })
      .returning();

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
}

export async function updateTaskStatus(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { taskId } = req.params;
    const { status } = req.body;

    // Verify task belongs to user's company
    const [existingTask] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, parseInt(taskId)),
          eq(tasks.companyId, req.user.companyId)
        )
      );

    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    const [updatedTask] = await db.update(tasks)
      .set({ status, updatedAt: new Date() })
      .where(eq(tasks.id, parseInt(taskId)))
      .returning();

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
}

export async function getCompanyUsers(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const companyUsers = await db.select()
      .from(users)
      .where(eq(users.companyId, req.user.companyId));

    res.json(companyUsers);
  } catch (error) {
    console.error("Error fetching company users:", error);
    res.status(500).json({ message: "Failed to fetch company users" });
  }
}
