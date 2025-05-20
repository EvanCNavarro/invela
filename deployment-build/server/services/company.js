"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCompany = createCompany;
exports.updateCompany = updateCompany;
const db_adapter_1 = require("../utils/db-adapter");
const types_1 = require("../types");
const websocket_1 = require("./websocket");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Creates a new company and handles all associated rules/tasks
 */
async function createCompany(data // We'll improve this type later
) {
    console.log('[Company Service] Creating new company:', data.name);
    const db = (0, db_adapter_1.getDb)();
    const { companies, tasks, relationships } = (0, db_adapter_1.getSchemas)();
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
            status: types_1.TaskStatus.PENDING,
            priority: 'high',
            progress: types_1.taskStatusToProgress[types_1.TaskStatus.PENDING],
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
                status_flow: [types_1.TaskStatus.PENDING]
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
        }
        else {
            console.log('[Company Service] Created relationship with Invela:', {
                relationshipId: invelaRelationship.id,
                newCompanyId: newCompany.id
            });
        }
        // Broadcast task update
        if (kybTask) {
            (0, websocket_1.broadcastTaskUpdate)({
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
async function updateCompany(companyId, data // We'll improve this type later
) {
    const db = (0, db_adapter_1.getDb)();
    const { companies } = (0, db_adapter_1.getSchemas)();
    const [updatedCompany] = await db.update(companies)
        .set({
        ...data,
        updated_at: new Date()
    })
        .where((0, drizzle_orm_1.eq)(companies.id, companyId))
        .returning();
    if (!updatedCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
    }
    return updatedCompany;
}
