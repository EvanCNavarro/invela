import { db } from "@db";
import { companies, tasks } from "@db/schema";
import { TaskStatus, taskStatusToProgress } from "../types";
import { broadcastTaskUpdate } from "../services/websocket";
import { eq } from "drizzle-orm";

/**
 * Creates a new company and handles all associated rules/tasks
 */
export async function createCompany(
  data: typeof companies.$inferInsert
): Promise<typeof companies.$inferSelect> {
  console.log('[Company Service] Creating new company:', data.name);

  return await db.transaction(async (tx) => {
    // Create the company
    const [newCompany] = await tx.insert(companies)
      .values({
        ...data,
        registryDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    if (!newCompany) {
      throw new Error("Failed to create company");
    }

    // Create KYB onboarding task
    const [kybTask] = await tx.insert(tasks)
      .values({
        title: `Company KYB: ${newCompany.name}`,
        description: `Complete KYB verification for ${newCompany.name}`,
        taskType: 'company_kyb',
        taskScope: 'company',
        status: TaskStatus.PENDING,
        priority: 'high',
        progress: taskStatusToProgress[TaskStatus.PENDING],
        companyId: newCompany.id,
        createdBy: data.metadata?.invitedBy || null,
        assignedTo: null, // Null means visible to all company users
        dueDate: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 14); // 14 days deadline
          return date;
        })(),
        metadata: {
          companyId: newCompany.id,
          companyName: newCompany.name,
          createdVia: data.metadata?.createdVia || 'company_creation',
          statusFlow: [TaskStatus.PENDING]
        }
      })
      .returning();

    // Broadcast task update
    if (kybTask) {
      broadcastTaskUpdate({
        id: kybTask.id,
        status: kybTask.status as TaskStatus,
        progress: kybTask.progress,
        metadata: kybTask.metadata
      });
    }

    return newCompany;
  });
}

/**
 * Updates an existing company
 */
export async function updateCompany(
  companyId: number,
  data: Partial<typeof companies.$inferInsert>
): Promise<typeof companies.$inferSelect> {
  const [updatedCompany] = await db.update(companies)
    .set({
      ...data,
      updatedAt: new Date()
    })
    .where(eq(companies.id, companyId))
    .returning();

  if (!updatedCompany) {
    throw new Error(`Company with ID ${companyId} not found`);
  }

  return updatedCompany;
}