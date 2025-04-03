import { Answer } from '../services/openai';
import Fuse from 'fuse.js';

export interface AggregatedAnswer {
  field_key: string;
  answer: string;
  source_documents: string[];
  confidence: number;
  similar_answers: string[];
}

/**
 * Aggregates answers from multiple chunks, deduplicating and combining similar answers
 */
export async function aggregateAnswers(answers: Answer[]): Promise<AggregatedAnswer[]> {
  // Group answers by field_key
  const answersByField = answers.reduce<Record<string, Answer[]>>((acc, answer) => {
    if (!acc[answer.field_key]) {
      acc[answer.field_key] = [];
    }
    acc[answer.field_key].push(answer);
    return acc;
  }, {});

  const aggregatedAnswers: AggregatedAnswer[] = [];

  // Process each field's answers
  for (const [field_key, fieldAnswers] of Object.entries(answersByField)) {
    // Sort by confidence
    const sortedAnswers = fieldAnswers.sort((a: Answer, b: Answer) => b.confidence - a.confidence);

    // Initialize fuzzy search for similarity detection
    const fuse = new Fuse(sortedAnswers, {
      keys: ['answer'],
      threshold: 0.3 // Lower threshold means more strict matching
    });

    const processedAnswers = new Set<string>();

    for (const answer of sortedAnswers) {
      if (processedAnswers.has(answer.answer)) continue;

      // Find similar answers
      const similarResults = fuse.search(answer.answer);
      const similarAnswers = similarResults
        .map(result => result.item as Answer)
        .filter(item => item.answer !== answer.answer);

      // Mark all similar answers as processed
      processedAnswers.add(answer.answer);
      similarAnswers.forEach((similar: Answer) => processedAnswers.add(similar.answer));

      // Calculate aggregate confidence
      const allConfidences = [answer.confidence, ...similarAnswers.map((a: Answer) => a.confidence)];
      const avgConfidence = allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;

      // Collect all source documents
      const sourceDocuments = [
        answer.source_document,
        ...similarAnswers.map((a: Answer) => a.source_document)
      ].filter((doc, index, array) => array.indexOf(doc) === index);

      aggregatedAnswers.push({
        field_key,
        answer: answer.answer, // Use the highest confidence answer
        source_documents: sourceDocuments,
        confidence: avgConfidence,
        similar_answers: similarAnswers.map((a: Answer) => a.answer)
      });
    }
  }

  console.log('[AnswerAggregation] Answers aggregated:', {
    totalAnswers: answers.length,
    uniqueFields: Object.keys(answersByField).length,
    aggregatedCount: aggregatedAnswers.length,
    timestamp: new Date().toISOString()
  });

  return aggregatedAnswers;
}