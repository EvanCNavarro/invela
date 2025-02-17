import { Router } from "express";
import { companySearchSchema, searchCompanyInfo } from "../services/companySearch";
import { ZodError } from "zod";

const router = Router();

router.post("/api/company-search", async (req, res) => {
  try {
    const { companyName } = companySearchSchema.parse(req.body);
    
    const companyInfo = await searchCompanyInfo(companyName);
    
    res.json({
      success: true,
      data: companyInfo,
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
