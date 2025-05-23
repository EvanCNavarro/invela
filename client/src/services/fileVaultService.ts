/**
 * ========================================
 * File Vault Service Module
 * ========================================
 * 
 * Enterprise file vault management service providing comprehensive
 * file vault tab enablement, access control, and security features.
 * Handles secure document storage access, company permissions, and
 * real-time UI state synchronization for enterprise file management.
 * 
 * Key Features:
 * - Secure file vault tab enablement with proper authentication
 * - Company-level access control and permission management
 * - Real-time cache synchronization and data consistency
 * - Comprehensive error handling and audit logging
 * - Enterprise-grade security and compliance features
 * 
 * Dependencies:
 * - QueryClient: Cache management and API request infrastructure
 * 
 * @module FileVaultService
 * @version 2.0.0
 * @since 2024-04-15
 */

// ========================================
// IMPORTS
// ========================================

// Query client for cache management and API request coordination
import { queryClient } from "@/lib/queryClient";

// ========================================
// CONSTANTS
// ========================================

/**
 * File vault service configuration constants
 * Defines baseline values for vault management and security
 */
const FILE_VAULT_DEFAULTS = {
  REQUEST_TIMEOUT: 30000,
  CACHE_INVALIDATION_DELAY: 1000,
  MAX_RETRY_ATTEMPTS: 3,
  VAULT_ACCESS_SCOPE: 'company'
} as const;

/**
 * File vault API endpoints for consistent request management
 * Centralizes API routes for maintainable service integration
 */
const VAULT_ENDPOINTS = {
  UNLOCK_VAULT: (companyId: number) => `/api/companies/${companyId}/unlock-file-vault`,
  COMPANY_DATA: '/api/companies',
  VAULT_STATUS: (companyId: number) => `/api/companies/${companyId}/vault-status`
} as const;

// ========================================
// SERVICE IMPLEMENTATION
// ========================================

/**
 * Enable file vault access for company with comprehensive security validation
 * 
 * Securely enables file vault tab access for a company after successful
 * KYB form submission. Implements proper authentication, cache management,
 * and real-time UI synchronization for enterprise file management workflows.
 * 
 * @param companyId Company identifier for vault access enablement
 * @returns Promise that resolves when vault access is successfully enabled
 * 
 * @throws {Error} When vault enablement fails or company validation fails
 */
export async function enableFileVault(companyId: number): Promise<void> {
  try {
    // Validate input parameters for defensive programming
    if (!companyId || typeof companyId !== 'number' || companyId <= 0) {
      throw new Error(`Invalid company ID provided for file vault enablement: ${companyId}`);
    }

    console.log(`[FileVaultService] Enabling file vault for company ${companyId}`);
    
    // Execute authenticated API request with comprehensive security headers
    const response = await fetch(VAULT_ENDPOINTS.UNLOCK_VAULT(companyId), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Request-ID': `vault-enable-${companyId}-${Date.now()}`
      }
    });
    
    // Handle error responses with detailed logging
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[FileVaultService] Failed to enable file vault for company ${companyId}: HTTP ${response.status}`, errorText);
      throw new Error(`Failed to enable file vault: ${response.status} ${errorText}`);
    }
    
    // Parse and validate response data
    const data = await response.json();
    console.log('[FileVaultService] File vault enabled successfully:', {
      companyId,
      availableTabs: data.availableTabs?.length || 0,
      timestamp: new Date().toISOString()
    });
    
    // Update cached company data for real-time UI synchronization
    if (data.availableTabs && Array.isArray(data.availableTabs)) {
      await updateCachedCompanyTabs(companyId, data.availableTabs);
    }
    
    // Invalidate and refresh company data for consistency
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
 * Update cached company data with new available tabs for real-time UI sync
 * 
 * Intelligently updates the company data cache with new tab availability
 * to provide immediate UI feedback without waiting for full data refresh.
 * Implements defensive programming with proper validation and error handling.
 * 
 * @param companyId Company identifier for cache validation
 * @param newAvailableTabs Updated array of available tab identifiers
 * @returns Promise that resolves when cache update completes
 * 
 * @throws {Error} When cache update fails or validation errors occur
 */
async function updateCachedCompanyTabs(companyId: number, newAvailableTabs: string[]): Promise<boolean> {
  try {
    // Validate input parameters for defensive programming
    if (!companyId || typeof companyId !== 'number' || companyId <= 0) {
      console.warn('[FileVaultService] Invalid company ID for cache update:', companyId);
      return false;
    }

    if (!Array.isArray(newAvailableTabs)) {
      console.warn('[FileVaultService] Invalid tabs array for cache update:', newAvailableTabs);
      return false;
    }

    // Retrieve current company data from cache with type safety
    const companyData = queryClient.getQueryData<any>(['/api/companies/current']);
    
    // Validate cached data exists and matches target company
    if (!companyData || companyData.id !== companyId) {
      console.log('[FileVaultService] No matching company data in cache to update');
      return false;
    }
    
    // Create updated company data with new tab configuration
    const updatedCompany = {
      ...companyData,
      available_tabs: newAvailableTabs,
      last_updated: new Date().toISOString()
    };
    
    // Update cache with enhanced company data
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