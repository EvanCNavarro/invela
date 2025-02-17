import Fuse from 'fuse.js';
import { db } from "@db";
import { companies } from "@db/schema";
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
export function findMissingFields(company: typeof companies.$inferSelect): string[] {
  const missingFields: string[] = [];

  // Core fields that should always be present
  const requiredFields = [
    'name', 'category', 'description', 'websiteUrl', 
    'legalStructure', 'hqAddress', 'productsServices',
    'incorporationYear', 'numEmployees'
  ];

  // Check each field
  for (const field of requiredFields) {
    if (!company[field] || 
        (typeof company[field] === 'string' && company[field].trim() === '') ||
        (Array.isArray(company[field]) && company[field].length === 0)) {
      missingFields.push(field);
    }
  }

  return missingFields;
}

/**
 * Find a company in the registry using fuzzy matching
 */
export async function findCompanyInRegistry(searchName: string): Promise<{
  found: boolean;
  company?: typeof companies.$inferSelect;
  score?: number;
}> {
  // Get all companies from the database
  const allCompanies = await db.select().from(companies);

  // Initialize Fuse with our companies
  const fuse = new Fuse(allCompanies, fuseOptions);

  // Search for matches
  const results = fuse.search(searchName);

  // If we found a good match (score < 0.3 indicates good match)
  if (results.length > 0 && results[0].score < 0.3) {
    return {
      found: true,
      company: results[0].item,
      score: results[0].score
    };
  }

  return { found: false };
}

/**
 * Update company with new data
 */
export async function updateCompanyData(
  companyId: number,
  newData: Partial<typeof companies.$inferInsert>
): Promise<typeof companies.$inferSelect> {
  // Update company record
  await db.update(companies)
    .set({
      ...newData,
      updatedAt: new Date() // Use Date object directly
    })
    .where(eq(companies.id, companyId));

  // Return updated company
  const updatedCompany = await db.query.companies.findFirst({
    where: eq(companies.id, companyId)
  });

  if (!updatedCompany) {
    throw new Error(`Company with ID ${companyId} not found after update`);
  }

  return updatedCompany;
}

/**
 * Create new company in registry
 */
export async function createCompanyInRegistry(
  data: typeof companies.$inferInsert
): Promise<typeof companies.$inferSelect> {
  const now = new Date(); // Create a single Date object for all timestamps

  const [newCompany] = await db.insert(companies)
    .values({
      ...data,
      registryDate: now,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  return newCompany;
}