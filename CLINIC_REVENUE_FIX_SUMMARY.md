# Clinic Revenue Report - Percentage Contracts Fix

## Issue
The clinic revenue report (`/reports/clinic-revenue`) was not calculating or displaying percentage contracts. Only location contracts were showing in the report.

## Root Cause
The report query was filtering surgeries exclusively by `incisionTime`:
```javascript
const surgeries = await Surgery.find({
    incisionTime: { $gte: startDate, $lte: endDate },
    status: { $in: ['planned', 'urgent'] }
})
```

However, the percentage contract surgeries in the database did not have `incisionTime` set (it was undefined). This caused them to be filtered out of the query results, so the percentage contract calculations were never executed.

**Test Data:**
- 2025/00001: Mahfaud BERNOUS (percentage, 40%) - NO incisionTime ❌
- 2025/00002: Abdellouhab MOUSSELMAL (location) - HAS incisionTime ✓
- 2025/00003: Hind HAMICI (percentage, 40%) - NO incisionTime ❌

## Solution
Updated the report query to use MongoDB `$or` logic to handle surgeries with or without `incisionTime`:

```javascript
const surgeries = await Surgery.find({
    $or: [
        { incisionTime: { $gte: startDate, $lte: endDate } },
        { incisionTime: { $exists: false, $eq: null }, updatedAt: { $gte: startDate, $lte: endDate } }
    ],
    status: { $in: ['planned', 'urgent'] }
})
```

This query now:
1. Includes surgeries WITH incisionTime in the date range, OR
2. Includes surgeries WITHOUT incisionTime that were updated within the date range

## Changes Made

### File: `controller/report.controller.js`

1. **Updated Surgery query** (lines 346-354):
   - Changed from `incisionTime: { $gte: startDate, $lte: endDate }` 
   - To `$or` with fallback to `updatedAt` for surgeries without incisionTime

2. **Updated date field in location details** (line 436):
   - Changed `date: surgery.incisionTime`
   - To `date: surgery.incisionTime || surgery.updatedAt`

3. **Updated date field in percentage details** (line 505):
   - Changed `date: surgery.incisionTime`
   - To `date: surgery.incisionTime || surgery.updatedAt`

## Results
✓ **Before fix:**
- Surgeries found: 1 (location only)
- Location Revenue: 85,800
- Percentage Revenue: 0 ❌

✓ **After fix:**
- Surgeries found: 3 (1 location + 2 percentage)
- Location Revenue: 85,800
- Percentage Revenue: 341,300 ✓

## Test Output
```
[CLINIC-REVENUE] Rapport généré: {
  locationSurgeries: 1,
  percentageSurgeries: 2,
  totalLocationRevenue: 85800,
  totalPercentageRevenue: 341300
}
```

## Percentage Contract Calculations (Verified)
- **2025/00001** (Mahfaud BERNOUS, 40%):
  - Prestation Price: 460,000
  - Surgeon Amount: 182,000 (40% of net after deducting patient materials)
  - Clinic Revenue: 273,400

- **2025/00003** (Hind HAMICI, 40%):
  - Prestation Price: 90,000 (with 25% urgent fee = 112,500 net)
  - Surgeon Amount: 45,000 (40% of net)
  - Clinic Revenue: 67,900

## Browser Testing
✓ Report page loads correctly at `http://localhost:7777/reports/clinic-revenue`
✓ Percentage contract tab displays with data
✓ All calculations are correct

## Files Modified
- `controller/report.controller.js` - Query and date handling fix
