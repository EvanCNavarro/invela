import { Router } from 'express';
import { db } from '@db';
import { tasks, TaskStatus, cardFields, cardResponses, files, companies } from '@db/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

// Debug utility for logging task data
const logTaskDebug = (stage: string, task: any, extras: Record<string, any> = {}) => {
  console.log(`[CARD API Debug] ${stage}:`, {
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
  console.log(`[CARD API Debug] ${stage}:`, {
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
  console.log(`[CARD File Debug] ${stage}:`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Save CARD form data
router.post('/api/card/save', async (req, res) => {
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
    const [task] = await db.select()
      .from(tasks)
      .where(eq(tasks.id, taskId));

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
    const [company] = await db.select()
      .from(companies)
      .where(eq(companies.id, task.company_id));

    if (!company) {
      throw new Error('Company not found');
    }

    // Add file-vault to available tabs if not already present
    const currentTabs = company.available_tabs || ['task-center'];
    if (!currentTabs.includes('file-vault')) {
      const updatedTabs = [...currentTabs, 'file-vault'];

      // Update company's available tabs
      await db.update(companies)
        .set({
          available_tabs: updatedTabs,
          updated_at: new Date()
        })
        .where(eq(companies.id, task.company_id));

      logFileDebug('Updated company available tabs', {
        companyId: task.company_id,
        previousTabs: currentTabs,
        newTabs: updatedTabs
      });
    }

    // Get all CARD fields with their wizard sections
    const fields = await db.select()
      .from(cardFields);

    logFileDebug('Fields retrieved', {
      fieldCount: fields.length,
      sections: [...new Set(fields.map(f => f.wizard_section))],
      fieldTypes: [...new Set(fields.map(f => f.field_key))]
    });

    // Create comprehensive submission data
    const submissionData = {
      metadata: {
        taskId,
        taskTitle: task.title,
        submissionDate: new Date().toISOString(),
        formVersion: '1.0',
        status: TaskStatus.SUBMITTED
      },
      taskData: {
        ...task,
        progress: 100,
        status: TaskStatus.SUBMITTED
      },
      formStructure: {
        fields: fields.map(field => ({
          key: field.field_key,
          label: field.question_label,
          section: field.wizard_section,
          question: field.question,
          example: field.example_response,
          aiInstructions: field.ai_search_instructions
        }))
      },
      responses: {}
    };

    logFileDebug('Submission data prepared', {
      metadataKeys: Object.keys(submissionData.metadata),
      formStructureFields: submissionData.formStructure.fields.length
    });

    // Group responses by wizard section
    const groupedResponses: Record<string, Record<string, any>> = {};
    for (const field of fields) {
      const section = field.wizard_section;
      if (!groupedResponses[section]) {
        groupedResponses[section] = {};
      }
      groupedResponses[section][field.field_key] = {
        question: field.question,
        answer: formData[field.field_key] || null,
        example: field.example_response,
        answeredAt: new Date().toISOString()
      };
    }
    submissionData.responses = groupedResponses;

    logFileDebug('Responses grouped', {
      sectionCount: Object.keys(groupedResponses).length,
      sections: Object.keys(groupedResponses),
      responseCount: Object.values(groupedResponses).reduce((acc, group) => acc + Object.keys(group).length, 0)
    });

    // Convert submission data to JSON string
    const jsonData = JSON.stringify(submissionData, null, 2);
    const fileSize = Buffer.from(jsonData).length;

    // Create file record in database
    const timestamp = new Date();
    const [fileRecord] = await db.insert(files)
      .values({
        name: `${fileName}.json`,
        size: fileSize,
        type: 'application/json',
        path: jsonData,
        status: 'uploaded',
        user_id: task.created_by || 1,
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
    const fieldMap = new Map(fields.map(f => [f.field_key, f.id]));

    for (const [fieldKey, value] of Object.entries(formData)) {
      const fieldId = fieldMap.get(fieldKey);
      if (!fieldId) {
        logFileDebug('Field not found', { fieldKey });
        continue;
      }

      const responseValue = value === '' ? null : String(value);
      const status = responseValue === null ? 'EMPTY' : 'COMPLETE';

      // Check if response exists
      const [existingResponse] = await db.select()
        .from(cardResponses)
        .where(
          and(
            eq(cardResponses.task_id, taskId),
            eq(cardResponses.field_id, fieldId)
          )
        );

      if (existingResponse) {
        logFileDebug('Updating existing response', {
          fieldKey,
          responseId: existingResponse.id,
          oldValue: existingResponse.response_value,
          newValue: responseValue
        });

        await db.update(cardResponses)
          .set({
            response_value: responseValue,
            status,
            version: existingResponse.version + 1,
            updated_at: timestamp
          })
          .where(eq(cardResponses.id, existingResponse.id));
      } else {
        logFileDebug('Creating new response', {
          fieldKey,
          status,
          value: responseValue
        });

        await db.insert(cardResponses)
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
      newStatus: TaskStatus.SUBMITTED,
      progress: 100
    });

    await db.update(tasks)
      .set({
        status: TaskStatus.SUBMITTED,
        progress: 100,
        updated_at: timestamp,
        metadata: {
          ...task.metadata,
          cardFormFile: fileRecord.id,
          submissionDate: timestamp.toISOString(),
          formVersion: '1.0',
          statusFlow: [...(task.metadata?.statusFlow || []), TaskStatus.SUBMITTED]
            .filter((v, i, a) => a.indexOf(v) === i)
        }
      })
      .where(eq(tasks.id, taskId));

    logFileDebug('Save completed', {
      fileId: fileRecord.id,
      taskId,
      status: TaskStatus.SUBMITTED,
      timestamp: timestamp.toISOString()
    });

    res.json({
      success: true,
      fileId: fileRecord.id,
      metadata: submissionData.metadata
    });
  } catch (error) {
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    logFileDebug('Error saving CARD form', errorDetails);
    console.error('[CARD API Debug] Error saving CARD form:', errorDetails);

    res.status(500).json({
      error: 'Failed to save CARD form data',
      details: errorDetails
    });
  }
});

export default router;
