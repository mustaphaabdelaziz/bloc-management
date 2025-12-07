// config/asaPricing.js
/**
 * ASA Classification Pricing Configuration
 * 
 * Flat fees per ASA class (I, II, III) split between surgeon and clinic.
 * Urgent multiplier applies to both surgeon and clinic fees when asaUrgent flag is true.
 * 
 * Classifications:
 * - ASA I: Patient in good health (normal, healthy)
 * - ASA II: Patient with mild systemic disease (well-controlled, no functional limitation)
 * - ASA III: Patient with severe systemic disease (impacts health, limits activity)
 * 
 * If surgery is urgent, the "U" flag (asaUrgent) can be set independently of status.
 */

module.exports = {
  classes: {
    I: {
      surgeonFee: 5000,  // Flat fee for surgeon (DA)
      clinicFee: 3000,   // Flat fee for clinic (DA)
    },
    II: {
      surgeonFee: 8000,
      clinicFee: 5000,
    },
    III: {
      surgeonFee: 12000,
      clinicFee: 8000,
    },
  },
  // Urgent multiplier applies when asaUrgent=true (e.g., 1.2 = 20% increase)
  urgentMultiplier: 1.2,
};
