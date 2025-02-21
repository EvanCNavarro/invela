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
    console.log("[Company Search Debug] Received search request:", {
      body: req.body,
      headers: req.headers
    });

    const { companyName } = companySearchSchema.parse(req.body);
    console.log(`[Company Search Debug] Validated company name: ${companyName}`);

    // First try to find in database directly - case insensitive match
    console.log("[Company Search Debug] Executing database query");
    const query = db.select().from(companies).where(db.sql`LOWER(name) = LOWER(${companyName})`);
    console.log("[Company Search Debug] Query:", query.toSQL());

    const [existingCompany] = await query;
    console.log("[Company Search Debug] Database query result:", existingCompany);

    if (existingCompany) {
      console.log(`[Company Search Debug] Found existing company:`, existingCompany);

      return res.json({
        success: true,
        data: {
          company: existingCompany,
          isNewData: false,
          source: 'registry'
        }
      });
    }

    console.log(`[Company Search Debug] No company found with name: ${companyName}`);
    // If company not found, return an appropriate error
    return res.status(404).json({
      success: false,
      error: "Company not found",
      details: `No company found with name: ${companyName}`
    });

  } catch (error) {
    console.error("[Company Search Debug] Error details:", {
      error,
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
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
      details: error.message
    });
  }
});

export default router;