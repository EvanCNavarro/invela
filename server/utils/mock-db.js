/**
 * mock-db.js
 * 
 * This module provides mock implementations of database functionality
 * for development and testing purposes when a real database connection
 * is not available.
 */

console.log('[Mock DB] Initializing mock database module');

// Mock schema objects
const companies = {
  id: { name: 'id' },
  name: { name: 'name' },
  category: { name: 'category' },
  description: { name: 'description' },
  logo_id: { name: 'logo_id' },
  accreditation_status: { name: 'accreditation_status' },
  created_at: { name: 'created_at' },
  updated_at: { name: 'updated_at' }
};

const users = {
  id: { name: 'id' },
  company_id: { name: 'company_id' },
  email: { name: 'email' },
  password_hash: { name: 'password_hash' },
  first_name: { name: 'first_name' },
  last_name: { name: 'last_name' },
  role: { name: 'role' },
  created_at: { name: 'created_at' },
  updated_at: { name: 'updated_at' },
  email_verified: { name: 'email_verified' }
};

const relationships = {
  id: { name: 'id' },
  company_id: { name: 'company_id' },
  related_company_id: { name: 'related_company_id' },
  relationship_type: { name: 'relationship_type' },
  created_at: { name: 'created_at' },
  updated_at: { name: 'updated_at' }
};

const documents = {
  id: { name: 'id' },
  company_id: { name: 'company_id' },
  document_type: { name: 'document_type' },
  file_path: { name: 'file_path' },
  created_at: { name: 'created_at' },
  updated_at: { name: 'updated_at' }
};

// Mock database connection
const pool = {
  query: async (text, params) => {
    console.log(`[Mock DB] Query executed: ${text}`);
    console.log(`[Mock DB] With parameters: ${params}`);
    return { rows: [] };
  },
  connect: async () => {
    console.log('[Mock DB] Connected to mock database');
    return {
      query: async (text, params) => {
        console.log(`[Mock DB] Client query executed: ${text}`);
        return { rows: [] };
      },
      release: () => {
        console.log('[Mock DB] Client connection released');
      }
    };
  }
};

// Mock database functions
async function executeWithNeonRetry(callback, maxRetries = 3) {
  console.log(`[Mock DB] Executing with retry (max attempts: ${maxRetries})`);
  
  try {
    // Create a simple mock DB object to pass to the callback
    const mockDb = {
      select: () => ({ from: () => ({ where: () => ({ orderBy: () => [] }) }) }),
      insert: () => ({ values: () => ({ returning: () => [] }) }),
      update: () => ({ set: () => ({ where: () => [] }) }),
      delete: () => ({ where: () => [] })
    };
    
    return [];
  } catch (error) {
    console.error('[Mock DB] Error in executeWithNeonRetry:', error);
    return [];
  }
}

async function queryWithNeonRetry(queryText, params = [], maxRetries = 3) {
  console.log(`[Mock DB] Query with retry: ${queryText}`);
  console.log(`[Mock DB] Parameters: ${JSON.stringify(params)}`);
  console.log(`[Mock DB] Max retries: ${maxRetries}`);
  
  return { rows: [] };
}

/**
 * Initialize the mock database
 */
async function initialize() {
  console.log('[Mock DB] Initializing mock database...');
  
  // Simulate a delay to mimic real database initialization
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('[Mock DB] Mock database initialized successfully');
  return true;
}

// Helper function for ensuring non-null values
function ensureValue(value, defaultValue) {
  return (value === null || value === undefined) ? defaultValue : value;
}

module.exports = {
  // Schema objects
  companies,
  users,
  relationships,
  documents,
  
  // Database connection
  pool,
  
  // Database functions
  executeWithNeonRetry,
  queryWithNeonRetry,
  initialize,
  ensureValue
}; 