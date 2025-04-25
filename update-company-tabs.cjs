/**
 * Update Company Tabs Script
 * 
 * This script updates the available_tabs array for existing Invela and Bank companies
 * to include the new "Claims" and "S&P Risk Score" tabs.
 */

const { db } = require("@db");
const { companies } = require("@db/schema");
const { eq, sql } = require("drizzle-orm");

async function updateCompanyTabs() {
  try {
    console.log("[Update Tabs] Starting update of available_tabs for Invela and Bank companies");

    // Update Invela companies
    const [invelaCompanies] = await db.execute(sql`
      UPDATE companies 
      SET available_tabs = array_append(array_append(available_tabs, 'claims'), 'risk-score')
      WHERE category = 'Invela'
      AND NOT ('claims' = ANY(available_tabs))
      RETURNING id, name, available_tabs;
    `);

    console.log(`[Update Tabs] Updated ${invelaCompanies?.rowCount || 0} Invela companies`);

    // Update Bank companies
    const [bankCompanies] = await db.execute(sql`
      UPDATE companies 
      SET available_tabs = array_append(array_append(available_tabs, 'claims'), 'risk-score')
      WHERE category = 'Bank'
      AND NOT ('claims' = ANY(available_tabs))
      RETURNING id, name, available_tabs;
    `);

    console.log(`[Update Tabs] Updated ${bankCompanies?.rowCount || 0} Bank companies`);

    // Broadcast WebSocket updates for all affected companies
    const combinedRows = [...(invelaCompanies?.rows || []), ...(bankCompanies?.rows || [])];
    
    for (const company of combinedRows) {
      try {
        console.log(`[Update Tabs] Broadcasting update for company ${company.id}: ${company.name}`);
        
        // Check if WebSocket service is available
        const websocketService = require("./server/services/websocket");
        if (websocketService && typeof websocketService.broadcastCompanyTabsUpdate === 'function') {
          websocketService.broadcastCompanyTabsUpdate(company.id, company.available_tabs, {
            cache_invalidation: true,
            source: "migrations"
          });
        } else {
          console.log(`[Update Tabs] WebSocket service not available, skipping broadcast for company ${company.id}`);
        }
      } catch (err) {
        console.error(`[Update Tabs] Error broadcasting for company ${company.id}:`, err);
      }
    }

    console.log("[Update Tabs] Successfully completed company tabs update");
  } catch (error) {
    console.error("[Update Tabs] Error updating company tabs:", error);
    throw error;
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  updateCompanyTabs()
    .then(() => {
      console.log("[Update Tabs] Successfully completed company tabs update");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[Update Tabs] Failed to update company tabs:", error);
      process.exit(1);
    });
}