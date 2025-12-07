# Prestation Duration Split Implementation - Complete Summary

**Date:** December 7, 2025  
**Objective:** Divide prestation duration into `minDuration` (informational) and `maxDuration` (used in fee calculations)

---

## Overview

The prestation system now supports dual duration fields:
- **`minDuration`** - Minimum expected duration (informational only)
- **`maxDuration`** - Maximum duration used in all fee calculations and extra fee logic
- **`duration`** - Original field maintained for backward compatibility

This allows clinics to define acceptable duration ranges while using the maximum duration as the threshold for calculating extra fees.

---

## Files Modified

### 1. **models/Prestation.js**
**Changes:** Added `minDuration` and `maxDuration` fields to schema
```javascript
minDuration: {
    type: Number, // en minutes - minimum duration (informational)
    required: false
},
maxDuration: {
    type: Number, // en minutes - maximum duration (used in fee calculations)
    required: false
}
```

**Impact:** 
- Both fields are optional for backward compatibility
- `maxDuration` takes precedence in all calculations; falls back to `duration` if not set

---

### 2. **controller/prestation.controller.js**
**Changes:** Updated create and edit handlers

#### Create Handler:
```javascript
minDuration: req.body.minDuration ? parseInt(req.body.minDuration) : parseInt(duration),
maxDuration: req.body.maxDuration ? parseInt(req.body.maxDuration) : parseInt(duration),
```
- If user doesn't specify min/max, both default to the standard duration
- Ensures all new prestations have comparable defaults

#### Edit Handler:
```javascript
minDuration: req.body.minDuration
    ? parseInt(req.body.minDuration)
    : existingPrestation.minDuration,
maxDuration: req.body.maxDuration
    ? parseInt(req.body.maxDuration)
    : existingPrestation.maxDuration,
```
- Preserves existing min/max values if not updated
- Allows partial updates

---

### 3. **controller/surgery.controller.js**
**Changes:** Updated fee calculation logic (lines 666, 684)

#### Location Contract:
```javascript
if (surgery.applyExtraFees && surgery.actualDuration > (prestation.maxDuration || prestation.duration)) {
    const extraduration = surgery.actualDuration - (prestation.maxDuration || prestation.duration);
```

#### Percentage Contract:
```javascript
let extraDuration = surgery.actualDuration - (prestation.maxDuration || prestation.duration);
```

**Impact:**
- Extra fees now based on exceeding `maxDuration` instead of `duration`
- Fallback to `duration` for backward compatibility with existing prestations
- Both contract types use identical logic

---

### 4. **controller/report.controller.js**
**Changes:** Updated extra fee calculations in revenue reports (lines 414, 487)

```javascript
// Both surgeries and reports now use:
if (surgery.applyExtraFees && surgery.actualDuration > (surgery.prestation.maxDuration || surgery.prestation.duration))
```

**Impact:**
- Reports accurately reflect fee calculations based on `maxDuration`
- Surgeon revenue reports show correct extra fee deductions
- Clinic revenue aggregations match calculated amounts

---

### 5. **views/prestations/new.ejs**
**Changes:** Added dual duration input fields (lines 115-145)

- **Durée (minutes)** - Standard duration input (required)
- **Durée Min (minutes)** - New optional field for minimum duration
- **Durée Max (minutes)** - New optional field for maximum duration (used in calculations)
- **Frais Urgents (%)** - Existing field, repositioned for space

**UI Labels:**
- Min: "Durée minimale (information)"
- Max: "Durée maximale (calcul honoraires)"

---

### 6. **views/prestations/edit.ejs**
**Changes:** Added min/max duration fields matching create form

Column layout adjusted to `col-md-2` for each duration field to display all three side-by-side.

---

### 7. **views/prestations/index.ejs**
**Changes:** Added new table column for duration range

```html
<th>Durée</th>
<th>Min/Max</th>  <!-- New column -->
```

**Display:**
```html
<small>
    <span class="text-muted">Min:</span> <%= prestation.minDuration || prestation.duration %> min
    <br>
    <span class="text-muted">Max:</span> <%= prestation.maxDuration || prestation.duration %> min
</small>
```

- Shows min and max durations on one line
- Gracefully shows standard duration if min/max not set
- Helps users visualize acceptable surgery duration ranges

---

### 8. **views/surgeons/show.ejs**
**Changes:** Updated fee calculation display (line 137)

```javascript
if (surgery.applyExtraFees && surgery.actualDuration > (surgery.prestation.maxDuration || surgery.prestation.duration))
```

**Impact:**
- Surgeon detail pages show accurate extra fee calculations
- Consistent with system-wide calculation logic

---

### 9. **scripts/migrate-prestation-durations.js** (New File)
**Purpose:** Backfill existing prestations with min/max duration values

**Usage:**
```bash
node scripts/migrate-prestation-durations.js
```

**Functionality:**
- Finds all prestations missing `minDuration` or `maxDuration`
- Sets both to current `duration` value
- Maintains calculation consistency with historical data
- Displays migration statistics:
  - Total prestations processed
  - Count with min/max now set
  - Average durations before/after

**Safety:**
- Only updates records that don't already have min/max set
- Non-destructive; doesn't alter existing min/max values
- Prints detailed log of each processed prestation

---

## Logic: How Extra Fees Now Work

### Before (Single Duration):
```
actualDuration = 75 min
prestation.duration = 60 min
Exceeded = 75 - 60 = 15 min (triggers extra fees)
```

### After (Min/Max Duration):
```
actualDuration = 75 min
prestation.maxDuration = 60 min
prestation.minDuration = 45 min

Exceeded = 75 - 60 = 15 min (still triggers extra fees)
minDuration = informational only (used for planning/reporting)
```

**Location Contract Example:**
- If surgery lasts longer than `maxDuration` + `tolerance`, clinic charges extra fees
- `minDuration` helps surgeons know expected surgery windows

**Percentage Contract Example:**
- Surgeon's share based on net amount (same as before)
- If surgery exceeds `maxDuration` + `tolerance`, extra fees deducted from surgeon's share
- `minDuration` helps with scheduling and resource planning

---

## Backward Compatibility

✅ **Fully backward compatible:**
- Existing prestations without `minDuration`/`maxDuration` work unchanged
- Calculations fall back to `duration` if max/min not set
- Migration script optional (but recommended for data consistency)
- No database migrations required (optional fields added)

---

## User-Facing Changes

### For Clinic Managers:
1. **Creating Prestations:** New optional fields for min/max duration
   - Leave empty to use standard duration for all fields
   - Fill in to define acceptable surgery windows

2. **Viewing Prestations:** Index table now shows duration range
   - Helps with planning and resource allocation

### For Surgeons:
1. **Fee Calculations:** Still based on maximum duration (no change to logic)
2. **Reports:** Show min/max ranges for reference

### For System Admins:
1. Run migration script to populate existing prestations
2. Monitor fee calculations to ensure consistency

---

## Testing Recommendations

### Unit Tests:
- [ ] Create prestation with only `duration` → min/max default to duration
- [ ] Create prestation with min/max → use provided values
- [ ] Edit prestation → preserve min/max if not changed
- [ ] Edit prestation → update min/max if provided

### Integration Tests:
- [ ] Location contract: extra fees based on maxDuration
- [ ] Percentage contract: extra fees based on maxDuration
- [ ] Fallback: missing maxDuration falls back to duration
- [ ] Reports: extra fees correctly attributed in revenue calculations

### User Testing:
- [ ] Create new prestation with min/max duration
- [ ] Edit existing prestation to add min/max
- [ ] Verify fee calculations with surgery exceeding maxDuration
- [ ] Check prestation list displays duration ranges correctly

---

## Deployment Steps

1. **Deploy code changes** to all files listed above
2. **Restart Node.js server** to load updated models
3. **Optional: Run migration script**
   ```bash
   node scripts/migrate-prestation-durations.js
   ```
4. **Verify:**
   - Create new prestation with min/max duration
   - Check prestation list shows duration ranges
   - Verify fee calculations for surgery exceeding maxDuration
   - Review existing prestations still calculate correctly

---

## Example Scenarios

### Scenario 1: Appendectomy
```
Designation: Appendectomie
Duration: 45 minutes
minDuration: 30 minutes (rarely finishes faster)
maxDuration: 60 minutes (usually done within this time)

Result: 
- Surgeries under 30 min = very fast (unusual)
- Surgeries 30-60 min = normal range
- Surgeries over 60 min = extra fees apply
```

### Scenario 2: C-Section
```
Designation: Césarienne élective
Duration: 60 minutes
minDuration: 45 minutes (uncomplicated)
maxDuration: 90 minutes (complicated cases)

Result:
- Surgeries under 45 min = very efficient
- Surgeries 45-90 min = acceptable range
- Surgeries over 90 min = extra fees apply
```

### Scenario 3: Legacy Prestation (No Min/Max Set)
```
Designation: Biopsie cutanée
Duration: 15 minutes

Result:
- minDuration: undefined (not used)
- maxDuration: undefined → system uses duration (15 min)
- Behavior unchanged from before implementation
```

---

## Future Enhancements

1. **Duration Tracking:**
   - Historical analysis of actual duration vs planned
   - Performance metrics per surgeon

2. **Dynamic Fees:**
   - Different fee schedules based on duration range
   - Rush fees for faster-than-min surgeries

3. **Scheduling:**
   - Auto-calculate OR time slots based on maxDuration + buffer
   - Warn if scheduling surgery that violates min/max range

4. **Reporting:**
   - Efficiency reports (actual vs planned durations)
   - Trending analysis of surgery duration patterns

---

## Support & Troubleshooting

### Issue: Fee not calculating after update
**Solution:** Ensure `maxDuration` is set. Run calculation endpoint or check prestation.

### Issue: Existing surgeries show old extra fees
**Solution:** Extra fees are stored at surgery creation. Run migration and recalculate fees if needed.

### Issue: Min/Max not appearing in forms
**Solution:** Clear browser cache and reload. Verify views/prestations/new.ejs is deployed.

---

## Conclusion

The prestation duration split implementation provides:
✅ Clearer surgery time expectations (min vs max)
✅ Flexible fee calculation thresholds
✅ Better planning and resource allocation
✅ Full backward compatibility
✅ No service interruption required

All changes are transparent to users and maintain existing workflows while adding new planning capabilities.
