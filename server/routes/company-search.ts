import { Router } from "express";
import { companySearchSchema } from "../services/companySearch";
import { findCompanyInRegistry, findMissingFields, updateCompanyData } from "../services/companyMatching";
import { findMissingCompanyData } from "../services/openai";
import { ZodError } from "zod";
import { createCompany } from "../services/company";
import { eq } from "drizzle-orm";
import { companies } from "@db/schema";
import { db } from "@db";

const router = Router();

// Search by company name endpoint
router.get("/api/companies/search", async (req, res) => {
  try {
    const companyName = req.query.name as string;
    if (!companyName) {
      return res.status(400).json({
        success: false,
        error: "Company name is required"
      });
    }

    console.log(`[Company Search] 🔍 Searching for company: ${companyName}`);
    const result = await findCompanyInRegistry(companyName);

    return res.json({
      success: true,
      company: result.found ? result.company : null,
      score: result.score
    });
  } catch (error) {
    console.error("[Company Search] Search error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to search company"
    });
  }
});

// Full company search and enrichment
router.post("/api/company-search", async (req, res) => {
  try {
    const { companyName } = companySearchSchema.parse(req.body);
    console.log(`[Company Search] Starting search for: ${companyName}`);

    // First try to find in database directly
    const [existingCompany] = await db.select()
      .from(companies)
      .where(eq(companies.name, companyName));

    if (existingCompany) {
      console.log(`[Company Search] Found existing company in database: ${existingCompany.name}`);

      // Find missing fields
      const missingFields = findMissingFields(existingCompany);

      // Always try to supplement data if there are any null or empty fields
      if (missingFields.length > 0) {
        console.log(`[Company Search] Found ${missingFields.length} missing fields, searching for data:`, missingFields);

        try {
          // Search for missing data
          const newData = await findMissingCompanyData(existingCompany, missingFields);
          console.log('[Company Search] Retrieved new data:', newData);

          // Update company with new data
          const updatedCompany = await updateCompanyData(existingCompany.id, newData);

          return res.json({
            success: true,
            data: {
              company: updatedCompany,
              isNewData: true,
              source: 'registry_enriched'
            }
          });
        } catch (enrichError) {
          console.error("[Company Search] Enrichment failed:", enrichError);
          // Return existing data if enrichment fails
          return res.json({
            success: true,
            data: {
              company: existingCompany,
              isNewData: false,
              source: 'registry'
            }
          });
        }
      }

      return res.json({
        success: true,
        data: {
          company: existingCompany,
          isNewData: false,
          source: 'registry'
        }
      });
    }

    // If company not found, search for all company data
    console.log(`[Company Search] Company not found in registry, searching for new data`);
    const newData = await findMissingCompanyData({ name: companyName }, [
      'description', 'websiteUrl', 'legalStructure', 'hqAddress',
      'productsServices', 'incorporationYear', 'foundersAndLeadership',
      'numEmployees', 'revenue', 'keyClientsPartners', 'investors',
      'fundingStage', 'exitStrategyHistory', 'certificationsCompliance'
    ]);

    // Create new company in registry
    const newCompany = await createCompany({
      ...newData,
      name: companyName,
      category: 'FinTech', // Default category
      onboardingCompanyCompleted: false
    });

    res.json({
      success: true,
      data: {
        company: newCompany,
        isNewData: true,
        source: 'new'
      }
    });

  } catch (error) {
    console.error("Company search error:", error);

    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        error: "Invalid request data",
        details: error.errors,
      });
    }

    res.status(500).json({
      success: false,
      error: "Failed to search company information",
    });
  }
});

export default router;