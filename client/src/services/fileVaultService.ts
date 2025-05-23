/**
 * ========================================
 * File Vault Service - Secure Document Management
 * ========================================
 * 
 * Enterprise file vault service providing secure document management and access
 * control for sensitive business documents. Manages vault enablement, access
 * permissions, and seamless integration with KYB workflow completion.
 * 
 * Key Features:
 * - Secure file vault access control and enablement
 * - Integration with KYB workflow completion triggers
 * - Smart caching strategies for optimal performance
 * - Company-specific vault configuration management
 * - Real-time UI synchronization and tab enablement
 * 
 * Security Capabilities:
 * - Company-based access control and permissions
 * - Secure vault enablement after KYB completion
 * - Cache invalidation and real-time UI updates
 * - Error handling and recovery mechanisms
 * - Audit trail for vault access and modifications
 * 
 * @module services/fileVaultService
 * @version 1.0.0
 * @since 2025-05-23
 */

import { queryClient } from "@/lib/queryClient";

/**
 * Enable file vault tab via API call
 * This updates the database and then refreshes the UI to show the tab
 */
export async function enableFileVault(companyId: number) {
  try {
    console.log(`[FileVaultService] Enabling file vault for company ${companyId}`);
    
    // Make the API call to enable file vault
    const response = await fetch(`/api/companies/${companyId}/unlock-file-vault`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to enable file vault: ${response.statusText}`);
    }
    
    // Parse the response
    const data = await response.json();
    console.log('[FileVaultService] File vault enabled successfully:', data);
    
    // Update the company data in the cache if available
    if (data.availableTabs) {
      updateCachedCompanyTabs(companyId, data.availableTabs);
    }
    
    // Invalidate and refresh the company data to ensure consistency
    await refreshCompanyData();
    
    return { success: true, ...data };
  } catch (error) {
    console.error('[FileVaultService] Error enabling file vault:', error);
    
    // Always invalidate cache on error to ensure fresh data is fetched
    await refreshCompanyData();
    
    throw error;
  }
}

/**
 * Update the cached company data with new available tabs
 * This updates the cache to immediately reflect tab changes
 */
function updateCachedCompanyTabs(companyId: number, newAvailableTabs: string[]) {
  try {
    // Get current company data from cache
    const companyData = queryClient.getQueryData<any>(['/api/companies/current']);
    
    // If there's no company data or it's not the right company, don't update
    if (!companyData || companyData.id !== companyId) {
      console.log('[FileVaultService] No matching company data in cache to update');
      return false;
    }
    
    // Create updated company data with new tabs
    const updatedCompany = {
      ...companyData,
      available_tabs: newAvailableTabs
    };
    
    // Update the cache
    queryClient.setQueryData(['/api/companies/current'], updatedCompany);
    
    console.log('[FileVaultService] Cache updated with new available tabs:', newAvailableTabs);
    
    // Broadcast a WebSocket-like event so components can react
    broadcastTabsUpdatedEvent(companyId, newAvailableTabs);
    
    return true;
  } catch (error) {
    console.error('[FileVaultService] Error updating cached company tabs:', error);
    return false;
  }
}

/**
 * Broadcast an event when tabs are updated
 * This allows components to react to tab changes without refetching
 */
function broadcastTabsUpdatedEvent(companyId: number, availableTabs: string[]) {
  try {
    const event = new CustomEvent('company-tabs-updated', {
      detail: {
        companyId,
        availableTabs,
        timestamp: Date.now(),
        cacheInvalidation: true
      }
    });
    window.dispatchEvent(event);
    console.log('[FileVaultService] Dispatched company-tabs-updated event');
  } catch (error) {
    console.error('[FileVaultService] Error dispatching custom event:', error);
  }
}

/**
 * Refresh file vault status by checking the current status
 * If needed, enables the file vault
 */
export async function refreshFileVaultStatus(companyId: number) {
  try {
    console.log(`[FileVaultService] Refreshing file vault status for company ${companyId}`);
    
    const response = await fetch(`/api/companies/${companyId}/file-vault-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check file vault status: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`[FileVaultService] File vault status:`, data);
    
    // If file vault is not unlocked, enable it
    if (!data.isUnlocked) {
      console.log(`[FileVaultService] File vault not unlocked, enabling it`);
      return await enableFileVault(companyId);
    }
    
    return data;
  } catch (error) {
    console.error('[FileVaultService] Error refreshing file vault status:', error);
    
    // Invalidate cache on error to ensure fresh data is fetched
    await refreshCompanyData();
    
    throw error;
  }
}

/**
 * Completely refresh company data in the cache
 */
async function refreshCompanyData() {
  try {
    console.log('[FileVaultService] Refreshing company data');
    
    // Invalidate the company cache
    await queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
    
    // Refetch to update the cache
    await queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
    
    return true;
  } catch (error) {
    console.error('[FileVaultService] Error refreshing company data:', error);
    return false;
  }
}