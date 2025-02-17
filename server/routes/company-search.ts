import { Router } from "express";
import { companySearchSchema, searchCompanyInfo, googleOnlySearch, openaiOnlySearch } from "../services/companySearch";
import { ZodError } from "zod";

const router = Router();

router.post("/api/company-search", async (req, res) => {
  try {
    const { companyName } = companySearchSchema.parse(req.body);

    // Execute Google search first, as it's most reliable
    const googleResults = await googleOnlySearch(companyName);

    // Try OpenAI-based searches, but handle failures gracefully
    let hybridResults = googleResults;
    let openaiResults = null;

    try {
      // Attempt hybrid search
      hybridResults = await searchCompanyInfo(companyName);
    } catch (error) {
      console.error("Hybrid search error:", error);
      // Keep the Google results as fallback
    }

    try {
      // Attempt OpenAI-only search
      openaiResults = await openaiOnlySearch(companyName);
    } catch (error) {
      console.error("OpenAI-only search error:", error);
      // Return null for OpenAI results if it fails
    }

    res.json({
      success: true,
      data: {
        googleOnly: googleResults,
        hybrid: hybridResults,
        openaiOnly: openaiResults || {
          name: companyName,
          error: "OpenAI search temporarily unavailable"
        }
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