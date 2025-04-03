import { db } from "@db";
import { cardFields, securityFields } from "@db/schema";
import { eq, and, sql, inArray, or } from "drizzle-orm";

/**
 * Security-related wizard sections from CARD form to copy to security form
 */
const SECURITY_SECTIONS = [
  'Security',
  'Security Testing',
  'Data Security Controls',
  'API Access Control',
  'Business Continuity Planning',
  'Governance',
  'Data Privacy Compliance'
];

/**
 * Copy security-related fields from card_fields to security_fields
 */
export async function populateSecurityFields() {
  console.log('[DB Migration] Populating security fields...');
  
  try {
    // Check if we already have security fields
    const existingResult = await db.select({
        count: sql`COUNT(*)`
      })
      .from(securityFields);
    
    const existingCount = Number(existingResult[0]?.count || 0);
    
    if (existingCount > 0) {
      console.log(`[DB Migration] Security fields already populated (${existingCount} fields exist)`);
      return true;
    }
    
    // Get security-related fields from CARD form
    // Find all fields where wizard_section is one of our security sections
    const securityCardFields = await db.select().from(cardFields).where(
      inArray(cardFields.wizard_section, SECURITY_SECTIONS)
    );
    
    console.log(`[DB Migration] Found ${securityCardFields.length} security-related fields in CARD form`);
    
    if (securityCardFields.length === 0) {
      console.log('[DB Migration] No security fields found to copy');
      return false;
    }
    
    // Convert fields to security format
    const securityFieldsToInsert = securityCardFields.map((field: any) => {
      // Map wizard_section to security section
      const section = field.wizard_section || 'security_assessment';
      
      // For field_key, check if it already starts with 'security_' to avoid duplicate prefixes
      const fieldKey = field.field_key.startsWith('security_') 
        ? field.field_key 
        : `security_${field.field_key}`;
        
      return {
        section,
        field_key: fieldKey,
        label: field.question_label || field.question,
        description: field.question,
        field_type: 'text', // Default to text field type
        is_required: true,  // Set as required by default
        options: null,      // No options for text fields
        validation_rules: null, // No validation rules
        metadata: {
          source_card_field_id: field.id,
          copied_from_card: true,
          migration_date: new Date().toISOString(),
          example_response: field.example_response,
          ai_search_instructions: field.ai_search_instructions,
          partial_risk_score_max: field.partial_risk_score_max
        },
        status: 'ACTIVE',
        created_at: new Date(),
        updated_at: new Date()
      };
    });
    
    // Insert security fields
    const insertedFields = await db.insert(securityFields)
      .values(securityFieldsToInsert)
      .returning();
    
    console.log(`[DB Migration] Successfully populated ${insertedFields.length} security fields`);
    return true;
  } catch (error) {
    console.error('[DB Migration] Error populating security fields:', error);
    throw error;
  }
}