/**
 * ========================================
 * Accreditation Service
 * ========================================
 * 
 * Manages accreditation history tracking, expiration dates, and renewal logic
 * for Data Recipients (365-day validity) and permanent status for Data Providers/Invela.
 * 
 * Key Features:
 * - Creates accreditation history entries with expiration tracking
 * - Handles renewal logic and accreditation number incrementing
 * - Differentiates between temporary (Data Recipients) and permanent (Banks/Invela) accreditations
 * - Provides expiration checking and status validation
 * 
 * @module AccreditationService
 * @version 1.0.0
 * @since 2025-06-01
 */

import { db } from '@db';
import { companies, accreditationHistory } from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface CreateAccreditationParams {
  companyId: number;
  riskScore: number;
  riskClusters: Record<string, number>;
  category: string; // 'Bank', 'FinTech', 'Invela'
}

export interface AccreditationInfo {
  id: number;
  accreditationNumber: number;
  issuedDate: Date;
  expiresDate: Date | null;
  status: string;
  daysUntilExpiration: number | null;
  isPermanent: boolean;
}

/**
 * Accreditation Service - Handles all accreditation lifecycle operations
 */
export class AccreditationService {
  
  /**
   * Creates a new accreditation entry and updates company record
   * 
   * @param params - Accreditation creation parameters
   * @param trx - Optional transaction context
   * @returns Created accreditation history entry
   */
  static async createAccreditation(params: CreateAccreditationParams, trx?: any): Promise<AccreditationInfo> {
    const logContext = { 
      service: 'AccreditationService',
      companyId: params.companyId,
      category: params.category 
    };
    
    console.log('[AccreditationService] Creating new accreditation', logContext);
    
    // Use provided transaction or create new one
    const dbContext = trx || db;
    
    // Get current accreditation count for this company
    const company = await dbContext
      .select({ accreditation_count: companies.accreditation_count })
      .from(companies)
      .where(eq(companies.id, params.companyId))
      .limit(1);
    
    if (!company || company.length === 0) {
      throw new Error(`Company with ID ${params.companyId} not found`);
    }
    
    const currentCount = company[0].accreditation_count || 0;
    const newAccreditationNumber = currentCount + 1;
    
    // Determine expiration date based on company category
    const issuedDate = new Date();
    let expiresDate: Date | null = null;
    
    // Data Recipients (FinTech) get 365-day expiration
    // Data Providers (Banks) and Invela get permanent accreditation
    if (params.category === 'FinTech') {
      expiresDate = new Date(issuedDate);
      expiresDate.setDate(expiresDate.getDate() + 365);
    }
    
    // Create accreditation history entry
    const [newAccreditation] = await dbContext
      .insert(accreditationHistory)
      .values({
        company_id: params.companyId,
        accreditation_number: newAccreditationNumber,
        risk_score: params.riskScore,
        issued_date: issuedDate,
        expires_date: expiresDate,
        status: 'ACTIVE',
        risk_clusters: params.riskClusters
      })
      .returning();
    
    // Update company record with new accreditation info
    await dbContext
      .update(companies)
      .set({
        current_accreditation_id: newAccreditation.id,
        accreditation_count: newAccreditationNumber,
        first_accredited_date: currentCount === 0 ? issuedDate : undefined,
        accreditation_status: 'APPROVED',
        updated_at: new Date()
      })
      .where(eq(companies.id, params.companyId));
    
    console.log('[AccreditationService] Accreditation created successfully', {
      ...logContext,
      accreditationId: newAccreditation.id,
      accreditationNumber: newAccreditationNumber,
      expiresDate: expiresDate?.toISOString() || 'permanent'
    });
    
    return {
      id: newAccreditation.id,
      accreditationNumber: newAccreditationNumber,
      issuedDate,
      expiresDate,
      status: 'ACTIVE',
      daysUntilExpiration: expiresDate ? this.calculateDaysUntilExpiration(expiresDate) : null,
      isPermanent: expiresDate === null
    };
  }
  
  /**
   * Gets current accreditation information for a company
   * 
   * @param companyId - Company ID to check
   * @returns Current accreditation info or null if not found
   */
  static async getCurrentAccreditation(companyId: number): Promise<AccreditationInfo | null> {
    const result = await db
      .select({
        id: accreditationHistory.id,
        accreditation_number: accreditationHistory.accreditation_number,
        issued_date: accreditationHistory.issued_date,
        expires_date: accreditationHistory.expires_date,
        status: accreditationHistory.status
      })
      .from(accreditationHistory)
      .where(
        and(
          eq(accreditationHistory.company_id, companyId),
          eq(accreditationHistory.status, 'ACTIVE')
        )
      )
      .orderBy(desc(accreditationHistory.created_at))
      .limit(1);
    
    if (!result || result.length === 0) {
      return null;
    }
    
    const accreditation = result[0];
    const isPermanent = accreditation.expires_date === null;
    
    return {
      id: accreditation.id,
      accreditationNumber: accreditation.accreditation_number,
      issuedDate: accreditation.issued_date,
      expiresDate: accreditation.expires_date,
      status: accreditation.status,
      daysUntilExpiration: isPermanent ? null : this.calculateDaysUntilExpiration(accreditation.expires_date!),
      isPermanent
    };
  }
  
  /**
   * Checks if an accreditation is expired
   * 
   * @param companyId - Company ID to check
   * @returns True if expired, false if valid or permanent
   */
  static async isAccreditationExpired(companyId: number): Promise<boolean> {
    const accreditation = await this.getCurrentAccreditation(companyId);
    
    if (!accreditation || accreditation.isPermanent) {
      return false;
    }
    
    return accreditation.expiresDate! < new Date();
  }
  
  /**
   * Gets accreditation display text for UI components
   * 
   * @param companyId - Company ID
   * @returns Display text for accreditation status
   */
  static async getAccreditationDisplayText(companyId: number): Promise<string> {
    const accreditation = await this.getCurrentAccreditation(companyId);
    
    if (!accreditation) {
      return 'Not Accredited';
    }
    
    if (accreditation.isPermanent) {
      return 'No expiration';
    }
    
    const daysUntil = accreditation.daysUntilExpiration!;
    
    if (daysUntil < 0) {
      return 'Expired';
    } else if (daysUntil === 0) {
      return 'Expires today';
    } else if (daysUntil === 1) {
      return 'Expires tomorrow';
    } else if (daysUntil <= 30) {
      return `Expires in ${daysUntil} days`;
    } else {
      return `Expires in ${Math.ceil(daysUntil / 30)} months`;
    }
  }
  
  /**
   * Calculates days until expiration
   * 
   * @param expiresDate - Expiration date
   * @returns Number of days until expiration (negative if expired)
   */
  private static calculateDaysUntilExpiration(expiresDate: Date): number {
    const now = new Date();
    const diffTime = expiresDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Gets all accreditation history for a company
   * 
   * @param companyId - Company ID
   * @returns Array of accreditation history entries
   */
  static async getAccreditationHistory(companyId: number) {
    return await db
      .select()
      .from(accreditationHistory)
      .where(eq(accreditationHistory.company_id, companyId))
      .orderBy(desc(accreditationHistory.created_at));
  }
}