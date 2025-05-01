import { db } from '@db';
import { companies, cardResponses, cardFields } from '@db/schema';
import { eq } from 'drizzle-orm';

interface RiskScoreResult {
  riskScore: number;
  totalFields: number;
  answeredFields: number;
  maxPossibleScore: number;
  actualScore: number;
}

export async function calculateCardRiskScore(taskId: number): Promise<RiskScoreResult> {
  console.log('[Risk Score] Starting risk score calculation for task:', taskId);

  // Get all responses for this task with their corresponding fields
  const responses = await db.select({
    response: cardResponses,
    field: cardFields
  })
  .from(cardResponses)
  .leftJoin(cardFields, eq(cardResponses.field_id, cardFields.id))
  .where(eq(cardResponses.task_id, taskId));

  console.log('[Risk Score] Retrieved responses:', {
    taskId,
    responseCount: responses.length,
    completeResponses: responses.filter(r => r.response.status === 'COMPLETE').length,
    responsesWithScore: responses.filter(r => r.response.partial_risk_score !== null).length,
    timestamp: new Date().toISOString()
  });

  let totalScore = 0;
  let maxPossibleScore = 0;
  let answeredCount = 0;

  // Calculate risk score
  for (const { response, field } of responses) {
    if (!field) {
      console.warn('[Risk Score] Missing field for response:', {
        responseId: response.id,
        fieldId: response.field_id,
        timestamp: new Date().toISOString()
      });
      continue;
    }

    console.log('[Risk Score] Processing response:', {
      responseId: response.id,
      fieldId: field.id,
      fieldKey: field.field_key,
      status: response.status,
      partialScore: response.partial_risk_score,
      maxScore: field.partial_risk_score_max,
      timestamp: new Date().toISOString()
    });

    // Add to max possible score
    const maxFieldScore = field.partial_risk_score_max || 0;
    maxPossibleScore += maxFieldScore;

    // Only count complete responses with a valid score
    if (response.status === 'COMPLETE' && response.partial_risk_score !== null) {
      totalScore += response.partial_risk_score;
      answeredCount++;
    }
  }

  // For unanswered fields, assume maximum risk (maxFieldScore)
  const unansweredCount = responses.length - answeredCount;
  if (unansweredCount > 0) {
    console.log('[Risk Score] Processing unanswered fields:', {
      unansweredCount,
      assumingMaxRisk: true,
      timestamp: new Date().toISOString()
    });
  }

  // Calculate final risk score as percentage of max possible and scale to 0-100 range
  let riskScore = 0;
  if (maxPossibleScore > 0) {
    // Calculate percentage (0-100)
    const percentage = (totalScore / maxPossibleScore) * 100;
    // Round to whole number
    riskScore = Math.round(percentage);
    // Ensure we stay within 0-100 range
    riskScore = Math.min(Math.max(0, riskScore), 100);
  }

  console.log('[Risk Score] Calculation complete:', {
    taskId,
    totalFields: responses.length,
    answeredFields: answeredCount,
    maxPossibleScore,
    actualScore: totalScore,
    finalRiskScore: riskScore,
    timestamp: new Date().toISOString()
  });

  return {
    riskScore,
    totalFields: responses.length,
    answeredFields: answeredCount,
    maxPossibleScore,
    actualScore: totalScore
  };
}

export async function updateCompanyRiskScore(companyId: number, taskId: number): Promise<number> {
  console.log('[Risk Score] Updating company risk score:', {
    companyId,
    taskId,
    timestamp: new Date().toISOString()
  });

  try {
    // Calculate risk score first
    const result = await calculateCardRiskScore(taskId);

    console.log('[Risk Score] Risk calculation result:', {
      companyId,
      taskId,
      calculatedScore: result.riskScore,
      metrics: {
        totalFields: result.totalFields,
        answeredFields: result.answeredFields,
        maxPossible: result.maxPossibleScore,
        actual: result.actualScore
      },
      timestamp: new Date().toISOString()
    });

    // Update company risk score
    const company = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);

    if (!company || company.length === 0) {
      throw new Error(`Company with ID ${companyId} not found`);
    }

    const [updatedCompany] = await db
      .update(companies)
      .set({
        risk_score: result.riskScore,
        updated_at: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning();

    if (!updatedCompany) {
      throw new Error(`Failed to update risk score for company ${companyId}`);
    }

    console.log('[Risk Score] Company risk score updated successfully:', {
      companyId: updatedCompany.id,
      newRiskScore: updatedCompany.risk_score,
      timestamp: new Date().toISOString()
    });

    return result.riskScore;
  } catch (error) {
    console.error('[Risk Score] Error updating company risk score:', {
      error,
      companyId,
      taskId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    throw new Error(`Failed to update company risk score: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}