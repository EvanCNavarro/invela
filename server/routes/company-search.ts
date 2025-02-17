import { Router } from "express";
import { companySearchSchema } from "../services/companySearch";
import { findCompanyInRegistry, findMissingFields, updateCompanyData, createCompanyInRegistry } from "../services/companyMatching";
import { findMissingCompanyData } from "../services/openai";
import { ZodError } from "zod";

const router = Router();

router.post("/api/company-search", async (req, res) => {
  try {
    const { companyName } = companySearchSchema.parse(req.body);
    console.log(`[Company Search] Starting search for: ${companyName}`);

    // Step 1: Try to find company in registry
    const registryResult = await findCompanyInRegistry(companyName);
    let companyData;
    let isNewData = false;

    if (registryResult.found && registryResult.company) {
      console.log(`[Company Search] Found existing company: ${registryResult.company.name}`);

      // Find missing fields
      const missingFields = findMissingFields(registryResult.company);

      // Always try to supplement data if there are any null or empty fields
      if (missingFields.length > 0) {
        console.log(`[Company Search] Found ${missingFields.length} missing fields, searching for data:`, missingFields);

        // Search for missing data
        const newData = await findMissingCompanyData(registryResult.company, missingFields);
        console.log('[Company Search] Retrieved new data from OpenAI:', newData);

        // Update company with new data
        companyData = await updateCompanyData(registryResult.company.id, newData);
        isNewData = true;
      } else {
        companyData = registryResult.company;
      }
    } else {
      console.log(`[Company Search] Company not found in registry, searching for new data`);

      // Search for all company data
      const newData = await findMissingCompanyData({ name: companyName }, [
        'description', 'websiteUrl', 'legalStructure', 'hqAddress', 
        'productsServices', 'incorporationYear', 'foundersAndLeadership',
        'numEmployees', 'revenue', 'keyClientsPartners', 'investors',
        'fundingStage', 'exitStrategyHistory', 'certificationsCompliance'
      ]);

      // Create new company in registry
      companyData = await createCompanyInRegistry({
        ...newData,
        name: companyName,
        category: 'FinTech', // Default category
        onboardingCompanyCompleted: false
      });
      isNewData = true;
    }

    res.json({
      success: true,
      data: {
        company: companyData,
        isNewData,
        source: registryResult.found ? 'registry' : 'new'
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