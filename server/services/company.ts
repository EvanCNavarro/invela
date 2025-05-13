import { db } from "@db";
import { companies, tasks, relationships } from "@db/schema";
import { TaskStatus, taskStatusToProgress } from "../types";
import { broadcastTaskUpdate } from "./websocket";
import { eq } from "drizzle-orm";

/**
 * Creates a new company and handles all associated rules/tasks
 * @param data Company data to create
 * @param existingTx Optional existing transaction to use (to avoid nested transactions)
 */
export async function createCompany(
  data: typeof companies.$inferInsert,
  existingTx?: any
): Promise<typeof companies.$inferSelect & { kyb_task_id: number, security_task_id: number, card_task_id: number }> {
  const startTime = Date.now();
  console.log('[Company Service] Creating new company:', data.name, {
    hasExistingTransaction: !!existingTx,
    timestamp: new Date().toISOString()
  });

  try {
    if (!existingTx) {
      // Only create a transaction if we're not already in one
      console.log('[Company Service] Creating new transaction for company creation');
      return await db.transaction(async (tx) => {
        return await createCompanyInternal(data, tx, startTime);
      });
    } else {
      // Use the existing transaction
      console.log('[Company Service] Using existing transaction for company creation');
      return await createCompanyInternal(data, existingTx, startTime);
    }
  } catch (error) {
    console.error('[Company Service] Transaction failed:', {
      error,
      companyName: data.name,
      hasExistingTransaction: !!existingTx,
      duration: Date.now() - startTime
    });
    throw error;
  }
}

/**
 * Internal helper function that implements company creation logic
 */
async function createCompanyInternal(
  data: typeof companies.$inferInsert,
  tx: any,
  startTime: number
): Promise<typeof companies.$inferSelect & { kyb_task_id: number, security_task_id: number, card_task_id: number }> {
  // Create the company if it doesn't exist
  let newCompany = data;
  
  if (!data.id) {
    console.log('[Company Service] Creating new company record in database');
    const [created] = await tx.insert(companies)
      .values({
        ...data,
        registry_date: new Date(),
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();
    newCompany = created;
    console.log('[Company Service] Created company record:', {
      id: newCompany.id,
      name: newCompany.name,
      duration: Date.now() - startTime
    });
  } else {
    console.log('[Company Service] Using existing company record:', {
      id: data.id,
      name: data.name
    });
  }

  if (!newCompany) {
    throw new Error("Failed to create company");
  }

  // Get the creator's user ID with proper validation
  const metadata = (data as any).metadata as Record<string, any> | undefined;
  const createdById = metadata?.created_by_id ?? metadata?.invited_by;

  if (!createdById || typeof createdById !== 'number') {
    console.error('[Company Service] Invalid creator ID:', {
      metadata,
      createdById,
      duration: Date.now() - startTime
    });
    throw new Error("Valid creator ID is required for task creation");
  }

  console.log('[Company Service] Creating tasks with creator ID:', createdById);

  try {
    // Create KYB onboarding task
    console.log('[Company Service] Creating KYB task for company:', newCompany.id);
    const [kybTask] = await tx.insert(tasks)
      .values({
        title: `1. KYB Form: ${newCompany.name}`,
        description: `Complete KYB verification for ${newCompany.name}`,
        task_type: 'company_kyb',
        task_scope: 'company',
        status: TaskStatus.NOT_STARTED,
        priority: 'high',
        progress: taskStatusToProgress[TaskStatus.NOT_STARTED],
        company_id: newCompany.id,
        assigned_to: null, // Company tasks should not be assigned to specific users
        created_by: createdById, // Explicitly set creator
        due_date: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 30); // 30 days deadline
          return date;
        })(),
        metadata: {
          company_id: newCompany.id,
          company_name: newCompany.name,
          created_via: metadata?.created_via || 'company_creation',
          status_flow: [TaskStatus.NOT_STARTED],
          created_by_id: createdById,
          created_at: new Date().toISOString(),
          prerequisite_for: ['security_assessment'] // This task is a prerequisite for security assessment
        }
      })
      .returning();

    console.log('[Company Service] Created KYB task:', {
      taskId: kybTask.id,
      companyId: newCompany.id,
      duration: Date.now() - startTime
    });

    // Create S&P KY3P Security Assessment task (locked until KYB is completed)
    console.log('[Company Service] Creating S&P KY3P Security Assessment task for company:', newCompany.id);
    const [securityTask] = await tx.insert(tasks)
      .values({
        title: `2. S&P KY3P Security Assessment: ${newCompany.name}`,
        description: `Complete S&P KY3P Security Assessment for ${newCompany.name}`,
        task_type: 'sp_ky3p_assessment', // Updated task type for KY3P assessment
        task_scope: 'company',
        status: TaskStatus.NOT_STARTED,
        priority: 'medium',
        progress: 0,
        company_id: newCompany.id,
        assigned_to: null, // Company tasks should not be assigned to specific users
        created_by: createdById, // Explicitly set creator
        due_date: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 30); // 30 days deadline (consistent with other tasks)
          return date;
        })(),
        metadata: {
          company_id: newCompany.id,
          company_name: newCompany.name,
          created_via: metadata?.created_via || 'company_creation',
          status_flow: [TaskStatus.NOT_STARTED],
          progressHistory: [{
            value: 0,
            timestamp: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          created_by_id: createdById,
          locked: true, // Task is initially locked
          prerequisite_task_id: kybTask.id, // KYB task is a prerequisite
          prerequisite_for: ['company_card'], // This task is a prerequisite for CARD
          prerequisite_task_type: 'company_kyb'
        }
      })
      .returning();

    console.log('[Company Service] Created S&P KY3P Security Assessment task:', {
      taskId: securityTask.id,
      companyId: newCompany.id,
      duration: Date.now() - startTime
    });

    // Create Open Banking Survey task (locked until Security Assessment is completed)
    console.log('[Company Service] Creating Open Banking Survey task for company:', newCompany.id);
    const [cardTask] = await tx.insert(tasks)
      .values({
        title: `3. Open Banking Survey: ${newCompany.name}`,
        description: `Complete Open Banking Survey for ${newCompany.name}`,
        task_type: 'open_banking',
        task_scope: 'company',
        status: TaskStatus.NOT_STARTED,
        priority: 'high',
        progress: 0,
        company_id: newCompany.id,
        assigned_to: null, // Company tasks should not be assigned to specific users
        created_by: createdById, // Explicitly set creator
        due_date: (() => {
          const date = new Date();
          date.setDate(date.getDate() + 30); // 30 days deadline
          return date;
        })(),
        metadata: {
          company_id: newCompany.id,
          company_name: newCompany.name,
          created_via: metadata?.created_via || 'company_creation',
          statusFlow: [TaskStatus.NOT_STARTED],
          progressHistory: [{
            value: 0,
            timestamp: new Date().toISOString()
          }],
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          created_by_id: createdById,
          locked: true, // Task is initially locked
          prerequisite_task_id: securityTask.id, // S&P KY3P Security Assessment task is a prerequisite
          prerequisite_task_type: 'sp_ky3p_assessment'
        }
      })
      .returning();

    console.log('[Company Service] Created Open Banking Survey task:', {
      taskId: cardTask.id,
      companyId: newCompany.id,
      duration: Date.now() - startTime
    });

    // Create automatic relationship with Invela (company_id: 1)
    console.log('[Company Service] Creating relationship with Invela for company:', newCompany.id);
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
          company_name: newCompany.name,
          created_by_id: createdById // Add creator ID to relationship metadata
        }
      })
      .returning();

    // If company was created by another company, create relationship with creating company
    if (metadata?.created_by_company_id) {
      console.log('[Company Service] Creating relationship with creator company:', metadata.created_by_company_id);
      const [creatorRelationship] = await tx.insert(relationships)
        .values({
          company_id: metadata.created_by_company_id,
          related_company_id: newCompany.id,
          relationship_type: 'network_member',
          status: 'active',
          metadata: {
            auto_created: true,
            creation_date: new Date().toISOString(),
            created_via: metadata.created_via || 'company_creation',
            created_by_company: true,
            company_name: newCompany.name,
            created_by_id: createdById
          }
        })
        .returning();

      console.log('[Company Service] Created relationships:', {
        invelaRelationshipId: invelaRelationship.id,
        creatorRelationshipId: creatorRelationship.id,
        newCompanyId: newCompany.id,
        duration: Date.now() - startTime
      });
    } else {
      console.log('[Company Service] Created relationship with Invela:', {
        relationshipId: invelaRelationship.id,
        newCompanyId: newCompany.id,
        duration: Date.now() - startTime
      });
    }

    // Broadcast task updates
    broadcastTaskUpdate({
      id: kybTask.id,
      status: kybTask.status,
      progress: kybTask.progress,
      metadata: kybTask.metadata
    });
    
    broadcastTaskUpdate({
      id: securityTask.id,
      status: securityTask.status,
      progress: securityTask.progress,
      metadata: securityTask.metadata
    });

    broadcastTaskUpdate({
      id: cardTask.id,
      status: cardTask.status,
      progress: cardTask.progress,
      metadata: cardTask.metadata
    });

    // Return with additional task IDs for reference in calling code
    return {
      ...newCompany,
      kyb_task_id: kybTask.id,
      security_task_id: securityTask.id,
      card_task_id: cardTask.id
    } as typeof companies.$inferSelect & { kyb_task_id: number, security_task_id: number, card_task_id: number };

  } catch (taskError) {
    console.error('[Company Service] Failed to create tasks:', {
      error: taskError,
      companyId: newCompany.id,
      duration: Date.now() - startTime
    });
    throw taskError;
  }
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

    // Define basic tabs that all companies get
    let newTabs: string[] = ['dashboard', 'insights', 'file-vault'];

    // Add additional tabs based on company category
    if (company.category === 'Invela') {
      newTabs.push('builder', 'playground', 'network');
    } else if (company.category === 'Bank') {
      newTabs.push('builder', 'network');
    }
    // FinTech companies only get the basic tabs

    // Combine existing tabs with new ones, removing duplicates
    // For FinTech companies, ensure network, builder, and playground are never included
    const currentTabs = company.available_tabs || ['task-center'];
    let updatedTabs = Array.from(new Set([...currentTabs, ...newTabs]));

    // If company is FinTech, remove restricted tabs
    if (company.category === 'FinTech') {
      updatedTabs = updatedTabs.filter(tab =>
        !['network', 'builder', 'playground'].includes(tab)
      );
    }

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