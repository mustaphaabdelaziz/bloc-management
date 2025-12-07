# ASA Fee Management Implementation

## Overview
The ASA fee handling has been refactored to align with hospital operational requirements:
- **Location Contracts**: ASA fees are deducted from clinic revenue (clinic-only burden)
- **Percentage Contracts**: ASA fees are **NOT applicable** (removed entirely)
- **Urgent Multiplier**: Now tied to `surgery.status === 'urgent'` instead of the `asaUrgent` flag

## Changes Made

### 1. Fee Calculation Logic (`controller/surgery.controller.js`)

**Location Contracts (Type: "location")**
```
surgeonAmount = 0 (unchanged - no surgeon compensation in location model)
clinicAmount = locationCost 
             + totalMaterialCost 
             + personalFees (with urgent uplift)
             + extraFees 
             + asaClinicFee (ASA fees charged to clinic only)
```

**Percentage Contracts (Type: "percentage")**
```
surgeonAmount = ((prestationPrice × (1 + urgentRate) - patientMaterials) × surgeonRate) - extraFees
              (NO ASA fees deducted)
              
clinicAmount = ((prestationPrice × (1 + urgentRate) - patientMaterials) × clinicRate) 
             + patientMaterials 
             + extraFees
             (NO ASA fees added)
```

### 2. ASA Urgent Multiplier Behavior

**Before:**
- Applied when `surgery.asaUrgent === true`
- Multiplied both surgeon AND clinic ASA fees

**After:**
- Applied when `surgery.status === 'urgent'`
- Only affects `asaClinicFee` (for location contracts only)
- Ignored entirely for percentage contracts

### 3. Implementation Details

Location file: `d:\Development\Clinique\bloc-management\controller\surgery.controller.js`

The ASA fee block now:
1. Checks if contract type is "location" AND asaClass exists
2. Loads ASA pricing configuration
3. Sets `asaSurgeonFee = 0` (always 0 for location)
4. Sets `asaClinicFee` from config
5. Multiplies clinic fee by urgentMultiplier if `surgery.status === 'urgent'`
6. Skips all ASA processing for percentage contracts

## Database Migration

### Existing Surgeries
Surgeries created before this change will have stored `surgeonAmount` and `clinicAmount` values that may not align with the new logic. Two approaches:

**Option A: Automatic Recalculation (Recommended)**
- Run the recalculation script (see below) to update all surgeries
- Stores corrected amounts immediately

**Option B: Manual Recalculation**
- Admin navigates to surgery details
- Clicks "Calculate Fees" button to recompute amounts
- One surgery at a time

### Recalculation Script

Create and run `scripts/recalculate-asa-fees.js`:

```javascript
const mongoose = require('mongoose');
const Surgery = require('./models/Surgery');
require('dotenv').config();

const calculateSurgeonFees = require('./controller/surgery.controller').calculateSurgeonFees;

async function recalculateAllFees() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log('Connected to database');

    const surgeries = await Surgery.find().populate('surgeon').populate('prestation');
    console.log(`Found ${surgeries.length} surgeries to process`);

    let processed = 0;
    let errors = 0;

    for (const surgery of surgeries) {
      try {
        await calculateSurgeonFees(surgery._id);
        processed++;
        if (processed % 10 === 0) {
          console.log(`Progress: ${processed}/${surgeries.length}`);
        }
      } catch (err) {
        console.error(`Error processing surgery ${surgery.code}:`, err.message);
        errors++;
      }
    }

    console.log(`\nRecalculation complete:`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Errors: ${errors}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

recalculateAllFees();
```

Run with:
```bash
node scripts/recalculate-asa-fees.js
```

## Impact Analysis

### For Location Surgeons
- **Before**: Surgeon received ASA flat fee
- **After**: ASA fee goes to clinic entirely (surgeon receives 0)
- **Result**: Surgeon's total compensation DECREASES by ASA amount

### For Percentage Surgeons
- **Before**: Surgeon paid ASA fee (deducted from share)
- **After**: No ASA fee applied (surgeon keeps full percentage share)
- **Result**: Surgeon's total compensation INCREASES

### For Clinic
- **Location**: Clinic revenues INCREASE (now receives full ASA clinic fee)
- **Percentage**: Clinic revenues DECREASE (loses surgeon's ASA contribution)

## Testing Checklist

- [ ] Create new surgery with location contract + ASA class → verify ASA in clinic amount only
- [ ] Create new surgery with percentage contract + ASA class → verify NO ASA fees
- [ ] Mark surgery as urgent → verify ASA multiplier applied to clinic fee (location only)
- [ ] Mark percentage surgery as urgent → verify ASA still not applied
- [ ] Recalculate fees on existing surgery → verify amounts update correctly
- [ ] Run reports → verify totals reflect new ASA logic
- [ ] Check payment records → verify splits are correct

## Backward Compatibility

- The `asaUrgent` field on Surgery still exists but is now ignored for ASA fee calculations
- Old surgeries will retain stored amounts until recalculated
- New surgeries will use the new logic immediately
- ASA configuration (pricing, multipliers) remains unchanged

## Documentation References

- **Fee Calculation**: `controller/surgery.controller.js` lines 620-710
- **ASA Configuration**: `models/AsaPricing.js`
- **Surgery Model**: `models/Surgery.js`
- **Reports**: `controller/report.controller.js` (may need review for accuracy)

## Future Considerations

1. **Reports Accuracy**: Verify that clinic/surgeon revenue reports correctly reflect the new ASA distribution
2. **Payment Tracking**: Ensure payment records split ASA fees correctly
3. **UI Updates**: Surgery forms may show new ASA behavior to users for clarity
4. **Audit Trail**: Consider adding notes to surgeries when ASA behavior changes
