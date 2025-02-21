import { db } from "@db";
import { companies, tasks } from "@db/schema";
import { TaskStatus, taskStatusToProgress } from "../types";
import { broadcastTaskUpdate } from "./websocket";
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
        registry_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
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
        task_type: 'company_kyb',
        task_scope: 'company',
        status: TaskStatus.PENDING,
        priority: 'high',
        progress: taskStatusToProgress[TaskStatus.PENDING],
        company_id: newCompany.id,
        assigned_to: null, // Explicitly set to null so all company users can see it
        created_by: data.metadata?.invited_by || null,
        due_date: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 14); // 14 days deadline
          return date;
        })(),
        metadata: {
          company_id: newCompany.id,
          company_name: newCompany.name,
          created_via: data.metadata?.created_via || 'company_creation',
          status_flow: [TaskStatus.PENDING]
        }
      })
      .returning();

    // Broadcast task update
    if (kybTask) {
      broadcastTaskUpdate({
        id: kybTask.id,
        status: kybTask.status,
        progress: kybTask.progress,
        metadata: kybTask.metadata || undefined
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
      updated_at: new Date()
    })
    .where(eq(companies.id, companyId))
    .returning();

  if (!updatedCompany) {
    throw new Error(`Company with ID ${companyId} not found`);
  }

  return updatedCompany;
}