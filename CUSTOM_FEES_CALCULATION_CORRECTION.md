# Custom Fees - Calculation Logic Correction

## Summary
The custom fees calculation has been corrected to follow the proper financial flow where custom fees represent deductions from the surgeon and additions to the clinic revenue.

## Corrected Formulas

### For Percentage Contracts (e.g., 45% surgeon, 55% clinic):

**Base Calculation (before custom fees):**
- Base Amount = (Prestation Price × (1 + Urgent%)) - Patient Materials
- Surgeon Base = Base Amount × Surgeon Rate%
- Clinic Base = Base Amount × Clinic Rate% + Patient Materials

**With Custom Fees:**
- **Surgeon Final = Surgeon Base - Custom Fees**
- **Clinic Final = Clinic Base + Custom Fees**

### For Location Contracts:
Custom fees still follow the same pattern:
- Surgeon amount reduced by custom fees
- Clinic amount increased by custom fees

## Implementation Details

### Code Changes
File: `controller/surgery.controller.js` - Line 714-725

```javascript
// Calculate total custom fees
let totalCustomFees = 0;
if (surgery.customFees && Array.isArray(surgery.customFees)) {
    totalCustomFees = surgery.customFees.reduce((sum, fee) => sum + (fee.feeAmount || 0), 0);
}

// Apply custom fees:
// - Deduct from surgeon amount
// - Add to clinic amount
surgeonAmount = surgeonAmount - totalCustomFees;
clinicAmount = clinicAmount + totalCustomFees;

// Ensure no negative amounts
surgeonAmount = Math.max(0, surgeonAmount);
clinicAmount = Math.max(0, clinicAmount);
```

## Example Scenario

**Surgery Details:**
- Prestation price: 500,000 DA
- Patient materials: 50,000 DA
- Surgeon contract: 40% (Clinic: 60%)
- No extra duration
- No urgent fees
- Status: Editable

**Calculation Without Custom Fees:**
1. Base Amount = 500,000 - 50,000 = 450,000 DA
2. Surgeon Base = 450,000 × 40% = 180,000 DA
3. Clinic Base = 450,000 × 60% + 50,000 = 320,000 DA

**Custom Fees Added:**
- OVERNIGHT STAY: 30,000 DA
- Equipment rental: 20,000 DA
- Total Custom Fees: 50,000 DA

**Final Calculation:**
- **Surgeon Final = 180,000 - 50,000 = 130,000 DA** ✓
- **Clinic Final = 320,000 + 50,000 = 370,000 DA** ✓
- **Total = 500,000 DA** (conserved)

## UI Updates

### Views Updated
- `views/surgeries/show.ejs` - Added note about custom fees being added to clinic amount

### Documentation Updated
- `CUSTOM_FEES_IMPLEMENTATION.md` - Corrected formulas and examples
- `CUSTOM_FEES_USER_GUIDE.md` - Updated impact section with correct calculations

## Testing Notes

When testing custom fees:
1. Add custom fees to an editable surgery
2. Verify surgeon amount decreases
3. Verify clinic amount increases
4. Verify total surgeon + clinic = original total
5. Delete fees and verify amounts revert correctly
