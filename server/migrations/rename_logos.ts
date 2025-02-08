import { db } from "@db";
import { companies, companyLogos } from "@db/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface LogoRecord {
  id: string;
  filePath: string;
}

interface CompanyRecord {
  name: string;
}

async function renameLogo(logoRecord: LogoRecord, companyName: string) {
  const uploadDir = path.resolve('/home/runner/workspace/uploads/logos');
  const oldPath = path.resolve(uploadDir, logoRecord.filePath);

  // Generate new filename using hyphenated format
  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const newFilename = `logo_${companySlug}.svg`;
  const newPath = path.resolve(uploadDir, newFilename);

  try {
    // Rename file if it exists
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
      console.log(`Renamed file from ${oldPath} to ${newPath}`);
    } else {
      console.log(`File not found: ${oldPath}`);
    }

    // Update database record
    await db.update(companyLogos)
      .set({ 
        filePath: newFilename,
        fileName: newFilename
      })
      .where(eq(companyLogos.id, logoRecord.id));

    console.log(`Updated database record for ${companyName}`);
  } catch (error) {
    console.error(`Error processing ${companyName}:`, error);
  }
}

export async function renameLegacyLogos() {
  try {
    const result = await db.select({
      logo: companyLogos,
      company: companies
    })
    .from(companyLogos)
    .innerJoin(companies, eq(companies.id, companyLogos.companyId));

    console.log('Found logo records:', result);

    for (const record of result) {
      await renameLogo(record.logo, record.company.name);
    }

    console.log('Logo migration completed successfully');
  } catch (error) {
    console.error('Error during logo migration:', error);
  }
}
