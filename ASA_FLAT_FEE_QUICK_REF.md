# ASA Flat Fee - Quick Reference

**Status:** ✅ Implemented & Ready  
**Date:** December 6, 2025

---

## 🎯 What Changed?

### Before (Complex)
```
ASA Class I:
  - Surgeon Fee: 5,000 DA
  - Clinic Fee: 3,000 DA
  - Urgent Multiplier: 1.2x
  - Applied to: Both contract types
```

### After (Simple)
```
ASA Class I:
  - Single Fee: 5,000 DA
  - Paid by: Location surgeons only
  - Received by: Clinic
  - No multipliers
```

---

## 💰 Default Fee Structure

| ASA Class | Fee Amount | Description |
|-----------|------------|-------------|
| **I**     | 5,000 DA   | Patient en bonne santé |
| **II**    | 7,000 DA   | Maladie systémique légère |
| **III**   | 8,000 DA   | Maladie systémique grave |

---

## 🔄 Contract Type Rules

### Location Contract ✅
- **ASA applies:** Yes
- **Surgeon pays:** Full fee to clinic
- **Example:** ASA II = 7,000 DA added to clinic revenue

### Percentage Contract ❌
- **ASA applies:** No
- **Surgeon pays:** Nothing
- **Example:** ASA II = 0 DA (ignored)

---

## 🛠️ How to Adjust Fees

### For Admins
1. Go to **Gestion des Tarifs ASA** (`/asa-pricing`)
2. Click **Modifier les Tarifs** on any class
3. Update the **Frais ASA (DA)** field
4. Click **Enregistrer les Modifications**
5. ✅ Done! New fee applies immediately to future surgeries

### Access Requirements
- Role: `admin` or `direction`
- URL: `/asa-pricing`

---

## 📊 Fee Calculation Examples

### Example 1: Location + ASA II
```javascript
Surgery Details:
- Surgeon: Location contract
- ASA Class: II (7,000 DA)
- Duration: 2 hours

Calculation:
clinicAmount = locationCost + materials + personalFees + asaFee
clinicAmount = 20,000 + 5,000 + 8,000 + 7,000 = 40,000 DA
surgeonAmount = 0 (location contract)
```

### Example 2: Percentage + ASA II
```javascript
Surgery Details:
- Surgeon: Percentage contract (45%)
- ASA Class: II (ignored)
- Prestation: 100,000 DA

Calculation:
surgeonAmount = 100,000 × 0.45 = 45,000 DA
clinicAmount = 100,000 × 0.55 = 55,000 DA
// No ASA fee added - percentage contract
```

### Example 3: Location + No ASA
```javascript
Surgery Details:
- Surgeon: Location contract
- ASA Class: None
- Duration: 1 hour

Calculation:
clinicAmount = locationCost + materials + personalFees + 0
// No ASA fee - no class specified
```

---

## 🔧 Technical Reference

### Model: `AsaPricing`
```javascript
{
  class: "I" | "II" | "III",
  fee: Number,              // Single flat fee
  description: String,
  isActive: Boolean
}
```

### Get Pricing
```javascript
const pricing = await AsaPricing.getPricingByClass("II");
// Returns: { fee: 7000, description: "...", ... }
```

### Fee Calculation (Location Only)
```javascript
let asaFee = 0;
if (surgeon.contractType === "location" && surgery.asaClass) {
  const config = await AsaPricing.getPricingByClass(surgery.asaClass);
  asaFee = config.fee || 0;
}
clinicAmount += asaFee;
```

---

## 🧪 Testing Checklist

### Test 1: Location + ASA
- [x] Create surgery with location surgeon + ASA II
- [x] Verify clinic receives +7,000 DA
- [x] Verify surgeon amount = 0

### Test 2: Percentage + ASA
- [x] Create surgery with percentage surgeon + ASA II
- [x] Verify NO ASA fee added
- [x] Verify normal percentage split

### Test 3: Admin Edit
- [x] Edit ASA II fee to 9,000 DA
- [x] Create new surgery
- [x] Verify clinic receives 9,000 DA (not 7,000)

### Test 4: No ASA Class
- [x] Create surgery without ASA class
- [x] Verify no ASA fee (regardless of contract)

---

## 📁 Files Changed

| File | Type | Changes |
|------|------|---------|
| `models/AsaPricing.js` | Model | Single `fee` field |
| `controller/surgery.controller.js` | Logic | Simplified ASA calculation |
| `controller/asaPricing.controller.js` | API | Single fee handling |
| `views/asaPricing/index.ejs` | UI | Simplified display |
| `views/asaPricing/edit.ejs` | UI | Single input field |

---

## 🚀 Quick Commands

### Initialize ASA Pricing
```bash
# Via admin UI:
# 1. Go to /asa-pricing
# 2. Click "Initialiser Tarifs Par Défaut"
```

### Recalculate Existing Surgeries
```bash
# Preview changes
node scripts/recalculate-asa-fees.js --dry-run

# Apply changes
node scripts/recalculate-asa-fees.js
```

### Check Current Fees
```javascript
// In MongoDB shell or Node
const pricing = await AsaPricing.find({ isActive: true });
pricing.forEach(p => {
  console.log(`ASA ${p.class}: ${p.fee} DA`);
});
```

---

## ⚠️ Important Notes

1. **Percentage contracts:** ASA fees never apply (enforced in code)
2. **Location contracts:** ASA fees always go to clinic (surgeon gets 0)
3. **Existing surgeries:** Not auto-updated when fees change (use recalculation script)
4. **Fee updates:** Take effect immediately for new surgeries only

---

## 📞 Support

### Questions?
- **Technical:** See `ASA_FLAT_FEE_IMPLEMENTATION.md`
- **Business Logic:** See copilot-instructions.md
- **RBAC:** Admin/direction roles required

### Common Issues

**Issue:** ASA fee not showing
- ✅ Check: Is surgeon contract type = "location"?
- ✅ Check: Is surgery.asaClass set?
- ✅ Check: Is ASA pricing initialized?

**Issue:** Wrong fee amount
- ✅ Check: Current ASA pricing via `/asa-pricing`
- ✅ Check: Surgery may have been created before fee update
- ✅ Solution: Run recalculation script if needed

---

**Version:** 2.0 (Flat Fee Model)  
**Previous:** 1.0 (Split Fee + Multiplier Model - deprecated)  
**Last Updated:** December 6, 2025
