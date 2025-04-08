export interface KybField {
  id: number;
  field_key: string;
  display_name: string;
  field_type: string;
  question: string;
  group: string;
  required: boolean;
  order: number;
  validation_rules: any;
  help_text: string | null;
}

export interface KybProgressResponse {
  formData: Record<string, any>;
  progress: number;
}

/**
 * Fetches all KYB fields from the server, ordered by group and order
 * @returns Promise with an array of KYB fields
 */
export async function getKybFields(): Promise<KybField[]> {
  console.log('[KYB Service] Fetching KYB fields');
  const response = await fetch('/api/kyb/fields');
  if (!response.ok) {
    throw new Error(`Failed to fetch KYB fields: ${response.statusText}`);
  }
  return await response.json();
}

/**
 * Groups KYB fields by their group property
 * @param fields Array of KYB fields to group
 * @returns Object with group names as keys and arrays of fields as values
 */
export function groupKybFieldsBySection(fields: KybField[]): Record<string, KybField[]> {
  return fields.reduce((acc, field) => {
    if (!acc[field.group]) {
      acc[field.group] = [];
    }
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, KybField[]>);
}

/**
 * Saves progress for a KYB form
 * @param taskId ID of the task
 * @param progress Progress percentage (0-100)
 * @param formData Form data to save
 * @returns Promise with saved data
 */
export async function saveKybProgress(taskId: number, progress: number, formData: Record<string, any>) {
  console.log('[KYB Service] Saving KYB progress', {
    taskId,
    progress,
    formDataKeys: Object.keys(formData)
  });
  
  const response = await fetch('/api/kyb/progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      taskId,
      progress,
      formData
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to save KYB progress: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Gets saved progress for a KYB form
 * @param taskId ID of the task
 * @returns Promise with saved form data and progress
 */
export async function getKybProgress(taskId: number): Promise<KybProgressResponse> {
  console.log('[KYB Service] Getting KYB progress', { taskId });
  
  const response = await fetch(`/api/kyb/progress/${taskId}`);
  if (!response.ok) {
    throw new Error(`Failed to get KYB progress: ${response.statusText}`);
  }
  
  return await response.json();
}

/**
 * Submits a completed KYB form
 * @param taskId ID of the task
 * @param formData Complete form data
 * @param fileName Optional file name for the CSV export
 * @returns Promise with submission result
 */
export async function submitKybForm(taskId: number, formData: Record<string, any>, fileName?: string) {
  console.log('[KYB Service] Submitting KYB form', {
    taskId,
    formDataKeys: Object.keys(formData),
    fileName
  });
  
  const response = await fetch(`/api/kyb/submit/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      taskId,
      formData,
      fileName: fileName || `kyb_form_${taskId}_${new Date().toISOString().replace(/[:]/g, '')}`
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to submit KYB form: ${response.statusText}`);
  }
  
  return await response.json();
}