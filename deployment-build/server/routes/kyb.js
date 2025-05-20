"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_adapter_1 = require("../utils/db-adapter");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// Debug utility for logging task data
const logTaskDebug = (stage, task, extras = {}) => {
    console.log(`[KYB API Debug] ${stage}:`, {
        taskId: task?.id,
        status: task?.status,
        progress: task?.progress,
        metadata: task?.metadata ? Object.keys(task.metadata) : null,
        ...extras,
        timestamp: new Date().toISOString()
    });
};
// Debug utility for logging response data
const logResponseDebug = (stage, responses, extras = {}) => {
    console.log(`[KYB API Debug] ${stage}:`, {
        responseCount: responses.length,
        fields: responses.map(r => ({
            field: r.field_key,
            status: r.status,
            hasValue: !!r.response_value
        })),
        ...extras,
        timestamp: new Date().toISOString()
    });
};
// Debug utility for logging file operations
const logFileDebug = (stage, data) => {
    console.log(`[KYB File Debug] ${stage}:`, {
        ...data,
        timestamp: new Date().toISOString()
    });
};
// Helper to get the TaskStatus enum from schema
function getTaskStatus() {
    const { TaskStatus } = (0, db_adapter_1.getSchemas)();
    return TaskStatus;
}
// Get KYB task by company name
router.get('/api/tasks/kyb/:companyName?', async (req, res) => {
    try {
        const { companyName } = req.params;
        console.log('[KYB API Debug] Task lookup request:', {
            companyName,
            timestamp: new Date().toISOString()
        });
        // If no company name provided, return all KYB tasks
        if (!companyName) {
            const kybTasks = await (0, db_adapter_1.getDb)().select()
                .from((0, db_adapter_1.getSchemas)().tasks)
                .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().tasks.task_type, 'company_kyb'));
            return res.json(kybTasks[0] || null);
        }
        // Format company name by removing the 'kyb-' prefix if present
        const formattedCompanyName = companyName
            .replace(/^kyb-/, '') // Remove 'kyb-' prefix if present
            .replace(/-/g, ' '); // Replace dashes with spaces
        console.log('[KYB API Debug] Searching for company:', {
            original: companyName,
            formatted: formattedCompanyName,
            timestamp: new Date().toISOString()
        });
        const [task] = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().tasks)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().tasks.task_type, 'company_kyb'), (0, drizzle_orm_1.ilike)((0, db_adapter_1.getSchemas)().tasks.title, `%${formattedCompanyName}%`)));
        if (!task) {
            console.log('[KYB API Debug] Task not found:', {
                companyName: formattedCompanyName,
                timestamp: new Date().toISOString()
            });
            return res.status(404).json({ error: 'KYB task not found' });
        }
        logTaskDebug('Found task', task);
        // Get all KYB responses for this task
        const responses = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().kybResponses)
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.task_id, task.id));
        logResponseDebug('Retrieved responses', responses, {
            taskId: task.id
        });
        // Transform responses into form data
        const formData = {};
        for (const response of responses) {
            if (response.response_value !== null) {
                formData[response.field_key] = response.response_value;
            }
        }
        // Transform the task data to include saved form data
        const transformedTask = {
            ...task,
            savedFormData: formData,
            progress: task.progress || 0
        };
        console.log('[KYB API Debug] Transformed task data:', {
            id: transformedTask.id,
            status: transformedTask.status,
            progress: transformedTask.progress,
            formDataFields: Object.keys(formData),
            metadataFields: Object.keys(transformedTask.metadata || {}),
            timestamp: new Date().toISOString()
        });
        res.json(transformedTask);
    }
    catch (error) {
        console.error('[KYB API Debug] Error fetching KYB task:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: 'Failed to fetch KYB task' });
    }
});
// Save progress for KYB form
router.post('/api/kyb/progress', async (req, res) => {
    try {
        const { taskId, progress, formData, fieldUpdates } = req.body;
        console.log('[KYB API Debug] Progress update initiated:', {
            taskId,
            requestedProgress: progress,
            formDataKeys: Object.keys(formData || {}),
            fieldUpdates: fieldUpdates ? Object.keys(fieldUpdates) : [],
            timestamp: new Date().toISOString()
        });
        if (!taskId) {
            console.warn('[KYB API Debug] Missing task ID in request');
            return res.status(400).json({
                error: 'Task ID is required',
                code: 'MISSING_TASK_ID'
            });
        }
        // Get existing task data
        const [existingTask] = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().tasks)
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().tasks.id, taskId));
        if (!existingTask) {
            console.log('[KYB API Debug] Task not found:', taskId);
            return res.status(404).json({
                error: 'Task not found',
                code: 'TASK_NOT_FOUND'
            });
        }
        // Get all KYB fields
        const fields = await (0, db_adapter_1.getDb)().select().from((0, db_adapter_1.getSchemas)().kybFields);
        const fieldMap = new Map(fields.map((f) => [f.field_key, f.id]));
        // Update KYB responses for each field
        const timestamp = new Date();
        const processedFields = new Set();
        for (const [fieldKey, value] of Object.entries(formData)) {
            const fieldId = fieldMap.get(fieldKey);
            if (!fieldId)
                continue;
            processedFields.add(fieldKey);
            const responseValue = value === '' ? null : String(value);
            const status = responseValue === null ? 'EMPTY' : 'COMPLETE';
            // Check if response exists
            const [existingResponse] = await (0, db_adapter_1.getDb)().select()
                .from((0, db_adapter_1.getSchemas)().kybResponses)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.task_id, taskId), (0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.field_id, fieldId)));
            if (existingResponse) {
                // Update existing response
                await (0, db_adapter_1.getDb)().update((0, db_adapter_1.getSchemas)().kybResponses)
                    .set({
                    response_value: responseValue,
                    status,
                    version: existingResponse.version + 1,
                    updated_at: timestamp
                })
                    .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.id, existingResponse.id));
                console.log('[KYB API Debug] Updated field response:', {
                    fieldKey,
                    oldValue: existingResponse.response_value,
                    newValue: responseValue,
                    oldStatus: existingResponse.status,
                    newStatus: status,
                    timestamp: timestamp.toISOString()
                });
            }
            else {
                // Create new response
                await (0, db_adapter_1.getDb)().insert((0, db_adapter_1.getSchemas)().kybResponses)
                    .values({
                    task_id: taskId,
                    field_id: fieldId,
                    response_value: responseValue,
                    status,
                    version: 1,
                    created_at: timestamp,
                    updated_at: timestamp
                });
                console.log('[KYB API Debug] Created new field response:', {
                    fieldKey,
                    value: responseValue,
                    status,
                    timestamp: timestamp.toISOString()
                });
            }
        }
        // Handle fields that were in the database but not in the current formData
        // These should be marked as EMPTY
        const existingResponses = await (0, db_adapter_1.getDb)().select({
            response_value: (0, db_adapter_1.getSchemas)().kybResponses.response_value,
            field_key: (0, db_adapter_1.getSchemas)().kybFields.field_key,
            field_id: (0, db_adapter_1.getSchemas)().kybFields.id,
            response_id: (0, db_adapter_1.getSchemas)().kybResponses.id
        })
            .from((0, db_adapter_1.getSchemas)().kybResponses)
            .innerJoin((0, db_adapter_1.getSchemas)().kybFields, (0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.field_id, (0, db_adapter_1.getSchemas)().kybFields.id))
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.task_id, taskId));
        for (const response of existingResponses) {
            if (!processedFields.has(response.field_key)) {
                await (0, db_adapter_1.getDb)().update((0, db_adapter_1.getSchemas)().kybResponses)
                    .set({
                    response_value: null,
                    status: 'EMPTY',
                    version: 1,
                    updated_at: timestamp
                })
                    .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.id, response.response_id));
                console.log('[KYB API Debug] Cleared missing field:', {
                    fieldKey: response.field_key,
                    oldValue: response.response_value,
                    timestamp: timestamp.toISOString()
                });
            }
        }
        // Determine appropriate status based on progress
        let newStatus = existingTask.status;
        if (progress === 0) {
            newStatus = getTaskStatus().NOT_STARTED;
        }
        else if (progress < 100) {
            newStatus = getTaskStatus().IN_PROGRESS;
        }
        else if (progress === 100) {
            newStatus = getTaskStatus().READY_FOR_SUBMISSION;
        }
        // Update task progress and metadata
        await (0, db_adapter_1.getDb)().update((0, db_adapter_1.getSchemas)().tasks)
            .set({
            progress: Math.min(progress, 100),
            status: newStatus,
            metadata: {
                ...existingTask.metadata,
                lastUpdated: timestamp.toISOString(),
                statusFlow: [...(existingTask.metadata?.statusFlow || []), newStatus]
                    .filter((v, i, a) => a.indexOf(v) === i)
            },
            updated_at: timestamp
        })
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().tasks.id, taskId));
        // Get updated responses
        const updatedResponses = await (0, db_adapter_1.getDb)().select({
            response_value: (0, db_adapter_1.getSchemas)().kybResponses.response_value,
            field_key: (0, db_adapter_1.getSchemas)().kybFields.field_key,
            status: (0, db_adapter_1.getSchemas)().kybResponses.status
        })
            .from((0, db_adapter_1.getSchemas)().kybResponses)
            .innerJoin((0, db_adapter_1.getSchemas)().kybFields, (0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.field_id, (0, db_adapter_1.getSchemas)().kybFields.id))
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.task_id, taskId));
        const updatedFormData = {};
        for (const response of updatedResponses) {
            if (response.response_value !== null) {
                updatedFormData[response.field_key] = response.response_value;
            }
        }
        res.json({
            success: true,
            savedData: {
                progress: Math.min(progress, 100),
                status: newStatus,
                formData: updatedFormData
            }
        });
    }
    catch (error) {
        console.error('[KYB API Debug] Error processing progress update:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({
            error: 'Failed to save progress',
            code: 'INTERNAL_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get saved progress for KYB form
router.get('/api/kyb/progress/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        console.log('[KYB API Debug] Loading progress for task:', taskId);
        // Get task data
        const [task] = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().tasks)
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().tasks.id, parseInt(taskId)));
        logTaskDebug('Retrieved task', task);
        if (!task) {
            console.log('[KYB API Debug] Task not found:', taskId);
            return res.status(404).json({ error: 'Task not found' });
        }
        // Get all KYB responses for this task with their field information
        const responses = await (0, db_adapter_1.getDb)().select({
            response_value: (0, db_adapter_1.getSchemas)().kybResponses.response_value,
            field_key: (0, db_adapter_1.getSchemas)().kybFields.field_key,
            status: (0, db_adapter_1.getSchemas)().kybResponses.status
        })
            .from((0, db_adapter_1.getSchemas)().kybResponses)
            .innerJoin((0, db_adapter_1.getSchemas)().kybFields, (0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.field_id, (0, db_adapter_1.getSchemas)().kybFields.id))
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.task_id, parseInt(taskId)));
        logResponseDebug('Retrieved responses', responses);
        // Transform responses into form data
        const formData = {};
        for (const response of responses) {
            if (response.response_value !== null) {
                formData[response.field_key] = response.response_value;
            }
        }
        console.log('[KYB API Debug] Retrieved task data:', {
            id: task.id,
            responseCount: responses.length,
            progress: task.progress,
            status: task.status,
            formDataKeys: Object.keys(formData),
            formData
        });
        // Return saved form data and progress
        res.json({
            formData,
            progress: Math.min(task.progress || 0, 100)
        });
    }
    catch (error) {
        console.error('[KYB API Debug] Error loading progress:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
        res.status(500).json({ error: 'Failed to load progress' });
    }
});
// Save KYB form data
router.post('/api/kyb/save', async (req, res) => {
    try {
        const { fileName, formData, taskId } = req.body;
        logFileDebug('Save request received', {
            fileName,
            taskId,
            formDataKeys: Object.keys(formData),
            formDataValues: Object.entries(formData).map(([k, v]) => ({
                key: k,
                hasValue: !!v,
                valueType: typeof v
            }))
        });
        // Get task details
        const [task] = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().tasks)
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().tasks.id, taskId));
        if (!task) {
            const error = 'Task not found';
            logFileDebug('Task lookup failed', { taskId, error });
            throw new Error(error);
        }
        logFileDebug('Task found', {
            taskId: task.id,
            title: task.title,
            currentStatus: task.status
        });
        // Get company record to update available tabs
        const [company] = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().companies)
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().companies.id, task.company_id));
        if (!company) {
            throw new Error('Company not found');
        }
        // Add file-vault to available tabs if not already present
        const currentTabs = company.available_tabs || ['task-center'];
        if (!currentTabs.includes('file-vault')) {
            const updatedTabs = [...currentTabs, 'file-vault'];
            // Update company's available tabs
            await (0, db_adapter_1.getDb)().update((0, db_adapter_1.getSchemas)().companies)
                .set({
                available_tabs: updatedTabs,
                updated_at: new Date()
            })
                .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().companies.id, task.company_id));
            logFileDebug('Updated company available tabs', {
                companyId: task.company_id,
                previousTabs: currentTabs,
                newTabs: updatedTabs
            });
        }
        // Get all KYB fields with their groups
        const fields = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().kybFields)
            .orderBy((0, db_adapter_1.getSchemas)().kybFields.order);
        logFileDebug('Fields retrieved', {
            fieldCount: fields.length,
            fieldGroups: [...new Set(fields.map((f) => f.group))],
            fieldTypes: [...new Set(fields.map((f) => f.field_type))]
        });
        // Create comprehensive submission data
        const submissionData = {
            metadata: {
                taskId,
                taskTitle: task.title,
                submissionDate: new Date().toISOString(),
                formVersion: '1.0',
                status: getTaskStatus().SUBMITTED
            },
            taskData: {
                ...task,
                progress: 100,
                status: getTaskStatus().SUBMITTED
            },
            formStructure: {
                fields: fields.map((field) => ({
                    key: field.field_key,
                    name: field.display_name,
                    type: field.field_type,
                    group: field.group,
                    required: field.required,
                    order: field.order
                }))
            },
            responses: {}
        };
        logFileDebug('Submission data prepared', {
            metadataKeys: Object.keys(submissionData.metadata),
            formStructureFields: submissionData.formStructure.fields.length
        });
        // Group responses by field group
        const groupedResponses = {};
        for (const field of fields) {
            const group = field.group || 'Uncategorized';
            if (!groupedResponses[group]) {
                groupedResponses[group] = {};
            }
            groupedResponses[group][field.field_key] = {
                question: field.display_name,
                answer: field.field_type === 'boolean'
                    ? formData[field.field_key] === 'true' || formData[field.field_key] === true
                    : formData[field.field_key] || null,
                type: field.field_type,
                answeredAt: new Date().toISOString()
            };
        }
        submissionData.responses = groupedResponses;
        logFileDebug('Responses grouped', {
            groupCount: Object.keys(groupedResponses).length,
            groups: Object.keys(groupedResponses),
            responseCount: Object.values(groupedResponses).reduce((acc, group) => acc + Object.keys(group).length, 0)
        });
        // Convert submission data to JSON string
        const jsonData = JSON.stringify(submissionData, null, 2);
        const fileSize = Buffer.from(jsonData).length;
        // Create file record in database
        const timestamp = new Date();
        const [fileRecord] = await (0, db_adapter_1.getDb)().insert((0, db_adapter_1.getSchemas)().files)
            .values({
            name: `${fileName}.json`,
            size: fileSize,
            type: 'application/json',
            path: jsonData, // Store JSON content directly in path field
            status: 'uploaded',
            user_id: task.created_by || 1, // Default to user ID 1 if no creator
            company_id: task.company_id,
            upload_time: timestamp,
            created_at: timestamp,
            updated_at: timestamp,
            version: 1.0
        })
            .returning();
        logFileDebug('File record created', {
            fileId: fileRecord.id,
            fileName: fileRecord.name,
            size: fileRecord.size,
            timestamp: timestamp.toISOString()
        });
        // Save responses to database
        const fieldMap = new Map(fields.map((f) => [f.field_key, f.id]));
        // Save responses to database
        for (const [fieldKey, value] of Object.entries(formData)) {
            const fieldId = fieldMap.get(fieldKey);
            if (!fieldId) {
                logFileDebug('Field not found', { fieldKey });
                continue;
            }
            const responseValue = value === '' ? null : String(value);
            const status = responseValue === null ? 'EMPTY' : 'COMPLETE';
            // Check if response exists
            const [existingResponse] = await (0, db_adapter_1.getDb)().select()
                .from((0, db_adapter_1.getSchemas)().kybResponses)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.task_id, taskId), (0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.field_id, fieldId)));
            if (existingResponse) {
                logFileDebug('Updating existing response', {
                    fieldKey,
                    responseId: existingResponse.id,
                    oldValue: existingResponse.response_value,
                    newValue: responseValue
                });
                await (0, db_adapter_1.getDb)().update((0, db_adapter_1.getSchemas)().kybResponses)
                    .set({
                    response_value: responseValue,
                    status,
                    version: existingResponse.version + 1,
                    updated_at: timestamp
                })
                    .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().kybResponses.id, existingResponse.id));
            }
            else {
                logFileDebug('Creating new response', {
                    fieldKey,
                    status,
                    value: responseValue
                });
                await (0, db_adapter_1.getDb)().insert((0, db_adapter_1.getSchemas)().kybResponses)
                    .values({
                    task_id: taskId,
                    field_id: fieldId,
                    response_value: responseValue,
                    status,
                    version: 1,
                    created_at: timestamp,
                    updated_at: timestamp
                });
            }
        }
        // Update task status
        logFileDebug('Updating task status', {
            taskId,
            newStatus: getTaskStatus().SUBMITTED,
            progress: 100
        });
        await (0, db_adapter_1.getDb)().update((0, db_adapter_1.getSchemas)().tasks)
            .set({
            status: getTaskStatus().SUBMITTED,
            progress: 100,
            updated_at: timestamp,
            metadata: {
                ...task.metadata,
                kybFormFile: fileRecord.id, // Store file ID instead of filename
                submissionDate: timestamp.toISOString(),
                formVersion: '1.0',
                statusFlow: [...(task.metadata?.statusFlow || []), getTaskStatus().SUBMITTED]
                    .filter((v, i, a) => a.indexOf(v) === i)
            }
        })
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().tasks.id, taskId));
        logFileDebug('Save completed', {
            fileId: fileRecord.id,
            taskId,
            status: getTaskStatus().SUBMITTED,
            timestamp: timestamp.toISOString()
        });
        res.json({
            success: true,
            fileId: fileRecord.id,
            metadata: submissionData.metadata
        });
    }
    catch (error) {
        const errorDetails = {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString()
        };
        logFileDebug('Error saving KYB form', errorDetails);
        console.error('[KYB API Debug] Error saving KYB form:', errorDetails);
        res.status(500).json({
            error: 'Failed to save KYB form data',
            details: errorDetails
        });
    }
});
// Add download endpoint after the existing routes
router.get('/api/kyb/download/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        const format = req.query.format || 'json';
        logFileDebug('Download request received', {
            fileId,
            format,
            timestamp: new Date().toISOString()
        });
        // Get file from database
        const [file] = await (0, db_adapter_1.getDb)().select()
            .from((0, db_adapter_1.getSchemas)().files)
            .where((0, drizzle_orm_1.eq)((0, db_adapter_1.getSchemas)().files.id, parseInt(fileId)));
        if (!file) {
            logFileDebug('File not found', { fileId });
            return res.status(404).json({ error: 'File not found' });
        }
        // Get all field questions
        const fields = await (0, db_adapter_1.getDb)().select({
            field_key: (0, db_adapter_1.getSchemas)().kybFields.field_key,
            display_name: (0, db_adapter_1.getSchemas)().kybFields.display_name,
            question: (0, db_adapter_1.getSchemas)().kybFields.question,
            group: (0, db_adapter_1.getSchemas)().kybFields.group,
            field_type: (0, db_adapter_1.getSchemas)().kybFields.field_type
        })
            .from((0, db_adapter_1.getSchemas)().kybFields)
            .orderBy((0, db_adapter_1.getSchemas)().kybFields.order);
        logFileDebug('Retrieved field information', {
            fieldCount: fields.length,
            sampleField: fields[0],
            allKeys: fields.map((f) => f.field_key)
        });
        const fieldQuestions = new Map(fields.map((f) => [f.field_key, {
                name: f.display_name,
                question: f.question,
                group: f.group,
                type: f.field_type
            }]));
        // Parse the stored JSON data
        const jsonData = JSON.parse(file.path);
        let downloadData;
        let contentType;
        let fileExtension;
        switch (format.toLowerCase()) {
            case 'json':
                downloadData = JSON.stringify(jsonData, null, 2);
                contentType = 'application/json';
                fileExtension = 'json';
                break;
            case 'csv':
                // Convert the responses object to CSV format
                const csvRows = [];
                // Add headers
                csvRows.push(['Group', 'Question', 'Answer', 'Type', 'Answered At']);
                // Add data rows for each response
                if (jsonData.responses && typeof jsonData.responses === 'object') {
                    // Get all responses regardless of group
                    const allResponses = Object.values(jsonData.responses)
                        .reduce((acc, group) => ({ ...acc, ...group }), {});
                    // Add a row for each field, maintaining order from the database
                    for (const field of fields) {
                        const response = allResponses[field.field_key];
                        if (response) {
                            csvRows.push([
                                field.group || 'Uncategorized',
                                field.question || field.display_name,
                                response,
                                field.field_type || field.field_type,
                                response ? new Date(response).toISOString() : new Date().toISOString()
                            ]);
                        }
                    }
                }
                // Convert to CSV string
                downloadData = csvRows.map(row => row.map(cell => typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell).join(',')).join('\n');
                contentType = 'text/csv';
                fileExtension = 'csv';
                break;
            case 'txt':
                // Convert to human-readable text format
                const textParts = [];
                textParts.push('KYB Form Submission\n' + '='.repeat(20) + '\n');
                textParts.push(`Task: ${jsonData.metadata?.taskTitle || 'Unknown'}`);
                textParts.push(`Submission Date: ${jsonData.metadata?.submissionDate || 'Unknown'}`);
                textParts.push(`Status: ${jsonData.metadata?.status || 'Unknown'}\n`);
                // Group fields by their category
                const groupedFields = new Map();
                for (const field of fields) {
                    const response = jsonData.responses?.Uncategorized?.[field.field_key];
                    if (response) {
                        if (!groupedFields.has(field.group)) {
                            groupedFields.set(field.group, []);
                        }
                        groupedFields.get(field.group)?.push({ field, response });
                    }
                }
                // Output by group
                for (const [group, items] of groupedFields) {
                    textParts.push(`\n${group}:\n` + '='.repeat(group.length) + '\n');
                    for (const { field, response } of items) {
                        textParts.push(`${field.question}\nAnswer: ${response || 'Not provided'}\n`);
                    }
                }
                downloadData = textParts.join('\n');
                contentType = 'text/plain';
                fileExtension = 'txt';
                break;
            default:
                return res.status(400).json({ error: 'Invalid format specified' });
        }
        // Set response headers for file download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename=kyb_form.${fileExtension}`);
        logFileDebug('Sending download', {
            fileId,
            format,
            contentType,
            size: downloadData.length
        });
        res.send(downloadData);
    }
    catch (error) {
        console.error('[KYB API Debug] Error processing download:', error);
        res.status(500).json({ error: 'Failed to process download' });
    }
});
exports.default = router;
