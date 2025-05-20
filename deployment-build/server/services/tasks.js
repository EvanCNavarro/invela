"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOnboardingTaskStatus = updateOnboardingTaskStatus;
exports.findAndUpdateOnboardingTask = findAndUpdateOnboardingTask;
const _db_1 = require("@db");
const schema_1 = require("@db/schema");
const drizzle_orm_1 = require("drizzle-orm");
// Validate if a status transition is allowed based on task type
function isValidStatusTransition(taskType, currentStatus, newStatus, progress) {
    const TASK_TYPE_TRANSITIONS = {
        user_onboarding: {
            [schema_1.TaskStatus.EMAIL_SENT]: {
                next: [schema_1.TaskStatus.COMPLETED],
                progress: { min: 25, max: 25 }
            },
            [schema_1.TaskStatus.COMPLETED]: {
                next: [], // Terminal state
                progress: { min: 100, max: 100 }
            }
        },
        company_kyb: {
            [schema_1.TaskStatus.NOT_STARTED]: {
                next: [schema_1.TaskStatus.IN_PROGRESS],
                progress: { min: 0, max: 0 }
            },
            [schema_1.TaskStatus.IN_PROGRESS]: {
                next: [schema_1.TaskStatus.READY_FOR_SUBMISSION],
                progress: { min: 1, max: 99 }
            },
            [schema_1.TaskStatus.READY_FOR_SUBMISSION]: {
                next: [schema_1.TaskStatus.SUBMITTED],
                progress: { min: 100, max: 100 }
            },
            [schema_1.TaskStatus.SUBMITTED]: {
                next: [schema_1.TaskStatus.APPROVED],
                progress: { min: 100, max: 100 }
            },
            [schema_1.TaskStatus.APPROVED]: {
                next: [], // Terminal state
                progress: { min: 100, max: 100 }
            }
        }
    };
    // Check if task type has defined transitions
    if (!TASK_TYPE_TRANSITIONS[taskType]) {
        console.error(`[Task Service] Invalid task type: ${taskType}`);
        return false;
    }
    // Check if transition is allowed
    const currentState = TASK_TYPE_TRANSITIONS[taskType][currentStatus];
    if (!currentState || !currentState.next.includes(newStatus)) {
        console.error(`[Task Service] Invalid transition from ${currentStatus} to ${newStatus}`);
        return false;
    }
    // Check if progress matches the new status
    const newState = TASK_TYPE_TRANSITIONS[taskType][newStatus];
    const { min, max } = newState.progress;
    if (progress < min || progress > max) {
        console.error(`[Task Service] Invalid progress ${progress} for status ${newStatus}`);
        return false;
    }
    return true;
}
async function updateOnboardingTaskStatus(userId) {
    try {
        console.log(`[Task Service] Attempting to update onboarding task for user ID: ${userId}`);
        // Get user email first to ensure we have it for searching
        const [user] = await _db_1.db
            .select()
            .from(schema_1.users)
            .where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
        if (!user) {
            console.error(`[Task Service] User ${userId} not found`);
            return null;
        }
        console.log(`[Task Service] Found user ${userId} with email ${user.email}`);
        // Search for task using email (case insensitive)
        const [taskToUpdate] = await _db_1.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.task_type, 'user_onboarding'), (0, drizzle_orm_1.sql) `LOWER(${schema_1.tasks.user_email}) = LOWER(${user.email})`, (0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.tasks.status, schema_1.TaskStatus.EMAIL_SENT), (0, drizzle_orm_1.eq)(schema_1.tasks.status, schema_1.TaskStatus.COMPLETED))))
            .orderBy((0, drizzle_orm_1.sql) `created_at DESC`)
            .limit(1);
        if (!taskToUpdate) {
            console.log(`[Task Service] No active onboarding task found for user ID: ${userId} with email ${user.email}`);
            return null;
        }
        console.log(`[Task Service] Found task ${taskToUpdate.id} with current status ${taskToUpdate.status}`);
        // Determine next status based on user's onboarding completion
        const nextStatus = user.onboarding_user_completed ? schema_1.TaskStatus.COMPLETED : taskToUpdate.status;
        const progress = nextStatus === schema_1.TaskStatus.COMPLETED ? 100 : 25;
        // Validate status transition
        if (!isValidStatusTransition('user_onboarding', taskToUpdate.status, nextStatus, progress)) {
            console.error(`[Task Service] Invalid status transition from ${taskToUpdate.status} to ${nextStatus}`);
            return null;
        }
        // Update the task with new status
        const [updatedTask] = await _db_1.db
            .update(schema_1.tasks)
            .set({
            status: nextStatus,
            progress,
            completion_date: nextStatus === schema_1.TaskStatus.COMPLETED ? new Date() : null,
            updated_at: new Date(),
            assigned_to: userId,
            metadata: {
                ...(taskToUpdate.metadata || {}),
                onboardingCompleted: nextStatus === schema_1.TaskStatus.COMPLETED,
                statusUpdateTime: new Date().toISOString(),
                previousStatus: taskToUpdate.status,
                userId: userId,
                userEmail: user.email.toLowerCase(),
                statusFlow: [...(taskToUpdate.metadata?.statusFlow || []), nextStatus]
            }
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskToUpdate.id))
            .returning();
        console.log(`[Task Service] Successfully updated task ${updatedTask.id} to ${nextStatus} status`);
        return updatedTask;
    }
    catch (error) {
        console.error('[Task Service] Error updating onboarding task status:', error);
        throw error;
    }
}
async function findAndUpdateOnboardingTask(email, userId) {
    try {
        console.log(`[Task Service] Finding and updating onboarding task for email: ${email}, userId: ${userId}`);
        // Find the most recent active onboarding task for this email
        const [taskToUpdate] = await _db_1.db
            .select()
            .from(schema_1.tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.tasks.task_type, 'user_onboarding'), (0, drizzle_orm_1.sql) `LOWER(${schema_1.tasks.user_email}) = LOWER(${email})`, (0, drizzle_orm_1.eq)(schema_1.tasks.status, schema_1.TaskStatus.EMAIL_SENT)))
            .orderBy((0, drizzle_orm_1.sql) `created_at DESC`)
            .limit(1);
        if (!taskToUpdate) {
            console.warn(`[Task Service] No email_sent onboarding task found for email: ${email}`);
            return null;
        }
        console.log(`[Task Service] Found task ${taskToUpdate.id} with status ${taskToUpdate.status}`);
        // Only allow transition from EMAIL_SENT to COMPLETED
        if (!isValidStatusTransition('user_onboarding', taskToUpdate.status, schema_1.TaskStatus.COMPLETED, 100)) {
            console.error(`[Task Service] Invalid status transition from ${taskToUpdate.status} to COMPLETED`);
            return null;
        }
        // Update the task with registration progress
        const [updatedTask] = await _db_1.db
            .update(schema_1.tasks)
            .set({
            status: schema_1.TaskStatus.COMPLETED,
            progress: 100,
            assigned_to: userId,
            updated_at: new Date(),
            metadata: {
                ...(taskToUpdate.metadata || {}),
                registrationCompleted: true,
                registrationTime: new Date().toISOString(),
                previousStatus: taskToUpdate.status,
                userId: userId,
                userEmail: email.toLowerCase(),
                statusFlow: [...(taskToUpdate.metadata?.statusFlow || []), schema_1.TaskStatus.COMPLETED]
            }
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskToUpdate.id))
            .returning();
        console.log(`[Task Service] Successfully updated task ${updatedTask.id} to completed status`);
        return updatedTask;
    }
    catch (error) {
        console.error('[Task Service] Error updating onboarding task:', error);
        throw error;
    }
}
