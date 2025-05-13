/**
 * Open Banking Risk Score and Clusters Calculation
 * 
 * This module provides functions for calculating risk scores and risk clusters
 * for Open Banking submissions. It's designed to work with both the form handler
 * and direct database operations.
 */

/**
 * Calculate risk clusters based on the total risk score
 * 
 * This function distributes the risk score across different risk categories
 * with higher weightage given to PII Data and Account Data categories.
 * 
 * @param {number} riskScore The total risk score (0-100)
 * @returns {Object} An object containing risk scores distributed across categories
 */
function calculateRiskClusters(riskScore) {
  // Base distribution weights for each category
  const weights = {
    "PII Data": 0.35,           // 35% of total score
    "Account Data": 0.30,        // 30% of total score
    "Data Transfers": 0.10,      // 10% of total score
    "Certifications Risk": 0.10, // 10% of total score
    "Security Risk": 0.10,       // 10% of total score
    "Financial Risk": 0.05       // 5% of total score
  };
  
  // Calculate base values for each category
  let clusters = {
    "PII Data": Math.round(riskScore * weights["PII Data"]),
    "Account Data": Math.round(riskScore * weights["Account Data"]),
    "Data Transfers": Math.round(riskScore * weights["Data Transfers"]),
    "Certifications Risk": Math.round(riskScore * weights["Certifications Risk"]),
    "Security Risk": Math.round(riskScore * weights["Security Risk"]),
    "Financial Risk": Math.round(riskScore * weights["Financial Risk"])
  };
  
  // Ensure the sum equals the total risk score by adjusting the main categories
  const sum = Object.values(clusters).reduce((total, value) => total + value, 0);
  const diff = riskScore - sum;
  
  // If there's a difference, adjust the main categories to match the total
  if (diff !== 0) {
    // If positive, add to the highest weighted categories
    // If negative, subtract from them
    if (diff > 0) {
      clusters["PII Data"] += Math.ceil(diff * 0.6);
      clusters["Account Data"] += Math.floor(diff * 0.4);
    } else {
      const absDiff = Math.abs(diff);
      clusters["PII Data"] -= Math.ceil(absDiff * 0.6);
      clusters["Account Data"] -= Math.floor(absDiff * 0.4);
    }
  }
  
  // Ensure no negative values
  for (const key in clusters) {
    clusters[key] = Math.max(0, clusters[key]);
  }
  
  return clusters;
}

/**
 * Generate a risk score for Open Banking submission
 * 
 * This is a simpler function that generates a random risk score
 * between 5 and 95 for Open Banking submissions.
 * 
 * @returns {number} Random risk score between 5 and 95
 */
function generateRandomRiskScore() {
  return Math.floor(Math.random() * (95 - 5 + 1)) + 5;
}

// Export functions
module.exports = {
  calculateRiskClusters,
  generateRandomRiskScore
};