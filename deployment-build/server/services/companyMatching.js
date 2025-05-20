"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMissingFields = findMissingFields;
exports.findCompanyInRegistry = findCompanyInRegistry;
exports.updateCompanyData = updateCompanyData;
exports.createCompanyInRegistry = createCompanyInRegistry;
const fuse_js_1 = __importDefault(require("fuse.js"));
const db_adapter_1 = require("../utils/db-adapter");
const drizzle_orm_1 = require("drizzle-orm");
// Options for fuzzy matching
const fuseOptions = {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true,
};
/**
 * Find missing or empty fields in a company record
 */
function findMissingFields(company) {
    console.log("[Company Matching] 🔍 Analyzing company fields for:", company.name);
    const missingFields = [];
    // Core fields that should always be present
    const requiredFields = [
        'description', 'websiteUrl', 'legalStructure', 'hqAddress',
        'productsServices', 'incorporationYear', 'foundersAndLeadership',
        'numEmployees', 'revenue', 'keyClientsPartners', 'investors',
        'fundingStage', 'exitStrategyHistory', 'certificationsCompliance'
    ];
    // Check each field
    for (const field of requiredFields) {
        const value = company[field];
        const isEmpty = value === null ||
            value === undefined ||
            (typeof value === 'string' && value.trim() === '') ||
            (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
            console.log(`[Company Matching] 🔍 Field '${field}' is ${value === null ? 'null' : value === undefined ? 'undefined' : 'empty'}`);
            missingFields.push(field);
        }
        else {
            console.log(`[Company Matching] ✓ Field '${field}' has value:`, value);
        }
    }
    console.log("[Company Matching] 📋 Missing fields detected:", missingFields);
    return missingFields;
}
/**
 * Find a company in the registry using fuzzy matching
 */
async function findCompanyInRegistry(searchName) {
    console.log("[Company Matching] 🔎 Searching registry for:", searchName);
    // Get schemas for each function call (after DB initialization)
    const { companies } = (0, db_adapter_1.getSchemas)();
    // Get all companies from the database
    const allCompanies = await (0, db_adapter_1.getDb)().select().from(companies);
    console.log("[Company Matching] 📚 Found", allCompanies.length, "companies in registry");
    // Initialize Fuse with our companies
    const fuse = new fuse_js_1.default(allCompanies, fuseOptions);
    // Search for matches
    const results = fuse.search(searchName);
    console.log("[Company Matching] 🎯 Search results:", results.length > 0 ?
        `Found match with score ${results[0]?.score}` : "No matches found");
    // If we found a good match (score < 0.3 indicates good match)
    if (results.length > 0 && results[0]?.score !== undefined && results[0].score < 0.3) {
        // Type assertion for safer access
        const matchedItem = results[0].item;
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
async function updateCompanyData(companyId, newData) {
    console.log("[Company Matching] 🔄 Updating company data for ID:", companyId);
    console.log("[Company Matching] 📝 New data to be applied:", newData);
    // Get schemas when the function is called
    const { companies } = (0, db_adapter_1.getSchemas)();
    // Update company record
    await (0, db_adapter_1.getDb)().update(companies)
        .set({
        ...newData,
        updatedAt: new Date() // Use Date object directly
    })
        .where((0, drizzle_orm_1.eq)(companies.id, companyId));
    // Return updated company
    const updatedCompany = await (0, db_adapter_1.getDb)().query.companies.findFirst({
        where: (0, drizzle_orm_1.eq)(companies.id, companyId)
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
async function createCompanyInRegistry(data) {
    console.log("[Company Matching] 🆕 Creating new company:", data.name);
    // Get schemas when the function is called
    const { companies } = (0, db_adapter_1.getSchemas)();
    const now = new Date(); // Create a single Date object for all timestamps
    const [newCompany] = await (0, db_adapter_1.getDb)().insert(companies)
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
