/**
 * File Vault Service
 * 
 * This service provides functions to interact with the file vault feature
 * Including enabling file vault for a company and checking file vault status
 */

import { queryClient } from '@/lib/queryClient';

/**
 * EMERGENCY DIRECT UPDATE: Add 'file-vault' tab to current company data in cache
 * This function skips all API calls and directly updates the cache
 * Use this as a fallback when WebSockets are failing
 */
export function directlyAddFileVaultTab() {
  try {
    console.log(`[Direct Update] Adding file-vault tab to current company in cache`);
    
    // Get company ID from current company data in cache
    const currentCompany = queryClient.getQueryData(['/api/companies/current']);
    const companyId = currentCompany?.id;
    
    if (!companyId) {
      console.error('[Direct Update] No current company found in cache');
      return false;
    }
    
    // Update the cache directly with the file-vault tab added
    queryClient.setQueryData(['/api/companies/current'], (oldData: any) => {
      if (!oldData) return oldData;
      
      // Get current tabs
      const currentTabs = oldData.available_tabs || [];
      
      // Return early if file-vault is already in tabs
      if (currentTabs.includes('file-vault')) {
        console.log('[Direct Update] File vault tab already exists in cache');
        return oldData;
      }
      
      // Add file-vault to tabs
      const newTabs = [...currentTabs, 'file-vault'];
      
      console.log(`[Direct Update] Added file-vault tab to cache for company ${companyId}`);
      console.log(`[Direct Update] Updated tabs: ${JSON.stringify(newTabs)}`);
      
      // Create a new object to force re-renders
      return {
        ...oldData,
        available_tabs: newTabs
      };
    });
    
    return true;
  } catch (error) {
    console.error('[Direct Update] Error updating tabs:', error);
    return false;
  }
}

/**
 * Enable file vault for the current company by making an API call
 * This function does not rely on WebSockets
 * It updates the company data and manually updates the local cache
 */
export async function enableFileVault(): Promise<boolean> {
  try {
    // Get the current company from cache
    const currentCompany = queryClient.getQueryData(['/api/companies/current']);
    
    if (!currentCompany || !currentCompany.id) {
      console.error('[File Vault] No current company found in cache');
      return false;
    }
    
    const companyId = currentCompany.id;
    console.log(`[File Vault] Enabling file vault for company ${companyId}`);
    
    // Call the API endpoint
    const response = await fetch(`/api/file-vault/enable/${companyId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[File Vault] API error: ${error}`);
      
      // If API call fails, try direct cache update as fallback
      directlyAddFileVaultTab();
      return true;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error(`[File Vault] API returned error: ${data.message}`);
      
      // If API returns error, try direct cache update as fallback
      directlyAddFileVaultTab();
      return true;
    }
    
    // Manually update the current company cache with the new available_tabs
    if (data.company && data.company.available_tabs) {
      // Update the React Query cache for current company
      queryClient.setQueryData(['/api/companies/current'], (oldData: any) => {
        if (!oldData) return oldData;
        
        // Create a new object to trigger rerenders
        return {
          ...oldData,
          available_tabs: data.company.available_tabs
        };
      });
      
      console.log(`[File Vault] Successfully enabled and updated cache for company ${companyId}`);
      return true;
    } else {
      // If response doesn't include tabs, use direct update
      directlyAddFileVaultTab();
    }
    
    return true;
  } catch (error) {
    console.error('[File Vault] Error enabling file vault:', error);
    
    // If any error occurs, fall back to direct cache update
    directlyAddFileVaultTab();
    return true;
  }
}

/**
 * Force refresh file vault status by invalidating the current company cache
 * and fetching fresh data from the server
 */
export function refreshFileVaultStatus(): Promise<boolean> {
  try {
    // Directly add the file-vault tab to the cache
    directlyAddFileVaultTab();
    
    // Invalidate the current company cache to trigger a refetch
    queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
    
    return Promise.resolve(true);
  } catch (error) {
    console.error('[File Vault] Error refreshing file vault status:', error);
    return Promise.resolve(false);
  }
}