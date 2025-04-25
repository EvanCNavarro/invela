import { Request, Response } from "express";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { broadcastCompanyTabsUpdate } from "../services/websocket";

export async function updateClaimsAndRiskScoreTabs(req: Request, res: Response) {
  try {
    console.log("[Update Tabs API] Starting update of available_tabs for Invela and Bank companies");

    // Update Invela companies
    const [invelaResult] = await db.execute(sql`
      UPDATE companies 
      SET available_tabs = array_append(array_append(available_tabs, 'claims'), 'risk-score')
      WHERE category = 'Invela'
      AND NOT ('claims' = ANY(available_tabs))
      RETURNING id, name, available_tabs;
    `);

    console.log(`[Update Tabs API] Updated ${invelaResult?.rowCount || 0} Invela companies`);

    // Update Bank companies
    const [bankResult] = await db.execute(sql`
      UPDATE companies 
      SET available_tabs = array_append(array_append(available_tabs, 'claims'), 'risk-score')
      WHERE category = 'Bank'
      AND NOT ('claims' = ANY(available_tabs))
      RETURNING id, name, available_tabs;
    `);

    console.log(`[Update Tabs API] Updated ${bankResult?.rowCount || 0} Bank companies`);

    // Combine results
    const updatedCompanies = [
      ...(invelaResult?.rows || []),
      ...(bankResult?.rows || [])
    ];

    // Log all updated companies
    for (const company of updatedCompanies) {
      console.log(`[Update Tabs API] Company "${company.name}" (ID: ${company.id}) updated with tabs: ${company.available_tabs.join(', ')}`);
      
      // Try to broadcast the update
      try {
        broadcastCompanyTabsUpdate(company.id, company.available_tabs, {
          cache_invalidation: true,
          source: "api_endpoint"
        });
      } catch (error) {
        console.error("[Update Tabs API] Error broadcasting update:", error);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Updated ${updatedCompanies.length} companies`,
      updatedCompanies: updatedCompanies.map(c => ({ id: c.id, name: c.name }))
    });
  } catch (error) {
    console.error("[Update Tabs API] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update company tabs",
      error: error.message
    });
  }
}