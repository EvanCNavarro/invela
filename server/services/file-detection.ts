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
                 lowerFileName.includes('kyb') ||
                 lowerContent.includes('kyb assessment');
    
    // Detect KY3P assessment
    const isKy3p = lowerFileName.includes('spglobal_ky3p_assessment') || 
                  lowerFileName.includes('ky3p') ||
                  lowerFileName.includes('security_assessment') ||
                  lowerContent.includes('s&p ky3p security assessment');
    
    // Detect Open Banking assessment
    const isOpenBanking = lowerFileName.includes('open_banking_assessment') ||
                         lowerFileName.includes('open_banking') ||
                         lowerContent.includes('open banking survey');
    
    // Detect CARD assessment
    const isCard = lowerFileName.includes('card_assessment') ||
                  lowerFileName.includes('card') ||
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
   * Get assessment type string - simpler version for direct usage in existing code
   * Returns lowercase assessment type strings for consistency
   */
  static getAssessmentType(fileName: string, filePath?: string): string {
    const detection = this.detectAssessmentType(fileName, filePath);
    return detection.assessmentType;
  }
  
  /**
   * Helper function that can be directly used in existing code to detect
   * if a file is related to a KY3P assessment
   */
  static isKy3pFile(fileName: string, filePath?: string): boolean {
    return fileName.toLowerCase().includes('ky3p') || 
           fileName.toLowerCase().includes('spglobal') ||
           fileName.toLowerCase().includes('security_assessment') ||
           (filePath && filePath.toLowerCase().includes('s&p ky3p security assessment'));
  }
  
  /**
   * Helper function that can be directly used in existing code to detect
   * if a file is related to a KYB assessment
   */
  static isKybFile(fileName: string, filePath?: string): boolean {
    return fileName.toLowerCase().includes('kyb');
  }
  
  /**
   * Helper function that can be directly used in existing code to detect
   * if a file is related to an Open Banking assessment
   */
  static isOpenBankingFile(fileName: string, filePath?: string): boolean {
    return fileName.toLowerCase().includes('open_banking') ||
           (filePath && filePath.toLowerCase().includes('open banking survey'));
  }
  
  /**
   * Helper function that can be directly used in existing code to detect
   * if a file is related to a CARD assessment
   */
  static isCardFile(fileName: string, filePath?: string): boolean {
    return fileName.toLowerCase().includes('card_assessment') ||
           (filePath && filePath.toLowerCase().includes('card assessment'));
  }
  
  /**
   * Helper function to get the appropriate task type string for a file
   * This can be used as a direct replacement for the existing task type detection
   */
  static getTaskType(fileName: string, filePath?: string): string {
    if (this.isKybFile(fileName, filePath)) {
      return 'kyb';
    } else if (this.isKy3pFile(fileName, filePath)) {
      return 'ky3p';
    } else if (this.isOpenBankingFile(fileName, filePath)) {
      return 'open_banking';
    } else if (this.isCardFile(fileName, filePath)) {
      return 'card';
    } else {
      return 'form';
    }
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
  
  /**
   * Standardizes assessment type naming for file generation
   */
  static standardizeAssessmentTypeName(assessmentType: string): string {
    const typeMap = {
      'kyb': 'kyb_assessment',
      'ky3p': 'spglobal_ky3p_assessment', 
      'security': 'spglobal_ky3p_assessment',
      'security_assessment': 'spglobal_ky3p_assessment',
      'open_banking': 'open_banking_assessment',
      'card': 'card_assessment'
    };
    
    return typeMap[assessmentType.toLowerCase()] || assessmentType;
  }
}