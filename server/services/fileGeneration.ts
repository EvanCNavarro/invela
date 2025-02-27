import fs from 'fs';
import path from 'path';
import { db } from '@db';
import { cardResponses, cardFields } from '@db/schema';
import { eq } from 'drizzle-orm';

interface AssessmentData {
  taskId: number;
  companyName: string;
  completionDate: Date;
  responses: Array<{
    fieldKey: string;
    question: string;
    response: string;
    status: string;
    riskScore: number;
    reasoning?: string;
  }>;
  totalRiskScore: number;
}

export async function generateAssessmentFile(
  taskId: number,
  companyName: string
): Promise<{ filePath: string; fileName: string }> {
  console.log('[File Generation] Starting assessment file generation:', {
    taskId,
    companyName,
    timestamp: new Date().toISOString()
  });

  try {
    // Get all responses with their corresponding fields
    const responses = await db.select({
      response: cardResponses,
      field: cardFields
    })
    .from(cardResponses)
    .where(eq(cardResponses.task_id, taskId))
    .leftJoin(cardFields, eq(cardResponses.field_id, cardFields.id));

    const assessmentData: AssessmentData = {
      taskId,
      companyName,
      completionDate: new Date(),
      responses: responses.map(({ response, field }) => ({
        fieldKey: field.field_key,
        question: field.question,
        response: response.response_value,
        status: response.status,
        riskScore: response.partial_risk_score || 0,
        reasoning: response.ai_reasoning || undefined
      })),
      totalRiskScore: responses.reduce((sum, { response }) => 
        sum + (response.partial_risk_score || 0), 0)
    };

    // Create directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'card-assessments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:]/g, '').split('.')[0];
    const fileName = `card_assessment_${companyName.toLowerCase().replace(/\s+/g, '_')}_${timestamp}.json`;
    const filePath = path.join(uploadDir, fileName);

    // Write the file
    fs.writeFileSync(filePath, JSON.stringify(assessmentData, null, 2));

    console.log('[File Generation] Assessment file generated:', {
      fileName,
      filePath,
      responseCount: assessmentData.responses.length,
      timestamp: new Date().toISOString()
    });

    return {
      filePath,
      fileName
    };
  } catch (error) {
    console.error('[File Generation] Error generating assessment file:', {
      error,
      taskId,
      companyName,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
