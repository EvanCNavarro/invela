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
    timestamp: new Date().toISOString()
  });

  let totalScore = 0;
  let maxPossibleScore = 0;
  let answeredCount = 0;

  // Calculate risk score
  for (const { response, field } of responses) {
    // Add to max possible score
    maxPossibleScore += field.partial_risk_score_max;

    // Only count complete responses
    if (response.status === 'COMPLETE' && response.partial_risk_score !== null) {
      totalScore += response.partial_risk_score;
      answeredCount++;
    }
  }

  // Calculate final risk score as percentage of max possible
  const riskScore = Math.round((totalScore / maxPossibleScore) * 100);

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

  const result = await calculateCardRiskScore(taskId);
  
  // Update company risk score
  await db.update(companies)
    .set({ 
      riskScore: result.riskScore,
      updatedAt: new Date()
    })
    .where(eq(companies.id, companyId));

  console.log('[Risk Score] Company risk score updated:', {
    companyId,
    newRiskScore: result.riskScore,
    timestamp: new Date().toISOString()
  });

  return result.riskScore;
}
