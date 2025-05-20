"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _db_1 = require("@db");
const schema_1 = require("@db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const zod_1 = require("zod");
const taskValidation_1 = require("../middleware/taskValidation");
const websocket_1 = require("../services/websocket");
const errors_1 = require("@shared/utils/errors");
const websocket_2 = require("../websocket");
const router = (0, express_1.Router)();
/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       required:
 *         - title
 *         - task_type
 *         - task_scope
 *         - company_id
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the task
 *         title:
 *           type: string
 *           description: The title of the task
 *         description:
 *           type: string
 *           description: Detailed description of the task
 *         task_type:
 *           type: string
 *           description: Type of the task
 *         task_scope:
 *           type: string
 *           description: Scope of the task
 *         status:
 *           type: string
 *           enum: [email_sent, completed, not_started, in_progress, ready_for_submission, submitted, approved]
 *           description: Current status of the task
 *         priority:
 *           type: string
 *           description: Priority level of the task
 *         progress:
 *           type: number
 *           description: Completion progress percentage (0-100)
 *         company_id:
 *           type: integer
 *           description: ID of the company this task belongs to
 *         metadata:
 *           type: object
 *           description: Additional task-specific metadata
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *
 *     TaskCreateInput:
 *       type: object
 *       required:
 *         - title
 *         - task_type
 *         - task_scope
 *         - company_id
 *       properties:
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         task_type:
 *           type: string
 *         task_scope:
 *           type: string
 *         priority:
 *           type: string
 *         company_id:
 *           type: integer
 *         metadata:
 *           type: object
 */
/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Task'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *                 count:
 *                   type: object
 *                   description: Updated task counts by status
 *       500:
 *         description: Server error
 */
router.post("/api/tasks", async (req, res, next) => {
    try {
        const [newTask] = await _db_1.db
            .insert(schema_1.tasks)
            .values({
            ...req.body,
            status: schema_1.TaskStatus.EMAIL_SENT,
            progress: 0,
            created_at: new Date(),
            updated_at: new Date(),
            metadata: {
                ...req.body.metadata,
                statusFlow: [schema_1.TaskStatus.EMAIL_SENT],
                progressHistory: [{
                        value: 0,
                        timestamp: new Date().toISOString()
                    }]
            }
        })
            .returning();
        // Get updated counts and broadcast task creation with progress
        const taskCount = await getTaskCount();
        // Broadcast task update using WebSockets
        (0, websocket_1.broadcastTaskUpdate)({
            id: newTask.id,
            status: newTask.status,
            progress: newTask.progress || 0,
            metadata: {
                action: 'created',
                timestamp: new Date().toISOString()
            }
        });
        res.status(201).json({
            task: {
                ...newTask,
                progress: newTask.progress || 0
            },
            count: taskCount
        });
    }
    catch (error) {
        console.error("[Task Routes] Error creating task:", error);
        next(new errors_1.AppError("Failed to create task", 500, "TASK_CREATION_ERROR"));
    }
});
/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The task ID
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: object
 *                   description: Updated task counts by status
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.delete("/api/tasks/:id", async (req, res, next) => {
    try {
        const taskId = parseInt(req.params.id);
        const [deletedTask] = await _db_1.db
            .delete(schema_1.tasks)
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskId))
            .returning();
        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" });
        }
        // Get updated counts and broadcast task deletion
        const taskCount = await getTaskCount();
        (0, websocket_2.broadcastMessage)('task_deleted', {
            taskId: deletedTask.id,
            count: taskCount,
            timestamp: new Date().toISOString()
        });
        res.json({ message: "Task deleted successfully", count: taskCount });
    }
    catch (error) {
        console.error("[Task Routes] Error deleting task:", error);
        res.status(500).json({ message: "Failed to delete task" });
    }
});
// Update task status and progress
router.patch("/api/tasks/:id/status", taskValidation_1.loadTaskMiddleware, taskValidation_1.validateTaskStatusTransition, async (req, res) => {
    try {
        const taskId = parseInt(req.params.id);
        const { status, progress } = updateTaskStatusSchema.parse(req.body);
        console.log('[Task Routes] Processing status update request:', {
            taskId,
            requestedStatus: status,
            requestedProgress: progress,
            currentTask: req.task
        });
        // Update task with new status and progress
        const [updatedTask] = await _db_1.db
            .update(schema_1.tasks)
            .set({
            status,
            progress,
            updated_at: new Date(),
            metadata: {
                ...req.task?.metadata,
                statusFlow: [...(req.task?.metadata?.statusFlow || []), status],
                progressHistory: [
                    ...(req.task?.metadata?.progressHistory || []),
                    {
                        value: progress,
                        timestamp: new Date().toISOString()
                    }
                ]
            }
        })
            .where((0, drizzle_orm_1.eq)(schema_1.tasks.id, taskId))
            .returning();
        console.log('[Task Routes] Task updated successfully:', {
            id: updatedTask.id,
            newStatus: updatedTask.status,
            newProgress: updatedTask.progress,
            metadata: updatedTask.metadata
        });
        // Get updated counts and broadcast task update with progress
        const taskCount = await getTaskCount();
        (0, websocket_2.broadcastMessage)('task_updated', {
            taskId: updatedTask.id,
            status: updatedTask.status,
            progress: updatedTask.progress || 0,
            metadata: updatedTask.metadata,
            count: taskCount,
            timestamp: new Date().toISOString()
        });
        res.json({
            task: {
                ...updatedTask,
                progress: updatedTask.progress || 0
            },
            count: taskCount
        });
    }
    catch (error) {
        console.error("[Task Routes] Error updating task status:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: "Invalid status value",
                errors: error.errors
            });
        }
        res.status(500).json({ message: "Failed to update task status" });
    }
});
const updateTaskStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        schema_1.TaskStatus.NOT_STARTED,
        schema_1.TaskStatus.IN_PROGRESS,
        schema_1.TaskStatus.READY_FOR_SUBMISSION,
        schema_1.TaskStatus.SUBMITTED,
        schema_1.TaskStatus.APPROVED,
        schema_1.TaskStatus.EMAIL_SENT,
        schema_1.TaskStatus.COMPLETED
    ]),
    progress: zod_1.z.number().min(0).max(100)
});
// Helper function to get task counts
async function getTaskCount() {
    const allTasks = await _db_1.db.select().from(schema_1.tasks);
    return {
        total: allTasks.length,
        emailSent: allTasks.filter(t => t.status === schema_1.TaskStatus.EMAIL_SENT).length,
        completed: allTasks.filter(t => t.status === schema_1.TaskStatus.COMPLETED).length,
        inProgress: allTasks.filter(t => t.status === schema_1.TaskStatus.IN_PROGRESS).length,
        readyForSubmission: allTasks.filter(t => t.status === schema_1.TaskStatus.READY_FOR_SUBMISSION).length,
        submitted: allTasks.filter(t => t.status === schema_1.TaskStatus.SUBMITTED).length,
        approved: allTasks.filter(t => t.status === schema_1.TaskStatus.APPROVED).length
    };
}
exports.default = router;
