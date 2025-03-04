import { Router } from 'express';
import { join } from 'path';
import { db } from '@db';
import { tasks, TaskStatus, kybFields, kybResponses, files, companies } from '@db/schema';
import { eq, and, ilike, sql } from 'drizzle-orm';

// Add CSV conversion helper function at the top of the file
function convertResponsesToCSV(fields: any[], formData: any) {
  // CSV headers
  const headers = ['Group', 'Question', 'Answer', 'Type'];
  const rows = [headers];

  // Add data rows
  for (const field of fields) {
    rows.push([
      field.group || 'Uncategorized',
      field.display_name,
      formData[field.field_key] || '',
      field.field_type
    ]);
  }

  // Convert to CSV string
  return rows.map(row =>
    row.map(cell =>
      typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
    ).join(',')
  ).join('\n');
}

const router = Router();

// Debug utility for logging task data
const logTaskDebug = (stage: string, task: any, extras: Record<string, any> = {}) => {
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
const logResponseDebug = (stage: string, responses: any[], extras: Record<string, any> = {}) => {
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
const logFileDebug = (stage: string, data: Record<string, any>) => {
  console.log(`[KYB File Debug] ${stage}:`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

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
      const kybTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.task_type, 'company_kyb'));
      return res.json(kybTasks[0] || null);
    }

    // Format company name by removing the 'kyb-' prefix if present
    const formattedCompanyName = companyName
      .replace(/^kyb-/, '')  // Remove 'kyb-' prefix if present
      .replace(/-/g, ' ');   // Replace dashes with spaces

    console.log('[KYB API Debug] Searching for company:', {
      original: companyName,
      formatted: formattedCompanyName,
      timestamp: new Date().toISOString()
    });

    const [task] = await db.select()
      .from(tasks)
      .where(
        and(
          eq(tasks.task_type, 'company_kyb'),
          ilike(tasks.title, `%${formattedCompanyName}%`)
        )
      );

    if (!task) {
      console.log('[KYB API Debug] Task not found:', {
        companyName: formattedCompanyName,
        timestamp: new Date().toISOString()
      });
      return res.status(404).json({ error: 'KYB task not found' });
    }

    logTaskDebug('Found task', task);

    // Get all KYB responses for this task
    const responses = await db.select()
      .from(kybResponses)
      .where(eq(kybResponses.task_id, task.id));

    logResponseDebug('Retrieved responses', responses, {
      taskId: task.id
    });

    // Transform responses into form data
    const formData: Record<string, any> = {};
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
  } catch (error) {
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
    const [existingTask] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!existingTask) {
      console.log('[KYB API Debug] Task not found:', taskId);
      return res.status(404).json({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    // Get all KYB fields
    const fields = await db.select().from(kybFields);
    const fieldMap = new Map(fields.map(f => [f.field_key, f.id]));

    // Update KYB responses for each field
    const timestamp = new Date();
    const processedFields = new Set();

    for (const [fieldKey, value] of Object.entries(formData)) {
      const fieldId = fieldMap.get(fieldKey);
      if (!fieldId) continue;

      processedFields.add(fieldKey);
      const responseValue = value === '' ? null : String(value);
      const status = responseValue === null ? 'EMPTY' : 'COMPLETE';

      // Check if response exists
      const [existingResponse] = await db.select()
        .from(kybResponses)
        .where(
          and(
            eq(kybResponses.task_id, taskId),
            eq(kybResponses.field_id, fieldId)
          )
        );

      if (existingResponse) {
        // Update existing response
        await db.update(kybResponses)
          .set({
            response_value: responseValue,
            status,
            version: existingResponse.version + 1,
            updated_at: timestamp
          })
          .where(eq(kybResponses.id, existingResponse.id));

        console.log('[KYB API Debug] Updated field response:', {
          fieldKey,
          oldValue: existingResponse.response_value,
          newValue: responseValue,
          oldStatus: existingResponse.status,
          newStatus: status,
          timestamp: timestamp.toISOString()
        });
      } else {
        // Create new response
        await db.insert(kybResponses)
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
    const existingResponses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      field_id: kybFields.id,
      response_id: kybResponses.id
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId));

    for (const response of existingResponses) {
      if (!processedFields.has(response.field_key)) {
        await db.update(kybResponses)
          .set({
            response_value: null,
            status: 'EMPTY',
            version: 1,
            updated_at: timestamp
          })
          .where(eq(kybResponses.id, response.response_id));

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
      newStatus = TaskStatus.NOT_STARTED;
    } else if (progress < 100) {
      newStatus = TaskStatus.IN_PROGRESS;
    } else if (progress === 100) {
      newStatus = TaskStatus.READY_FOR_SUBMISSION;
    }

    // Update task progress and metadata
    await db.update(tasks)
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
      .where(eq(tasks.id, taskId));

    // Get updated responses
    const updatedResponses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, taskId));

    const updatedFormData: Record<string, any> = {};
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
  } catch (error) {
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
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

    logTaskDebug('Retrieved task', task);

    if (!task) {
      console.log('[KYB API Debug] Task not found:', taskId);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all KYB responses for this task with their field information
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, parseInt(taskId)));

    logResponseDebug('Retrieved responses', responses);

    // Transform responses into form data
    const formData: Record<string, any> = {};
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
  } catch (error) {
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
      formDataKeys: Object.keys(formData)
    });

    // Get task details
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

    if (!task) {
      throw new Error('Task not found');
    }

    // Get all KYB fields with their groups
    const fields = await db.select()
      .from(kybFields)
      .orderBy(kybFields.order);

    // Convert form data to CSV
    const csvData = convertResponsesToCSV(fields, formData);
    const fileSize = Buffer.from(csvData).length;

    // Create file record in database with CSV content and type
    const timestamp = new Date();
    const [fileRecord] = await db.insert(files)
      .values({
        name: fileName,
        size: fileSize,
        type: 'text/csv',
        path: csvData, // Store CSV content directly
        status: 'uploaded',
        user_id: task.created_by || 1,
        company_id: task.company_id,
        upload_time: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        version: 1.0
      })
      .returning();

    // Handle revenue tier update if the field is present
    if (formData.revenueTier) {
      const [revenueTierField] = await db.select()
        .from(kybFields)
        .where(eq(kybFields.field_key, 'revenueTier'))
        .limit(1);

      if (revenueTierField?.validation_rules?.mapping) {
        const tierMapping = revenueTierField.validation_rules.mapping;
        const selectedTier = tierMapping[formData.revenueTier];

        if (selectedTier) {
          await db.update(companies)
            .set({
              revenue_tier: selectedTier,
              updated_at: timestamp
            })
            .where(eq(companies.id, task.company_id));
        }
      }
    }

    // Update task status and metadata
    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: timestamp,
        metadata: {
          ...task.metadata,
          kybFormFile: fileRecord.id,
          submissionDate: timestamp.toISOString(),
          formVersion: '1.0',
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
            .filter((v, i, a) => a.indexOf(v) === i)
        }
      })
      .where(eq(tasks.id, taskId));

    // Save responses to database
    for (const field of fields) {
      const value = formData[field.field_key];
      const status = value ? 'COMPLETE' : 'EMPTY';

      await db.insert(kybResponses)
        .values({
          task_id: taskId,
          field_id: field.id,
          response_value: value || null,
          status,
          version: 1,
          created_at: timestamp,
          updated_at: timestamp
        })
        .onConflictDoUpdate({
          target: [kybResponses.task_id, kybResponses.field_id],
          set: {
            response_value: value || null,
            status,
            version: sql`${kybResponses.version} + 1`,
            updated_at: timestamp
          }
        });
    }

    res.json({
      success: true,
      fileId: fileRecord.id
    });
  } catch (error) {
    console.error('[KYB API Debug] Error saving KYB form:', error);
    res.status(500).json({ error: 'Failed to save KYB form data' });
  }
});

// Get saved progress for KYB form
router.get('/api/kyb/progress/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    console.log('[KYB API Debug] Loading progress for task:', taskId);

    // Get task data
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, parseInt(taskId)));

    logTaskDebug('Retrieved task', task);

    if (!task) {
      console.log('[KYB API Debug] Task not found:', taskId);
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get all KYB responses for this task with their field information
    const responses = await db.select({
      response_value: kybResponses.response_value,
      field_key: kybFields.field_key,
      status: kybResponses.status
    })
      .from(kybResponses)
      .innerJoin(kybFields, eq(kybResponses.field_id, kybFields.id))
      .where(eq(kybResponses.task_id, parseInt(taskId)));

    logResponseDebug('Retrieved responses', responses);

    // Transform responses into form data
    const formData: Record<string, any> = {};
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
  } catch (error) {
    console.error('[KYB API Debug] Error loading progress:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Failed to load progress' });
  }
});

// Add download endpoint after the existing routes
router.get('/api/kyb/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const format = (req.query.format as string)?.toLowerCase() || 'csv';

    // Get file from database
    const [file] = await db.select()
      .from(files)
      .where(eq(files.id, parseInt(fileId)));

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set response headers based on format
    switch (format) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=kyb_form.csv`);
        // If file is already CSV, send it directly
        if (file.type === 'text/csv') {
          return res.send(file.path);
        }
        // If file is JSON, convert it to CSV
        const jsonData = JSON.parse(file.path);
        // Convert JSON to CSV format
        const csvRows = [['Group', 'Question', 'Answer', 'Type']];
        Object.entries(jsonData.responses).forEach(([group, fields]: [string, any]) => {
          Object.entries(fields).forEach(([key, data]: [string, any]) => {
            csvRows.push([
              group,
              data.question,
              data.answer || '',
              data.type
            ]);
          });
        });
        return res.send(csvRows.map(row => row.join(',')).join('\n'));

      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=kyb_form.json`);
        return res.send(file.type === 'application/json' ? file.path : JSON.stringify(JSON.parse(file.path), null, 2));

      case 'txt':
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=kyb_form.txt`);
        const data = file.type === 'application/json' ? JSON.parse(file.path) : { responses: {} };
        const textContent = Object.entries(data.responses).map(([group, fields]: [string, any]) => {
          return `\n${group}:\n${'='.repeat(group.length)}\n` +
            Object.entries(fields).map(([key, data]: [string, any]) =>
              `${data.question}\nAnswer: ${data.answer || 'Not provided'}\n`
            ).join('\n');
        }).join('\n');
        return res.send(textContent);

      default:
        return res.status(400).json({ error: 'Invalid format specified' });
    }
  } catch (error) {
    console.error('[KYB API Debug] Error processing download:', error);
    res.status(500).json({ error: 'Failed to process download' });
  }
});

export default router;