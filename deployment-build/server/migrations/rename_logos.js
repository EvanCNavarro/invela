"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renameLegacyLogos = renameLegacyLogos;
const _db_1 = require("@db");
const schema_1 = require("@db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function renameLogo(logoRecord, companyName) {
    const uploadDir = path_1.default.resolve('/home/runner/workspace/uploads/logos');
    const oldPath = path_1.default.resolve(uploadDir, logoRecord.filePath);
    // Generate new filename using hyphenated format
    const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Special handling for Invela logo variants
    const isInvela = companyName === 'Invela';
    const colorMatch = logoRecord.filePath.match(/_([a-z]+)\.svg$/i);
    const colorSuffix = colorMatch ?
        `-${colorMatch[1].toLowerCase()}` :
        (isInvela ? '_blue' : '');
    const newFilename = `logo_${companySlug}${colorSuffix}.svg`;
    const newPath = path_1.default.resolve(uploadDir, newFilename);
    try {
        // Rename file if it exists
        if (fs_1.default.existsSync(oldPath)) {
            fs_1.default.renameSync(oldPath, newPath);
            console.log(`Renamed file from ${oldPath} to ${newPath}`);
        }
        else {
            console.log(`File not found: ${oldPath}`);
        }
        // Update database record
        await _db_1.db.update(schema_1.companyLogos)
            .set({
            filePath: newFilename,
            fileName: newFilename
        })
            .where((0, drizzle_orm_1.eq)(schema_1.companyLogos.id, logoRecord.id));
        console.log(`Updated database record for ${companyName}`);
    }
    catch (error) {
        console.error(`Error processing ${companyName}:`, error);
    }
}
async function renameLegacyLogos() {
    try {
        const result = await _db_1.db.select({
            logo: schema_1.companyLogos,
            company: schema_1.companies
        })
            .from(schema_1.companyLogos)
            .innerJoin(schema_1.companies, (0, drizzle_orm_1.eq)(schema_1.companies.id, schema_1.companyLogos.companyId));
        console.log('Found logo records:', result);
        for (const record of result) {
            await renameLogo(record.logo, record.company.name);
        }
        console.log('Logo migration completed successfully');
    }
    catch (error) {
        console.error('Error during logo migration:', error);
    }
}
