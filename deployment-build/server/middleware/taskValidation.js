"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTaskStatusTransition = validateTaskStatusTransition;
exports.loadTaskMiddleware = loadTaskMiddleware;
const schema_1 = require("@db/schema");
const _db_1 = require("@db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_2 = require("@db/schema");
// Define task type specific status transitions with progress thresholds
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
        },
        [schema_1.TaskStatus.COMPLETED]: {
            next: [schema_1.TaskStatus.NOT_STARTED], // Allow reset
            progress: { min: 0, max: 100 }
        }
    }
};
// Helper function to validate progress against status
function validateProgressForStatus(taskType, status, progress) {
    const statusConfig = TASK_TYPE_TRANSITIONS[taskType]?.[status];
    if (!statusConfig) {
        return {
            isValid: false,
            message: `Invalid status ${status} for task type ${taskType}`
        };
    }
    const { min, max } = statusConfig.progress;
    if (progress < min || progress > max) {
        return {
            isValid: false,
            message: `Invalid progress value for status ${status}. Expected between ${min} and ${max}, got ${progress}`,
            details: {
                currentStatus: status,
                newStatus: status,
                currentProgress: progress,
                newProgress: progress,
                progressThreshold: { min, max }
            }
        };
    }
    return { isValid: true };
}
// Enhanced middleware to validate task status transitions
function validateTaskStatusTransition(req, res, next) {
    const { status: newStatus, progress } = req.body;
    const currentTask = req.task;
    console.log('[TaskValidation] Validating status transition:', {
        taskId: req.taskId,
        currentTask: currentTask ? {
            id: currentTask.id,
            type: currentTask.task_type,
            status: currentTask.status,
            progress: currentTask.progress
        } : null,
        requestedStatus: newStatus,
        requestedProgress: progress
    });
    if (!currentTask) {
        console.error('[TaskValidation] No current task found in request');
        return res.status(400).json({ message: "Task not found" });
    }
    const taskType = currentTask.task_type;
    const currentStatus = currentTask.status;
    // Validate task type configuration exists
    if (!TASK_TYPE_TRANSITIONS[taskType]) {
        console.error('[TaskValidation] Invalid task type:', taskType);
        return res.status(400).json({
            message: `Invalid task type: ${taskType}`,
            allowedTypes: Object.keys(TASK_TYPE_TRANSITIONS)
        });
    }
    // Special case: Allow resetting KYB tasks back to NOT_STARTED
    if (taskType === 'company_kyb' && newStatus === schema_1.TaskStatus.NOT_STARTED) {
        console.log('[TaskValidation] Allowing reset to NOT_STARTED for KYB task');
        const progressValidation = validateProgressForStatus(taskType, newStatus, progress);
        if (!progressValidation.isValid) {
            return res.status(400).json({
                message: progressValidation.message,
                details: progressValidation.details
            });
        }
        next();
        return;
    }
    // Get allowed transitions and validate
    const currentStateConfig = TASK_TYPE_TRANSITIONS[taskType][currentStatus];
    const allowedTransitions = currentStateConfig?.next || [];
    console.log('[TaskValidation] Checking allowed transitions:', {
        currentStatus,
        newStatus,
        allowedTransitions
    });
    if (!allowedTransitions.includes(newStatus)) {
        return res.status(400).json({
            message: "Invalid status transition",
            current: currentStatus,
            attempted: newStatus,
            allowed: allowedTransitions
        });
    }
    // Validate progress matches the new status
    const progressValidation = validateProgressForStatus(taskType, newStatus, progress);
    if (!progressValidation.isValid) {
        return res.status(400).json({
            message: progressValidation.message,
            details: progressValidation.details
        });
    }
    console.log('[TaskValidation] Status transition validated successfully');
    next();
}
// Middleware to load task before validation
async function loadTaskMiddleware(req, res, next) {
    if (!req.params.id) {
        return next();
    }
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
    }
    try {
        console.log('[TaskValidation] Loading task:', taskId);
        const [task] = await _db_1.db
            .select()
            .from(schema_2.tasks)
            .where((0, drizzle_orm_1.eq)(schema_2.tasks.id, taskId));
        if (!task) {
            console.error('[TaskValidation] Task not found:', taskId);
            return res.status(404).json({ message: "Task not found" });
        }
        console.log('[TaskValidation] Loaded task:', {
            id: task.id,
            type: task.task_type,
            status: task.status,
            progress: task.progress
        });
        req.taskId = taskId;
        req.task = task;
        next();
    }
    catch (error) {
        console.error('[TaskValidation] Error loading task:', error);
        res.status(500).json({ message: "Error loading task" });
    }
}
