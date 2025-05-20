"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companySearch_1 = require("../services/companySearch");
const companyMatching_1 = require("../services/companyMatching");
const openai_1 = require("../services/openai");
const zod_1 = require("zod");
const company_1 = require("../services/company");
const drizzle_orm_1 = require("drizzle-orm");
const db_adapter_1 = require("../utils/db-adapter");
const router = (0, express_1.Router)();
// Utility function to convert camelCase to snake_case for database fields
const convertToSnakeCase = (data) => {
    const converted = {};
    Object.entries(data).forEach(([key, value]) => {
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        // Handle special case for numEmployees -> num_employees
        if (key === 'numEmployees') {
            converted.num_employees = value ? parseInt(String(value).replace(/[^\d]/g, ''), 10) || null : null;
        }
        else if (Array.isArray(value)) {
            // Convert arrays to PostgreSQL array format
            converted[snakeKey] = `{${value.map(v => `"${v}"`).join(',')}}`;
        }
        else {
            converted[snakeKey] = value;
        }
    });
    return converted;
};
// Utility function to format response data for frontend
const formatResponseData = (data) => {
    console.log("[Company Search Debug] Formatting response data for frontend:", data);
    const formatted = {
        ...data,
        // Convert PostgreSQL arrays back to JS arrays
        products_services: Array.isArray(data.products_services)
            ? data.products_services
            : data.products_services?.replace(/[{}]/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
        key_clients_partners: Array.isArray(data.key_clients_partners)
            ? data.key_clients_partners
            : data.key_clients_partners?.replace(/[{}]/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, '')),
        certifications_compliance: Array.isArray(data.certifications_compliance)
            ? data.certifications_compliance
            : data.certifications_compliance?.replace(/[{}]/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
    };
    console.log("[Company Search Debug] Formatted data:", formatted);
    return formatted;
};
// Full company search and enrichment
router.post("/api/company-search", async (req, res) => {
    try {
        console.log("[Company Search Debug] Received search request:", {
            body: req.body,
            headers: req.headers
        });
        const { companyName } = companySearch_1.companySearchSchema.parse(req.body);
        console.log(`[Company Search Debug] Validated company name: ${companyName}`);
        // Get database and schema references
        const { companies } = (0, db_adapter_1.getSchemas)();
        const db = (0, db_adapter_1.getDb)();
        // First try to find in database directly
        console.log("[Company Search Debug] Executing database query");
        const [existingCompany] = await db.select().from(companies).where((0, drizzle_orm_1.ilike)(companies.name, companyName));
        console.log("[Company Search Debug] Database query result:", existingCompany);
        if (existingCompany) {
            console.log(`[Company Search Debug] Found existing company:`, existingCompany);
            // Find missing fields
            const missingFields = (0, companyMatching_1.findMissingFields)(existingCompany);
            console.log(`[Company Search Debug] Missing fields:`, missingFields);
            // Always try to supplement data if there are any null or empty fields
            if (missingFields.length > 0) {
                console.log(`[Company Search Debug] Found ${missingFields.length} missing fields, searching for data:`, missingFields);
                try {
                    // Search for missing data using OpenAI
                    const newData = await (0, openai_1.findMissingCompanyData)({
                        ...existingCompany,
                        search_type: 'company_enrichment'
                    }, missingFields);
                    console.log('[Company Search Debug] Retrieved new data:', newData);
                    // Format and convert the data to match database schema
                    const formattedData = convertToSnakeCase(newData);
                    console.log('[Company Search Debug] Formatted data for storage:', formattedData);
                    // Update company with new data
                    const updatedCompany = await (0, companyMatching_1.updateCompanyData)(existingCompany.id, formattedData);
                    console.log('[Company Search Debug] Updated company data:', updatedCompany);
                    return res.json({
                        success: true,
                        data: {
                            company: formatResponseData(updatedCompany),
                            isNewData: true,
                            source: 'registry_enriched',
                            searchComplete: true // Add flag to indicate search completion
                        }
                    });
                }
                catch (enrichError) {
                    console.error("[Company Search Debug] Enrichment failed:", enrichError);
                    // Return existing data if enrichment fails
                    return res.json({
                        success: true,
                        data: {
                            company: formatResponseData(existingCompany),
                            isNewData: false,
                            source: 'registry',
                            searchComplete: true
                        }
                    });
                }
            }
            return res.json({
                success: true,
                data: {
                    company: formatResponseData(existingCompany),
                    isNewData: false,
                    source: 'registry',
                    searchComplete: true
                }
            });
        }
        // If company not found, search for all company data using OpenAI
        console.log(`[Company Search Debug] Company not found in registry, searching for new data`);
        const newData = await (0, openai_1.findMissingCompanyData)({ name: companyName, search_type: 'company_creation' }, [
            'description', 'websiteUrl', 'legalStructure', 'hqAddress',
            'productsServices', 'incorporationYear', 'foundersAndLeadership',
            'numEmployees', 'revenue', 'keyClientsPartners', 'investors',
            'fundingStage', 'exitStrategyHistory', 'certificationsCompliance'
        ]);
        console.log('[Company Search Debug] Retrieved new company data:', newData);
        // Format and convert the data to match database schema
        const formattedData = convertToSnakeCase(newData);
        console.log('[Company Search Debug] Formatted data for storage:', formattedData);
        // Create new company in registry
        const newCompany = await (0, company_1.createCompany)({
            ...formattedData,
            name: companyName,
            category: 'FinTech', // Default category
            onboardingCompanyCompleted: false
        });
        console.log('[Company Search Debug] Created new company:', newCompany);
        res.json({
            success: true,
            data: {
                company: formatResponseData(newCompany),
                isNewData: true,
                source: 'new',
                searchComplete: true
            }
        });
    }
    catch (error) {
        console.error("[Company Search Debug] Error details:", {
            error,
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            type: error?.constructor?.name
        });
        if (error instanceof zod_1.ZodError) {
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
exports.default = router;
