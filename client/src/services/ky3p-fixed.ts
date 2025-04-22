/**
 * This adds the missing convertToFormField method to the KY3PFormService class
 */

// First, find the class in the existing file:
// export class KY3PFormService extends EnhancedKybFormService {

// Then, add this method right after the ensureNumericFieldId method:

/**
 * Convert a database field to FormField format
 * Used to format fields within sections
 */
private convertToFormField(field: any, sectionId: string): FormField {
  return {
    id: field.id,
    key: field.field_key || field.key,
    label: field.display_name || field.label,
    description: field.question || field.description,
    type: field.field_type || field.type,
    required: field.is_required || field.required || false,
    section: sectionId,
    order: field.order || 0,
    defaultValue: field.default_value || field.defaultValue || '',
    placeholder: field.placeholder || '',
    helpText: field.help_text || field.helpText || '',
    group: field.group || '',
    options: field.options || [],
    demoAutofill: field.demo_autofill || field.demoAutofill || '',
    disabled: field.disabled || false,
    validation: field.validation || {
      type: field.validation_type || 'none',
      rules: field.validation_rules || {}
    }
  };
}