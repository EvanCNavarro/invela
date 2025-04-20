/**
 * FileVaultService - Reliable file vault tab enablement
 * 
 * This service provides multiple redundant methods to ensure the file vault tab
 * becomes visible after a KYB form submission, handling edge cases where:
 * 
 * 1. WebSocket connections fail (common in secure environments)
 * 2. Cache invalidation doesn't properly update UI components
 * 3. Server-side database updates happen but don't propagate to the UI
 * 
 * The service uses a multi-layered approach:
 * - Direct API calls to enable the file vault tab
 * - Cache manipulation to force tab visibility
 * - Multiple refresh strategies with error handling
 */

import { queryClient } from '@/lib/queryClient';

/**
 * Enable file vault tab via direct API call
 * This is the most reliable method as it directly updates the database
 */
export async function enableFileVault() {
  try {
    const company = await getCurrentCompany();
    if (!company) {
      throw new Error('Cannot enable file vault: No current company found');
    }
    
    console.log(`[FileVaultService] Enabling file vault for company ID ${company.id}`);
    
    // Make direct API call to server endpoint
    const response = await fetch(`/api/companies/${company.id}/unlock-file-vault`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for session cookies
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`[FileVaultService] File vault enablement successful:`, result);
    
    // Invalidate the company cache to ensure UI updates
    await refreshCompanyData();
    
    return result;
  } catch (error) {
    console.error('[FileVaultService] Failed to enable file vault via API:', error);
    throw error;
  }
}

/**
 * Get the current company data from the cache
 */
async function getCurrentCompany() {
  try {
    const companyData = queryClient.getQueryData<any>(['/api/companies/current']);
    if (companyData) {
      return companyData;
    }
    
    // If no data in cache, fetch it directly
    console.log('[FileVaultService] No company data in cache, fetching fresh data');
    const response = await fetch('/api/companies/current', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch current company: ${response.status}`);
    }
    
    const freshData = await response.json();
    queryClient.setQueryData(['/api/companies/current'], freshData);
    return freshData;
  } catch (error) {
    console.error('[FileVaultService] Error getting current company:', error);
    return null;
  }
}

/**
 * Directly add the file-vault tab to the company data in the cache
 * This bypasses server communication entirely
 */
export function directlyAddFileVaultTab() {
  try {
    const company = queryClient.getQueryData<any>(['/api/companies/current']);
    if (!company) {
      console.warn('[FileVaultService] Cannot add file vault tab: No current company in cache');
      return;
    }
    
    console.log(`[FileVaultService] Directly adding file-vault tab to company ${company.id} in cache`);
    
    // Clone the company data to avoid mutation issues
    const updatedCompany = { ...company };
    
    // Ensure available_tabs exists
    if (!updatedCompany.available_tabs) {
      updatedCompany.available_tabs = [];
    }
    
    // Only add the tab if it's not already present
    if (!updatedCompany.available_tabs.includes('file-vault')) {
      updatedCompany.available_tabs = [...updatedCompany.available_tabs, 'file-vault'];
      console.log(`[FileVaultService] Added file-vault tab to available_tabs:`, updatedCompany.available_tabs);
    } else {
      console.log(`[FileVaultService] file-vault tab already present in cache`);
    }
    
    // Update the cache with our modified company data
    queryClient.setQueryData(['/api/companies/current'], updatedCompany);
    
    // Also set cache invalidation timestamp to force components to re-render
    if (!updatedCompany.cache_invalidation) {
      updatedCompany.cache_invalidation = new Date().toISOString();
    }
    
    return updatedCompany;
  } catch (error) {
    console.error('[FileVaultService] Error directly adding file vault tab:', error);
    throw error;
  }
}

/**
 * Refresh file vault status by checking the current status and forcing an update if needed
 */
export async function refreshFileVaultStatus() {
  try {
    // First get current company data
    const company = await getCurrentCompany();
    if (!company) {
      throw new Error('Cannot refresh file vault status: No current company found');
    }
    
    console.log(`[FileVaultService] Refreshing file vault status for company ${company.id}`);
    
    // Check if file vault tab is already available
    if (company.available_tabs && company.available_tabs.includes('file-vault')) {
      console.log('[FileVaultService] File vault tab already enabled, refreshing cache anyway');
      
      // Still refresh the company data to ensure consistency
      await refreshCompanyData();
      return company;
    }
    
    // If not available, force enable it via API call
    console.log('[FileVaultService] File vault tab not found, enabling it now');
    return await enableFileVault();
  } catch (error) {
    console.error('[FileVaultService] Error refreshing file vault status:', error);
    throw error;
  }
}

/**
 * Completely refresh company data in the cache
 */
async function refreshCompanyData() {
  try {
    console.log('[FileVaultService] Refreshing company data in cache');
    
    // First remove the current company data from cache
    queryClient.removeQueries({ 
      queryKey: ['/api/companies/current'],
      exact: true 
    });
    
    // Then force a refetch of active queries
    await queryClient.refetchQueries({
      queryKey: ['/api/companies/current'],
      exact: true,
      type: 'active'
    });
    
    // Also invalidate all company-related queries
    queryClient.invalidateQueries({
      queryKey: ['/api/companies'],
      exact: false, // Invalidate all company-related queries
    });
    
    console.log('[FileVaultService] Company data cache successfully refreshed');
  } catch (error) {
    console.error('[FileVaultService] Error refreshing company data:', error);
    throw error;
  }
}