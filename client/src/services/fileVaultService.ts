/**
 * File Vault Service
 * 
 * This service provides functions to interact with the file vault feature
 * Including enabling file vault for a company and checking file vault status
 */

import { queryClient } from '@/lib/queryClient';

/**
 * Enable file vault for the current company
 * This bypasses the WebSocket mechanism by:
 * 1. Directly calling the API endpoint
 * 2. Manually updating the React Query cache
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
      return false;
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.error(`[File Vault] API returned error: ${data.message}`);
      return false;
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
    }
    
    return data.success;
  } catch (error) {
    console.error('[File Vault] Error enabling file vault:', error);
    return false;
  }
}

/**
 * Check if file vault is enabled for the current company
 */
export async function checkFileVaultStatus(): Promise<boolean> {
  try {
    // Get the current company from cache
    const currentCompany = queryClient.getQueryData(['/api/companies/current']);
    
    if (!currentCompany || !currentCompany.id) {
      console.error('[File Vault] No current company found in cache');
      return false;
    }
    
    const companyId = currentCompany.id;
    
    // Call the API endpoint
    const response = await fetch(`/api/file-vault/status/${companyId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[File Vault] Status API error: ${error}`);
      return false;
    }
    
    const data = await response.json();
    return data.enabled || false;
  } catch (error) {
    console.error('[File Vault] Error checking file vault status:', error);
    return false;
  }
}

/**
 * Force refresh file vault status by invalidating the current company cache
 * and fetching fresh data from the server
 */
export async function refreshFileVaultStatus(): Promise<boolean> {
  try {
    // Invalidate the current company cache
    await queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
    
    // Force a refetch of the current company
    await queryClient.refetchQueries({ queryKey: ['/api/companies/current'] });
    
    // Check the status again
    return checkFileVaultStatus();
  } catch (error) {
    console.error('[File Vault] Error refreshing file vault status:', error);
    return false;
  }
}