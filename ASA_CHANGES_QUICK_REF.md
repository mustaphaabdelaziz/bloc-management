# ASA Fee Implementation - Quick Reference

## What Changed

### ✅ Location Contracts (Type: "location")
**ASA fees now charged to clinic only**

```javascript
// Before
surgeonAmount = 0 + asaSurgeonFee        // Surgeon got ASA flat fee
clinicAmount = baseAmount + asaClinicFee

// After  
surgeonAmount = 0                        // Surgeon gets 0 (no ASA)
clinicAmount = baseAmount + asaClinicFee // Clinic absorbs full ASA fee
```

### ✅ Percentage Contracts (Type: "percentage")
**ASA fees no longer applicable**

```javascript
// Before
surgeonAmount = percentageShare + asaSurgeonFee    // Surgeon paid ASA
clinicAmount = percentageShare + asaClinicFee

// After
surgeonAmount = percentageShare                    // No ASA deduction
clinicAmount = percentageShare                     // No ASA addition
```

### ✅ ASA Urgent Multiplier
**Now tied to surgery urgency status, not ASA flag**

```javascript
// Before
if (surgery.asaUrgent) {
  asaSurgeonFee *= urgentMultiplier
  asaClinicFee *= urgentMultiplier
}

// After
if (surgery.status === 'urgent') {
  asaClinicFee *= urgentMultiplier  // Only clinic fee (location only)
}
```

## Files Modified

1. **`controller/surgery.controller.js`**
   - Function: `calculateSurgeonFees()` (lines ~620-710)
   - Changes: ASA fee logic refactored

2. **Created**
   - `ASA_FEE_IMPLEMENTATION.md` - Full documentation
   - `scripts/recalculate-asa-fees.js` - Batch recalculation tool

## Immediate Actions

### 1. Verify Current Surgeries ✓
No action needed - old surgeries keep stored amounts until recalculated

### 2. Recalculate Existing Surgeries
```bash
# Test run (see what would change)
node scripts/recalculate-asa-fees.js --dry-run

# Actually recalculate
node scripts/recalculate-asa-fees.js

# Recalculate for one surgeon
node scripts/recalculate-asa-fees.js --surgeonId=SURGEON_ID
```

### 3. Test New Surgery Creation
- Create surgery with Location surgeon + ASA class
  - Expected: ASA fee in clinic amount only
- Create surgery with Percentage surgeon + ASA class
  - Expected: No ASA fees at all

### 4. Check Reports
- Run surgeon revenue report
- Run clinic revenue report
- Verify totals match new logic

## Key Differences

| Aspect | Location Contract | Percentage Contract |
|--------|-------------------|---------------------|
| ASA Applied | ✅ Yes (clinic) | ❌ No |
| Urgent Multiplier | ✅ When status='urgent' | ❌ N/A |
| Surgeon Impact | ➕ Less pay | ➕ More pay |
| Clinic Impact | ➕ More revenue | ➖ Less revenue |

## Backup & Recovery

If issues arise:
1. Backup database before recalculation
2. Restore backup to revert amounts
3. Contact developers for investigation

## Testing Workflow

### Test 1: New Location Surgery
```
1. Create surgery
2. Assign location surgeon
3. Add ASA class (e.g., ASA II)
4. Mark as normal (not urgent)
5. Check: surgeonAmount=0, asaClinicFee in clinicAmount
```

### Test 2: New Percentage Surgery
```
1. Create surgery  
2. Assign percentage surgeon
3. Add ASA class (e.g., ASA II)
4. Calculate fees
5. Check: No ASA fees in either amount
```

### Test 3: Urgent Surgery
```
1. Create location surgery with ASA
2. Mark as urgent
3. Calculate fees
4. Check: asaClinicFee multiplied by urgentMultiplier
```

## Questions?

See: `ASA_FEE_IMPLEMENTATION.md` for complete details
