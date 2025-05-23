/**
 * ========================================
 * Form Data Type Definitions
 * ========================================
 * 
 * Enhanced form data types supporting field-level timestamps and metadata
 * for the enterprise risk assessment platform. Provides structures for
 * timestamped form data, conflict resolution, and synchronization.
 * 
 * @module types/form-data
 * @version 1.0.0
 * @since 2025-05-23
 */

// Basic form data type - simple key-value pairs
export type FormData = Record<string, any>;

// Extended form data with field-level timestamps
export interface TimestampedFormData {
  // The actual form data values
  values: FormData;
  
  // Timestamps for each field (milliseconds since epoch)
  timestamps: Record<string, number>;
  
  // Optional metadata about the form data
  meta?: {
    // When the entire form was last saved
    lastSaved?: number;
    
    // Client-side form version
    version?: number;
    
    // Device/client identifier
    clientId?: string;
  };
}

// Helper functions for working with timestamped form data

/**
 * Creates a new timestamped form data object
 */
export function createTimestampedFormData(
  initialValues: FormData = {},
  initialTimestamps: Record<string, number> = {}
): TimestampedFormData {
  const now = Date.now();
  const timestamps: Record<string, number> = {};
  
  // Set timestamps for all initial values
  Object.keys(initialValues).forEach(key => {
    timestamps[key] = initialTimestamps[key] || now;
  });
  
  return {
    values: { ...initialValues },
    timestamps,
    meta: {
      lastSaved: now,
      version: 1,
      clientId: generateClientId()
    }
  };
}

/**
 * Updates a field in timestamped form data
 */
export function updateField(
  data: TimestampedFormData, 
  key: string, 
  value: any
): TimestampedFormData {
  const now = Date.now();
  
  return {
    ...data,
    values: {
      ...data.values,
      [key]: value
    },
    timestamps: {
      ...data.timestamps,
      [key]: now
    },
    meta: {
      ...data.meta,
      version: (data.meta?.version || 0) + 1
    }
  };
}

/**
 * Merges two timestamped form data objects, preferring the newer values
 */
export function mergeTimestampedFormData(
  client: TimestampedFormData,
  server: TimestampedFormData
): TimestampedFormData {
  const mergedValues: FormData = { ...client.values };
  const mergedTimestamps: Record<string, number> = { ...client.timestamps };
  const changes: string[] = [];
  
  // Process all server fields
  Object.keys(server.values).forEach(key => {
    const serverTimestamp = server.timestamps[key] || 0;
    const clientTimestamp = client.timestamps[key] || 0;
    
    // Only use server value if it's newer
    if (serverTimestamp > clientTimestamp) {
      mergedValues[key] = server.values[key];
      mergedTimestamps[key] = serverTimestamp;
      changes.push(key);
    }
  });
  
  return {
    values: mergedValues,
    timestamps: mergedTimestamps,
    meta: {
      ...client.meta,
      lastSaved: Date.now(),
      version: (client.meta?.version || 0) + 1,
    }
  };
}

/**
 * Identifies all fields in client data that are newer than server data
 */
export function getNewerClientFields(
  client: TimestampedFormData,
  server: TimestampedFormData
): string[] {
  return Object.keys(client.values).filter(key => {
    const clientTimestamp = client.timestamps[key] || 0;
    const serverTimestamp = server.timestamps[key] || 0;
    return clientTimestamp > serverTimestamp;
  });
}

/**
 * Converts legacy form data to timestamped form data
 */
export function formDataToTimestamped(
  data: FormData
): TimestampedFormData {
  return createTimestampedFormData(data);
}

/**
 * Extracts just the values from timestamped form data 
 */
export function extractValues(
  data: TimestampedFormData
): FormData {
  return { ...data.values };
}

/**
 * Generates a client ID for tracking form origin
 */
function generateClientId(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}