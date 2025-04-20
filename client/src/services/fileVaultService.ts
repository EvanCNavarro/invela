/**
 * FileVaultService - File vault tab enablement
 * 
 * This service provides methods to enable the file vault tab for companies
 * after a KYB form submission using proper API calls and caching strategies.
 * 
 * The service follows a UI-first approach:
 * 1. Immediately update the UI to show the File Vault tab
 * 2. Call API to make the change persistent
 * 3. Refresh data to ensure consistency
 */

import { queryClient } from "@/lib/queryClient";

/**
 * Pre-emptively unlock file vault tab in the UI
 * Call this before submitting the form to ensure the tab appears immediately
 */
export function preEmptivelyUnlockFileVault() {
  try {
    console.log('[FileVaultService] Pre-emptively unlocking file vault in UI');
    
    // Get current company data from cache
    const companyData = queryClient.getQueryData<any>(['/api/companies/current']);
    
    if (!companyData) {
      console.log('[FileVaultService] No company data in cache to update');
      return false;
    }
    
    // Check if file-vault tab is already in available_tabs
    if (Array.isArray(companyData.available_tabs) && 
        companyData.available_tabs.includes('file-vault')) {
      console.log('[FileVaultService] File vault already unlocked in UI');
      return true;
    }
    
    // Create a stable array of tabs that always includes 'file-vault'
    const currentTabs = Array.isArray(companyData.available_tabs) 
      ? companyData.available_tabs 
      : ['task-center'];
    
    const updatedTabs = [...currentTabs];
    if (!updatedTabs.includes('file-vault')) {
      updatedTabs.push('file-vault');
    }
    
    // Update the cache immediately - this is what makes the UI update instantly
    queryClient.setQueryData(['/api/companies/current'], {
      ...companyData,
      available_tabs: updatedTabs
    });
    
    console.log('[FileVaultService] Pre-emptively unlocked file vault with tabs:', updatedTabs);
    
    return true;
  } catch (error) {
    console.error('[FileVaultService] Error pre-emptively unlocking file vault:', error);
    return false;
  }
}

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

/**
 * COMPATIBILITY FUNCTION: Directly add file-vault tab to company data cache
 * This function is for backward compatibility with existing code
 * New code should use preEmptivelyUnlockFileVault instead
 */
export function directlyAddFileVaultTab() {
  return preEmptivelyUnlockFileVault();
}