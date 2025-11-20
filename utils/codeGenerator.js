/**
 * Code Generator Utility
 * Auto-generates codes for different entities following predefined patterns
 */

/**
 * Generate Fonction code: FCT0001, FCT0002, etc.
 * @param {number} count - Number of existing fonctions + 1
 * @returns {string} Generated fonction code
 */
function generateFonctionCode(count) {
  return "FCT" + String(count).padStart(4, "0");
}

/**
 * Generate Prestation code: CO-SPECIALITY_CODE-0001, etc.
 * Pattern: CO-{specialtyCode}-{sequentialNumber}
 * Example: CO-ORT-0001, CO-ORT-0002, CO-CAR-0001
 * @param {string} specialtyCode - The specialty code (e.g., "ORT", "CAR")
 * @param {number} count - Number of prestations for this specialty + 1
 * @returns {string} Generated prestation code
 */
function generatePrestationCode(specialtyCode, count) {
  const sanitizedCode = (specialtyCode || 'UNK').toUpperCase().substring(0, 3);
  return `CO-${sanitizedCode}-${String(count).padStart(4, "0")}`;
}

/**
 * Generate Surgery code: YYYY/XXXXX (e.g., 2025/00001)
 * Pattern: {currentYear}/{sequentialNumber}
 * Resets for each year
 * @param {number} year - The year (default: current year)
 * @param {number} count - Number of surgeries created this year + 1
 * @returns {string} Generated surgery code
 */
function generateSurgeryCode(year, count) {
  const surgeryYear = year || new Date().getFullYear();
  return `${surgeryYear}/${String(count).padStart(5, "0")}`;
}

module.exports = {
  generateFonctionCode,
  generatePrestationCode,
  generateSurgeryCode,
};
