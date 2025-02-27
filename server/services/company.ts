import { db } from "@db";
import { companies, tasks, relationships } from "@db/schema";
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

    // Get the creator's user ID for task assignment
    const createdById = data.metadata?.invited_by || null;

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
        assigned_to: createdById, // Assign to the creator
        created_by: createdById,
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

    // Create CARD compliance task
    const [cardTask] = await tx.insert(tasks)
      .values({
        title: `Company CARD: ${newCompany.name}`,
        description: `Provide Compliance and Risk Data (CARD) for ${newCompany.name}`,
        task_type: 'company_card',
        task_scope: 'company',
        status: TaskStatus.NOT_STARTED,
        priority: 'high',
        progress: 0,
        company_id: newCompany.id,
        assigned_to: createdById,
        created_by: createdById,
        due_date: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 14); // 14 days deadline
          return date;
        })(),
        metadata: {
          company_id: newCompany.id,
          company_name: newCompany.name,
          created_via: data.metadata?.created_via || 'company_creation',
          statusFlow: [TaskStatus.NOT_STARTED],
          progressHistory: [{
            value: 0,
            timestamp: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        }
      })
      .returning();

    // Create automatic relationship with Invela (company_id: 1)
    console.log('[Company Service] Creating relationship with Invela');
    const [invelaRelationship] = await tx.insert(relationships)
      .values({
        company_id: 1, // Invela's company ID
        related_company_id: newCompany.id,
        relationship_type: 'network_member',
        status: 'active',
        metadata: {
          auto_created: true,
          creation_date: new Date().toISOString(),
          created_via: 'automatic_network_member',
          company_name: newCompany.name
        }
      })
      .returning();

    // If company was created by another company, create relationship with creating company
    if (data.metadata?.created_by_company_id) {
      console.log('[Company Service] Creating relationship with creator company:', data.metadata.created_by_company_id);
      const [creatorRelationship] = await tx.insert(relationships)
        .values({
          company_id: data.metadata.created_by_company_id,
          related_company_id: newCompany.id,
          relationship_type: 'network_member',
          status: 'active',
          metadata: {
            auto_created: true,
            creation_date: new Date().toISOString(),
            created_via: 'company_creation',
            created_by_company: true,
            company_name: newCompany.name
          }
        })
        .returning();

      console.log('[Company Service] Created relationships:', {
        invelaRelationshipId: invelaRelationship.id,
        creatorRelationshipId: creatorRelationship.id,
        newCompanyId: newCompany.id
      });
    } else {
      console.log('[Company Service] Created relationship with Invela:', {
        relationshipId: invelaRelationship.id,
        newCompanyId: newCompany.id
      });
    }

    // Broadcast task updates
    if (kybTask) {
      broadcastTaskUpdate({
        id: kybTask.id,
        status: kybTask.status,
        progress: kybTask.progress,
        metadata: kybTask.metadata || undefined
      });
    }

    if (cardTask) {
      broadcastTaskUpdate({
        id: cardTask.id,
        status: cardTask.status,
        progress: cardTask.progress,
        metadata: cardTask.metadata || undefined
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

/**
 * Updates company onboarding status and available tabs after CARD completion
 */
export async function updateCompanyAfterCardCompletion(
  companyId: number
): Promise<typeof companies.$inferSelect> {
  console.log('[Company Service] Updating company after CARD completion:', {
    companyId,
    timestamp: new Date().toISOString()
  });

  try {
    // Get company's current available tabs
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));

    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    // Define new tabs to add based on company category
    let newTabs: string[] = ['dashboard', 'network', 'file-vault'];
    if (company.category === 'Invela') {
      newTabs.push('insights', 'builder', 'playground');
    } else if (company.category === 'Bank') {
      newTabs.push('insights', 'builder');
    }

    // Combine existing tabs with new ones, removing duplicates
    const currentTabs = company.available_tabs || ['task-center'];
    const updatedTabs = Array.from(new Set([...currentTabs, ...newTabs]));

    // Update company with new tabs and completed onboarding
    const [updatedCompany] = await db.update(companies)
      .set({
        onboarding_company_completed: true,
        available_tabs: updatedTabs,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();

    if (!updatedCompany) {
      throw new Error(`Failed to update company ${companyId} after CARD completion`);
    }

    console.log('[Company Service] Company updated after CARD completion:', {
      companyId: updatedCompany.id,
      availableTabs: updatedCompany.available_tabs,
      onboardingCompleted: updatedCompany.onboarding_company_completed,
      timestamp: new Date().toISOString()
    });

    return updatedCompany;
  } catch (error) {
    console.error('[Company Service] Error updating company after CARD completion:', {
      error,
      companyId,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}