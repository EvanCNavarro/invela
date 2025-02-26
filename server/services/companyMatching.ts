import Fuse from 'fuse.js';
import { getSchemas, getDb } from "../utils/db-adapter";
import { eq } from "drizzle-orm";

// Options for fuzzy matching
const fuseOptions = {
  keys: ['name'],
  threshold: 0.3,
  includeScore: true,
};

/**
 * Find missing or empty fields in a company record
 */
export function findMissingFields(company: any): string[] {
  console.log("[Company Matching] 🔍 Analyzing company fields for:", company.name);
  const missingFields: string[] = [];

  // Core fields that should always be present
  const requiredFields = [
    'description', 'websiteUrl', 'legalStructure', 'hqAddress', 
    'productsServices', 'incorporationYear', 'foundersAndLeadership',
    'numEmployees', 'revenue', 'keyClientsPartners', 'investors',
    'fundingStage', 'exitStrategyHistory', 'certificationsCompliance'
  ];

  // Check each field
  for (const field of requiredFields) {
    const value = company[field as keyof typeof company];
    const isEmpty = 
      value === null || 
      value === undefined || 
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      console.log(`[Company Matching] 🔍 Field '${field}' is ${value === null ? 'null' : value === undefined ? 'undefined' : 'empty'}`);
      missingFields.push(field);
    } else {
      console.log(`[Company Matching] ✓ Field '${field}' has value:`, value);
    }
  }

  console.log("[Company Matching] 📋 Missing fields detected:", missingFields);
  return missingFields;
}

/**
 * Find a company in the registry using fuzzy matching
 */
export async function findCompanyInRegistry(searchName: string): Promise<{
  found: boolean;
  company?: any;
  score?: number;
}> {
  console.log("[Company Matching] 🔎 Searching registry for:", searchName);

  // Get schemas for each function call (after DB initialization)
  const { companies } = getSchemas();

  // Get all companies from the database
  const allCompanies = await getDb().select().from(companies);
  console.log("[Company Matching] 📚 Found", allCompanies.length, "companies in registry");

  // Initialize Fuse with our companies
  const fuse = new Fuse(allCompanies, fuseOptions);

  // Search for matches
  const results = fuse.search(searchName);
  console.log("[Company Matching] 🎯 Search results:", results.length > 0 ? 
    `Found match with score ${results[0]?.score}` : "No matches found");

  // If we found a good match (score < 0.3 indicates good match)
  if (results.length > 0 && results[0]?.score !== undefined && results[0].score < 0.3) {
    // Type assertion for safer access
    const matchedItem = results[0].item as Record<string, any>;
    const matchName = matchedItem?.name || 'Unknown Company';
    console.log("[Company Matching] ✅ Found existing company:", matchName);
    return {
      found: true,
      company: matchedItem,
      score: results[0].score
    };
  }

  console.log("[Company Matching] ❌ No matching company found in registry");
  return { found: false };
}

/**
 * Update company with new data
 */
export async function updateCompanyData(
  companyId: number,
  newData: Partial<any>
): Promise<any> {
  console.log("[Company Matching] 🔄 Updating company data for ID:", companyId);
  console.log("[Company Matching] 📝 New data to be applied:", newData);

  // Get schemas when the function is called
  const { companies } = getSchemas();

  // Update company record
  await getDb().update(companies)
    .set({
      ...newData,
      updatedAt: new Date() // Use Date object directly
    })
    .where(eq(companies.id, companyId));

  // Return updated company
  const updatedCompany = await getDb().query.companies.findFirst({
    where: eq(companies.id, companyId)
  });

  if (!updatedCompany) {
    console.error("[Company Matching] ❌ Company not found after update:", companyId);
    throw new Error(`Company with ID ${companyId} not found after update`);
  }

  console.log("[Company Matching] ✅ Successfully updated company data");
  return updatedCompany;
}

/**
 * Create new company in registry
 */
export async function createCompanyInRegistry(
  data: any
): Promise<any> {
  console.log("[Company Matching] 🆕 Creating new company:", data.name);

  // Get schemas when the function is called
  const { companies } = getSchemas();
  
  const now = new Date(); // Create a single Date object for all timestamps

  const [newCompany] = await getDb().insert(companies)
    .values({
      ...data,
      registryDate: now,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  console.log("[Company Matching] ✅ Successfully created new company with ID:", newCompany.id);
  return newCompany;
}