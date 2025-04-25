/**
 * Update Company Tabs Script
 * 
 * This script updates the available_tabs array for existing Invela and Bank companies
 * to include the new "Claims" and "S&P Risk Score" tabs.
 */

// Direct import from the database module
const { db, pool } = require('./db/index');
const { sql } = require('drizzle-orm');

async function updateCompanyTabs() {
  try {
    console.log("[Update Tabs] Starting update of available_tabs for Invela and Bank companies");

    // Update Invela companies
    const [invelaResult] = await db.execute(sql`
      UPDATE companies 
      SET available_tabs = array_append(array_append(available_tabs, 'claims'), 'risk-score')
      WHERE category = 'Invela'
      AND NOT ('claims' = ANY(available_tabs))
      RETURNING id, name, available_tabs;
    `);

    console.log(`[Update Tabs] Updated ${invelaResult?.rowCount || 0} Invela companies`);

    // Update Bank companies
    const [bankResult] = await db.execute(sql`
      UPDATE companies 
      SET available_tabs = array_append(array_append(available_tabs, 'claims'), 'risk-score')
      WHERE category = 'Bank'
      AND NOT ('claims' = ANY(available_tabs))
      RETURNING id, name, available_tabs;
    `);

    console.log(`[Update Tabs] Updated ${bankResult?.rowCount || 0} Bank companies`);

    // Combine results
    const updatedCompanies = [
      ...(invelaResult?.rows || []),
      ...(bankResult?.rows || [])
    ];

    console.log(`[Update Tabs] Total companies updated: ${updatedCompanies.length}`);
    
    // Log all updated companies
    for (const company of updatedCompanies) {
      console.log(`[Update Tabs] Company "${company.name}" (ID: ${company.id}) updated with tabs: ${company.available_tabs.join(', ')}`);
    }

    // Try to broadcast updates if WebSocket service is available
    try {
      const websocketService = require('./server/services/websocket');
      
      if (websocketService && typeof websocketService.broadcastCompanyTabsUpdate === 'function') {
        console.log("[Update Tabs] Broadcasting WebSocket updates...");
        
        for (const company of updatedCompanies) {
          try {
            websocketService.broadcastCompanyTabsUpdate(company.id, company.available_tabs, {
              cache_invalidation: true,
              source: "migrations"
            });
            console.log(`[Update Tabs] Broadcast update for company ${company.id}`);
          } catch (err) {
            console.error(`[Update Tabs] Error broadcasting for company ${company.id}:`, err);
          }
        }
      } else {
        console.log("[Update Tabs] WebSocket broadcast service not available, skipping broadcasts");
      }
    } catch (err) {
      console.log("[Update Tabs] WebSocket module not available, skipping broadcasts:", err.message);
    }

    console.log("[Update Tabs] Successfully completed company tabs update");
    return updatedCompanies;
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

module.exports = { updateCompanyTabs };