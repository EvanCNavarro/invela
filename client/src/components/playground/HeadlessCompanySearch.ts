import { Company, CompanyCategory } from "@/types/company";
import { AccreditationStatus } from "@/types/company";

// Interface for the search result
export interface CompanySearchResult {
  existingData: boolean;
  companyData: Partial<Company>;
  enrichedFields: string[];
  missingFields: string[];
}

// Function to get missing fields from a company object
const getMissingFields = (company: Partial<Company>): string[] => {
  console.log("[HeadlessSearch] 🔍 Analyzing company data for missing fields");

  const requiredFields = [
    'name',
    'category',
    'description',
    'websiteUrl',
    'legalStructure',
    'hqAddress',
    'productsServices',
    'incorporationYear',
    'numEmployees',
    'revenue',
    'keyClientsPartners',
    'investors',
    'fundingStage',
    'certificationsCompliance'
  ];

  return requiredFields.filter(field => {
    const value = company[field as keyof Company];
    const isEmpty = value === undefined || value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);

    if (isEmpty) {
      console.log(`[HeadlessSearch] ❌ Missing field: ${field}`);
    }
    return isEmpty;
  });
};

// Helper function to validate JSON response
const validateJsonResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error(`Expected JSON response but got ${contentType}`);
  }

  try {
    return await response.json();
  } catch (error) {
    console.error('[HeadlessSearch] ❌ JSON parsing error:', error);
    throw new Error('Invalid JSON response from server');
  }
};

// Main headless search function
export async function headlessCompanySearch(
  companyName: string
): Promise<CompanySearchResult> {
  console.log(`[HeadlessSearch] 🚀 Starting headless search for: ${companyName}`);
  const startTime = Date.now();

  try {
    // Step 1: Search internal registry
    console.log("[HeadlessSearch] 📚 Searching internal registry");
    const registryResponse = await fetch(`/api/companies/search?name=${encodeURIComponent(companyName)}`);

    if (!registryResponse.ok) {
      throw new Error(`Registry search failed with status ${registryResponse.status}`);
    }

    const registryData = await validateJsonResponse(registryResponse);
    const existingCompany = registryData.company;

    // Step 2: Handle existing vs new company
    if (existingCompany) {
      console.log("[HeadlessSearch] ✅ Found existing company in registry");

      // Find missing fields to enrich
      const missingFields = getMissingFields(existingCompany);

      if (missingFields.length === 0) {
        console.log("[HeadlessSearch] ✨ Company data is complete, no enrichment needed");
        return {
          existingData: true,
          companyData: existingCompany,
          enrichedFields: [],
          missingFields: []
        };
      }

      // Enrich missing fields
      console.log(`[HeadlessSearch] 🔄 Enriching ${missingFields.length} missing fields`);
      const enrichmentResponse = await fetch("/api/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          existingData: existingCompany,
          fieldsToEnrich: missingFields
        }),
      });

      if (!enrichmentResponse.ok) {
        throw new Error(`Enrichment failed with status ${enrichmentResponse.status}`);
      }

      const { data: enrichedData } = await validateJsonResponse(enrichmentResponse);

      // Determine which fields were actually enriched
      const enrichedFields = missingFields.filter(field => 
        enrichedData[field] !== undefined && enrichedData[field] !== null
      );

      console.log(`[HeadlessSearch] ✅ Enriched ${enrichedFields.length} fields`);

      return {
        existingData: true,
        companyData: { ...existingCompany, ...enrichedData },
        enrichedFields,
        missingFields: missingFields.filter(f => !enrichedFields.includes(f))
      };

    } else {
      // New company - full search
      console.log("[HeadlessSearch] 🆕 Company not found in registry, performing full search");

      const searchResponse = await fetch("/api/company-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });

      if (!searchResponse.ok) {
        throw new Error(`Search failed with status ${searchResponse.status}`);
      }

      const { data } = await validateJsonResponse(searchResponse);
      const missingFields = getMissingFields(data);
      const foundFields = Object.keys(data).filter(key => !missingFields.includes(key));

      console.log(`[HeadlessSearch] ✅ Found ${foundFields.length} fields for new company`);

      return {
        existingData: false,
        companyData: data,
        enrichedFields: foundFields,
        missingFields
      };
    }

  } catch (error) {
    console.error("[HeadlessSearch] ❌ Error:", error);
    throw new Error(`Headless company search failed: ${error.message}`);
  } finally {
    const endTime = Date.now();
    console.log(`[HeadlessSearch] 🏁 Search completed in ${endTime - startTime}ms`);
  }
}

// Utility function to check if search result has sufficient data
export function isSearchResultComplete(result: CompanySearchResult): boolean {
  const requiredFields = ['name', 'description', 'websiteUrl'];
  return requiredFields.every(field => 
    result.companyData[field as keyof Company] !== undefined &&
    result.companyData[field as keyof Company] !== null
  );
}

// Example usage:
/*
try {
  const result = await headlessCompanySearch("Example Corp");
  if (result.existingData) {
    console.log("Found existing company with enriched data:", result);
  } else {
    console.log("Found new company data:", result);
  }
} catch (error) {
  console.error("Search failed:", error);
}
*/