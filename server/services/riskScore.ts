import { db } from '@db';
import { companies, cardResponses, cardFields } from '@db/schema';
import { eq, and } from 'drizzle-orm';

interface RiskScoreResult {
  riskScore: number;
  totalFields: number;
  answeredFields: number;
  maxPossibleScore: number;
  actualScore: number;
}

export async function calculateCardRiskScore(taskId: number): Promise<RiskScoreResult> {
  console.log('[Risk Score] Starting risk score calculation for task:', taskId);

  // Get all responses for this task
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

    // Add to max possible score, safely handle nulls
    maxPossibleScore += field.partial_risk_score_max || 0;

    // Only count complete responses with a valid score
    if (response.status === 'COMPLETE' && response.partial_risk_score !== null) {
      totalScore += response.partial_risk_score;
      answeredCount++;
    }
  }

  // Calculate final risk score as percentage of max possible, handle zero case
  const riskScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;

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

    // Update company risk score using the correct Drizzle syntax
    const [updatedCompany] = await db
      .update(companies)
      .set({
        riskScore: result.riskScore,
        updatedAt: new Date()
      })
      .where(eq(companies.id, companyId))
      .returning({
        id: companies.id,
        riskScore: companies.riskScore
      });

    if (!updatedCompany) {
      throw new Error(`Failed to update risk score for company ${companyId}`);
    }

    console.log('[Risk Score] Company risk score updated successfully:', {
      companyId: updatedCompany.id,
      newRiskScore: updatedCompany.riskScore,
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