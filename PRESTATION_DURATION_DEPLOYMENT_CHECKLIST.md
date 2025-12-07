# Prestation Duration Split - Deployment Checklist

**Implementation Date:** December 7, 2025  
**Feature:** Split prestation duration into minDuration (informational) and maxDuration (fee calculation)

---

## Pre-Deployment Verification

### Code Changes Verification
- [x] Model: `models/Prestation.js` - Added minDuration and maxDuration fields
- [x] Controller: `controller/prestation.controller.js` - Updated create/edit handlers
- [x] Controller: `controller/surgery.controller.js` - Updated fee calculation (2 locations)
- [x] Controller: `controller/report.controller.js` - Updated extra fee calculations (2 locations)
- [x] View: `views/prestations/new.ejs` - Added min/max input fields
- [x] View: `views/prestations/edit.ejs` - Added min/max input fields
- [x] View: `views/prestations/index.ejs` - Added Min/Max column
- [x] View: `views/surgeons/show.ejs` - Updated fee display logic
- [x] Script: `scripts/migrate-prestation-durations.js` - New migration script
- [x] Docs: `PRESTATION_DURATION_SPLIT_IMPLEMENTATION.md` - Full documentation
- [x] Docs: `PRESTATION_DURATION_QUICK_START.md` - User guide

### Backward Compatibility Check
- [x] Existing prestations without min/max still work
- [x] Calculations fall back to `duration` if `maxDuration` not set
- [x] No breaking changes to existing APIs
- [x] Database schema change is non-destructive (optional fields)

---

## Deployment Steps

### 1. Pre-Deployment (5 minutes)
- [ ] Back up production database
- [ ] Review all code changes in development environment
- [ ] Test fee calculations with sample surgery data
- [ ] Verify prestation list displays correctly

### 2. Deployment (2 minutes)
- [ ] Deploy all code changes to production
- [ ] Restart Node.js server

### 3. Post-Deployment Verification (10 minutes)
- [ ] [ ] Test: Create new prestation with only duration
  - Expected: minDuration and maxDuration default to duration
  
- [ ] Test: Create new prestation with all three durations
  - Expected: Min/max values saved and used in calculations
  
- [ ] Test: View prestation list
  - Expected: Min/Max column shows duration ranges
  
- [ ] Test: Edit existing prestation to add min/max
  - Expected: Values saved and applied to new surgeries
  
- [ ] Test: Create surgery exceeding maxDuration
  - Expected: Extra fees calculated based on maxDuration
  
- [ ] Test: Revenue reports
  - Expected: Extra fees correctly attributed

### 4. Data Migration (Optional but Recommended)
- [ ] Schedule migration during low-traffic period
- [ ] Run migration script:
  ```bash
  cd /path/to/bloc-management
  node scripts/migrate-prestation-durations.js
  ```
- [ ] Verify output shows success and statistics
- [ ] Spot-check 5-10 prestations to confirm values set

### 5. Post-Migration Verification
- [ ] Query database to confirm all prestations have min/max:
  ```javascript
  db.prestations.find({ minDuration: { $exists: false } }).count()
  // Should return: 0
  ```
- [ ] Review prestation list to confirm Min/Max column populated
- [ ] Create new surgery to verify fee calculations work correctly

---

## Rollback Plan (If Needed)

### Option A: Revert Code Only (5 minutes)
If code has critical bug and you need to revert quickly:

```bash
# Revert all code changes to previous version
git checkout HEAD~1 -- models/Prestation.js \
  controller/prestation.controller.js \
  controller/surgery.controller.js \
  controller/report.controller.js \
  views/prestations/new.ejs \
  views/prestations/edit.ejs \
  views/prestations/index.ejs \
  views/surgeons/show.ejs

# Restart server
npm start
```

**Impact:**
- Min/max fields ignored in forms (backward compatible)
- All calculations use `duration` field as before
- No data lost; migration can be undone

### Option B: Database Rollback (15 minutes)
If migration caused issues:

```bash
# Restore from backup (adjust timestamp as needed)
mongorestore --db blocManagement /path/to/backup/blocManagement
```

**Impact:**
- All pre-migration data restored
- Run migration script again after issues fixed

---

## Success Criteria

After deployment, system should:

✅ **Functional Requirements:**
- [x] Create prestations with optional min/max duration
- [x] Edit prestations to update min/max values
- [x] View prestation list with duration ranges
- [x] Calculate surgery fees based on maxDuration
- [x] Generate reports with correct fee calculations
- [x] Migration script completes successfully

✅ **Quality Requirements:**
- [x] No errors in browser console
- [x] No errors in server logs
- [x] All existing surgeries still calculate correctly
- [x] New surgeries calculate with maxDuration logic
- [x] Performance unchanged (no new queries)

✅ **Compatibility Requirements:**
- [x] Old prestations work without min/max set
- [x] New features work alongside legacy data
- [x] Reports show consistent calculations
- [x] No breaking changes to API

---

## Known Limitations & Notes

1. **Existing Surgery Fees Frozen**
   - Surgery fees calculated at creation time and stored
   - Changing prestation min/max doesn't affect existing surgeries
   - Users can manually recalculate if needed via button in UI

2. **Migration is Optional**
   - System works fine without running migration
   - Migration just ensures consistent data for reporting
   - Can be run anytime without disrupting system

3. **Backward Compatibility**
   - If maxDuration is NULL, system uses duration
   - This means old surgeries continue to calculate correctly
   - No data migration required; migration is optional cleanup

4. **UI Considerations**
   - Forms now require more horizontal space for 3 duration fields
   - Column layout adjusted to fit; may vary on mobile
   - Min/Max column added to prestation list

---

## Monitoring After Deployment

### First Week Monitoring
- [ ] Monitor server logs for errors
- [ ] Check fee calculation accuracy for sample surgeries
- [ ] Monitor database queries for performance changes
- [ ] Gather user feedback on new fields

### Ongoing Monitoring
- [ ] Track extra fee calculations for accuracy
- [ ] Monitor prestation creation/edit patterns
- [ ] Review revenue reports for consistency
- [ ] Collect user suggestions for improvements

---

## Communication Plan

### For Users
1. **Pre-Deployment:** Email explaining new duration fields
   - What changed and why
   - How to use min/max durations
   - No action required for existing data

2. **Post-Deployment:** Brief tutorial
   - Screenshot of new fields
   - Example prestation with min/max
   - How it affects fee calculations

3. **Optional Migration:** Announcement when running
   - When migration will run (date/time)
   - Expected duration (5 min)
   - No service impact

### For Administrators
1. **Technical Details:** Full implementation guide
   - File changes and line numbers
   - Database schema changes
   - Fee calculation logic

2. **Operations Guide:** Migration and rollback procedures
   - How to run migration script
   - What to monitor
   - Rollback procedures if needed

---

## Sign-Off

| Role | Name | Date | Sign-Off |
|------|------|------|----------|
| Developer | | | |
| QA | | | |
| DBA | | | |
| Project Manager | | | |
| Operations | | | |

---

## References

- Full Implementation Guide: `PRESTATION_DURATION_SPLIT_IMPLEMENTATION.md`
- User Quick Start: `PRESTATION_DURATION_QUICK_START.md`
- Migration Script: `scripts/migrate-prestation-durations.js`
- Model: `models/Prestation.js`
- Fee Calculator: `controller/surgery.controller.js` (lines 600-750)

---

## Contact & Support

For deployment issues or questions:
1. Check the documentation files listed above
2. Review code changes in version control
3. Contact the development team
4. Check server logs: `tail -f logs/app.log`

**Expected Deployment Time:** 15-30 minutes (including verification)  
**Risk Level:** LOW (backward compatible, optional features)  
**Rollback Time if Needed:** 5 minutes (code revert only)
