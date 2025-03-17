import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface Answer {
  field_key: string;
  answer: string;
  source_document: string;
  confidence: number;
}

export async function extractAnswersFromDocument(
  documentChunk: string,
  fileName: string,
  questions: Array<{
    field_key: string;
    question: string;
    ai_search_instructions: string;
  }>
): Promise<Answer[]> {
  try {
    console.log('[OpenAIService] Processing document chunk:', {
      fileName,
      chunkLength: documentChunk.length,
      questionCount: questions.length,
      timestamp: new Date().toISOString()
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a compliance analyst extracting specific answers from documents."
        },
        {
          role: "user",
          content: `Analyze this document chunk and extract answers for the compliance questions. Include a confidence score (0-1) for each answer.

Document: ${documentChunk}

Questions to answer:
${questions.map(q => `- ${q.question} (key: ${q.field_key})
  Search instructions: ${q.ai_search_instructions}`).join('\n')}

Respond in JSON format with an array of answers, each containing:
- field_key: The question's key
- answer: The extracted answer
- confidence: Number between 0-1 indicating confidence
`
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content);
    
    console.log('[OpenAIService] Processed chunk successfully:', {
      fileName,
      answersFound: result.answers.length,
      timestamp: new Date().toISOString()
    });

    return result.answers.map(answer => ({
      ...answer,
      source_document: fileName
    }));
  } catch (error) {
    console.error('[OpenAIService] Error processing document:', {
      fileName,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}
