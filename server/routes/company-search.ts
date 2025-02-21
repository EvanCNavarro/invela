import { Router } from "express";
import { companySearchSchema } from "../services/companySearch";
import { findCompanyInRegistry, findMissingFields, updateCompanyData } from "../services/companyMatching";
import { findMissingCompanyData } from "../services/openai";
import { ZodError } from "zod";
import { createCompany } from "../services/company";
import { ilike } from "drizzle-orm";
import { companies } from "@db/schema";
import { db } from "@db";

const router = Router();

// Full company search and enrichment
router.post("/api/company-search", async (req, res) => {
  try {
    console.log("[Company Search Debug] Received search request:", {
      body: req.body,
      headers: req.headers
    });

    const { companyName } = companySearchSchema.parse(req.body);
    console.log(`[Company Search Debug] Validated company name: ${companyName}`);

    // First try to find in database directly - case insensitive match using ilike
    console.log("[Company Search Debug] Executing database query");
    const query = db.select()
      .from(companies)
      .where(ilike(companies.name, companyName));

    console.log("[Company Search Debug] Query:", query.toSQL?.());

    const [existingCompany] = await query;
    console.log("[Company Search Debug] Database query result:", existingCompany);

    if (existingCompany) {
      console.log(`[Company Search Debug] Found existing company:`, existingCompany);

      // Find missing fields
      const missingFields = findMissingFields(existingCompany);
      console.log(`[Company Search Debug] Missing fields:`, missingFields);

      // Always try to supplement data if there are any null or empty fields
      if (missingFields.length > 0) {
        console.log(`[Company Search Debug] Found ${missingFields.length} missing fields, searching for data:`, missingFields);

        try {
          // Search for missing data using OpenAI
          const newData = await findMissingCompanyData(
            { ...existingCompany, search_type: 'company_enrichment' },
            missingFields
          );
          console.log('[Company Search Debug] Retrieved new data:', newData);

          // Format numeric fields appropriately before updating
          const formattedData = {
            ...newData,
            num_employees: newData.num_employees ? 
              parseInt(newData.num_employees.replace(/[^\d]/g, ''), 10) || null : null
          };

          // Update company with new data
          const updatedCompany = await updateCompanyData(existingCompany.id, formattedData);
          console.log('[Company Search Debug] Updated company data:', updatedCompany);

          return res.json({
            success: true,
            data: {
              company: updatedCompany,
              isNewData: true,
              source: 'registry_enriched'
            }
          });
        } catch (enrichError) {
          console.error("[Company Search Debug] Enrichment failed:", enrichError);
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

    // If company not found, search for all company data using OpenAI
    console.log(`[Company Search Debug] Company not found in registry, searching for new data`);
    const newData = await findMissingCompanyData(
      { name: companyName, search_type: 'company_creation' },
      [
        'description', 'websiteUrl', 'legalStructure', 'hqAddress',
        'productsServices', 'incorporationYear', 'foundersAndLeadership',
        'numEmployees', 'revenue', 'keyClientsPartners', 'investors',
        'fundingStage', 'exitStrategyHistory', 'certificationsCompliance'
      ]
    );

    console.log('[Company Search Debug] Retrieved new company data:', newData);

    // Format numeric fields appropriately before creating
    const formattedData = {
      ...newData,
      num_employees: newData.num_employees ? 
        parseInt(newData.num_employees.replace(/[^\d]/g, ''), 10) || null : null
    };

    // Create new company in registry
    const newCompany = await createCompany({
      ...formattedData,
      name: companyName,
      category: 'FinTech', // Default category
      onboardingCompanyCompleted: false
    });

    console.log('[Company Search Debug] Created new company:', newCompany);

    res.json({
      success: true,
      data: {
        company: newCompany,
        isNewData: true,
        source: 'new'
      }
    });

  } catch (error) {
    console.error("[Company Search Debug] Error details:", {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name
    });

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
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;