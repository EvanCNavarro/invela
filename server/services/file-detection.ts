/**
 * File Detection and Type Classification Service
 * 
 * This service provides functions to detect file types and classify assessment types
 * based on filename and content. It ensures consistent naming and handling across
 * all assessment types (KYB, KY3P, Open Banking, CARD).
 */

export class FileDetectionService {
  /**
   * Detect assessment type from filename and content
   * Supports all assessment types with a unified approach
   */
  static detectAssessmentType(
    fileName: string,
    content?: string
  ): {
    assessmentType: string;
    isKyb: boolean;
    isKy3p: boolean;
    isOpenBanking: boolean;
    isCard: boolean;
  } {
    const lowerFileName = fileName.toLowerCase();
    const lowerContent = content ? content.toLowerCase() : '';
    
    // Detect KYB assessment
    const isKyb = lowerFileName.includes('kyb_assessment') || 
                 lowerFileName.includes('kyb_form') ||
                 lowerContent.includes('kyb assessment');
    
    // Detect KY3P assessment
    const isKy3p = lowerFileName.includes('spglobal_ky3p_assessment') || 
                  lowerFileName.includes('ky3p') ||
                  lowerFileName.includes('security_assessment') ||
                  lowerContent.includes('s&p ky3p security assessment');
    
    // Detect Open Banking assessment
    const isOpenBanking = lowerFileName.includes('open_banking_assessment') ||
                         lowerContent.includes('open banking survey');
    
    // Detect CARD assessment
    const isCard = lowerFileName.includes('card_assessment') ||
                  lowerContent.includes('card assessment');
    
    // Determine assessment type based on detection results
    let assessmentType = 'form'; // Default
    
    if (isKyb) {
      assessmentType = 'kyb';
    } else if (isKy3p) {
      assessmentType = 'ky3p';
    } else if (isOpenBanking) {
      assessmentType = 'open_banking';
    } else if (isCard) {
      assessmentType = 'card';
    }
    
    return {
      assessmentType,
      isKyb,
      isKy3p,
      isOpenBanking,
      isCard
    };
  }
  
  /**
   * Checks if the file is a CSV file containing form data
   */
  static isFormCsvFile(fileName: string, fileType: string): boolean {
    const lowerFileName = fileName.toLowerCase();
    const isCSV = fileType === 'text/csv' || fileType === 'text/plain';
    
    const isAssessmentFile = 
      lowerFileName.includes('kyb_assessment') || 
      lowerFileName.includes('kyb_form') ||
      lowerFileName.includes('spglobal_ky3p_assessment') || 
      lowerFileName.includes('ky3p') ||
      lowerFileName.includes('security_assessment') ||
      lowerFileName.includes('open_banking_assessment') ||
      lowerFileName.includes('card_assessment');
    
    return isCSV && isAssessmentFile;
  }
  
  /**
   * Checks if the file path contains CSV content
   */
  static containsCsvContent(content?: string): boolean {
    if (!content) return false;
    
    // CSV content typically has commas or starts with a header row
    return (
      content.includes(',') || 
      content.startsWith('Field') || 
      content.startsWith('Question') ||
      content.startsWith('"Question')
    );
  }
}