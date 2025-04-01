import { db } from "@db";
import { cardFields, securityFields } from "@db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Security-related wizard sections from CARD form to copy to security form
 */
const SECURITY_SECTIONS = [
  'operational_policies', 
  'security_policies', 
  'information_security',
  'data_protection',
  'incident_response'
];

/**
 * Copy security-related fields from card_fields to security_fields
 */
export async function populateSecurityFields() {
  console.log('[DB Migration] Populating security fields...');
  
  try {
    // Check if we already have security fields
    const existingCount = await db.select({ count: db.fn.count() })
      .from(securityFields)
      .then(result => Number(result[0].count));
    
    if (existingCount > 0) {
      console.log(`[DB Migration] Security fields already populated (${existingCount} fields exist)`);
      return true;
    }
    
    // Get security-related fields from CARD form
    const securityCardFields = await db.select()
      .from(cardFields)
      .where(and(
        eq(cardFields.status, 'ACTIVE'),
        // Fields that belong to security-related sections
        db.fn.jsonPathExists(cardFields.metadata, '$.section').eq(true),
        db.or(
          ...SECURITY_SECTIONS.map(section => 
            db.fn.jsonPathQuery(cardFields.metadata, '$.section')
              .cast('text')
              .like(`%${section}%`))
        )
      ));
    
    console.log(`[DB Migration] Found ${securityCardFields.length} security-related fields in CARD form`);
    
    if (securityCardFields.length === 0) {
      console.log('[DB Migration] No security fields found to copy');
      return false;
    }
    
    // Convert fields to security format
    const securityFieldsToInsert = securityCardFields.map(field => {
      // Extract section from metadata or use default
      let section = 'security_assessment';
      if (field.metadata && typeof field.metadata === 'object' && 'section' in field.metadata) {
        section = field.metadata.section as string;
      }
      
      return {
        section,
        field_key: `security_${field.field_key}`,
        label: field.label,
        description: field.description,
        field_type: field.field_type,
        is_required: field.is_required,
        options: field.options,
        validation_rules: field.validation_rules,
        metadata: {
          ...field.metadata,
          source_card_field_id: field.id,
          copied_from_card: true,
          migration_date: new Date().toISOString()
        },
        status: field.status,
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