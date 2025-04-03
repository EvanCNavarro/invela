import { apiRequest } from "@/lib/queryClient";

export interface CardField {
  id: number;
  field_key: string;
  wizard_section: string;
  question_label: string;
  question: string;
  example_response: string;
  ai_search_instructions: string;
  partial_risk_score_max: number;
}

export async function getCardFields() {
  return apiRequest<CardField[]>('/api/card/fields');
}

export function groupCardFieldsBySection(fields: CardField[]): Record<string, CardField[]> {
  return fields.reduce((acc, field) => {
    if (!acc[field.wizard_section]) {
      acc[field.wizard_section] = [];
    }
    acc[field.wizard_section].push(field);
    return acc;
  }, {} as Record<string, CardField[]>);
}