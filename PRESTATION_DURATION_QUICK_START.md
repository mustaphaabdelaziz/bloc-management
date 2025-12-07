# Prestation Duration Split - Quick Start Guide

## What Changed?

Prestations now have **two duration fields** instead of one:

| Field | Purpose | In Forms | In Calculations |
|-------|---------|----------|-----------------|
| `minDuration` | Minimum expected duration | ✅ Optional input | ❌ Informational only |
| `maxDuration` | Maximum duration for fees | ✅ Optional input | ✅ Used for extra fee threshold |
| `duration` | Original/legacy duration | ✅ Required input | ⚠️ Fallback only |

---

## For End Users

### Creating a New Prestation

1. Go to **Prestations → Add New**
2. Fill in standard fields (Designation, Price, TVA, etc.)
3. **Duration (minutes)** - Required. This is your standard duration.
4. **Durée Min (minutes)** - Optional. Minimum expected duration (informational).
5. **Durée Max (minutes)** - Optional. Maximum duration (used in fee calculations).
6. Click **Save**

**Example:**
- Standard: 45 min
- Min: 30 min (rarely faster)
- Max: 60 min (usually by this time)
- Result: Surgeries over 60 min get extra fees

### Editing a Prestation

- Min/Max fields work like Duration field
- Leave blank to keep existing value
- Update to change duration ranges

### Viewing Prestations

List now shows a **Min/Max** column:
- Displays minimum and maximum durations
- Shows standard duration if min/max not set

---

## For Administrators

### Migration (Optional but Recommended)

After deploying, backfill existing prestations:

```bash
cd /path/to/bloc-management
node scripts/migrate-prestation-durations.js
```

**What it does:**
- Sets `minDuration` and `maxDuration` to current `duration`
- Only updates prestations that don't already have these fields
- Shows statistics when complete
- Safe: doesn't overwrite existing min/max values

**Example Output:**
```
Connected to MongoDB
Found 47 prestations to migrate
✓ Migrated prestation: CO-CARDIO-0001 (Bypass Coronarien)
...
✓ Migration complete: 47 prestations updated
  - minDuration set to current duration (informational)
  - maxDuration set to current duration (used in fee calculations)

Migration Statistics:
  Total prestations: 47
  Prestations with min/max duration: 47
  Average duration: 65 min
  Average min duration: 65 min
  Average max duration: 65 min
```

### Fee Calculation Logic (Unchanged for Users)

**Extra fees now based on:**
- Exceeding `maxDuration` (instead of `duration`)
- Falls back to `duration` if `maxDuration` not set
- Same formula as before

**Example:**
```
Prestation maxDuration: 60 min
Prestation minDuration: 45 min
Surgery actual duration: 80 min
Tolerance: 15 min

Exceeded = 80 - 60 = 20 min (yes, exceeds)
After tolerance = 20 - 15 = 5 min (billable)
Extra fees apply ✓
```

---

## Database Changes

### Schema Update (models/Prestation.js)

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

**Note:** Both fields are optional. Existing prestations still work without them.

---

## File Changes Summary

| File | Change | Impact |
|------|--------|--------|
| `models/Prestation.js` | Added minDuration, maxDuration fields | Schema updated |
| `controller/prestation.controller.js` | Read min/max from forms | Create/edit prestations |
| `controller/surgery.controller.js` | Use maxDuration in fee calc | Fee calculations use maxDuration |
| `controller/report.controller.js` | Use maxDuration in reports | Reports accurate |
| `views/prestations/new.ejs` | Added min/max inputs | Create form |
| `views/prestations/edit.ejs` | Added min/max inputs | Edit form |
| `views/prestations/index.ejs` | Added Min/Max column | List view |
| `views/surgeons/show.ejs` | Use maxDuration in display | Surgeon detail page |
| `scripts/migrate-prestation-durations.js` | New migration script | Backfill existing data |

---

## Testing Checklist

- [ ] Create prestation with only Duration → min/max default to duration
- [ ] Create prestation with all three durations → use specified values
- [ ] Edit prestation → add/update min/max
- [ ] View prestation list → see Min/Max column
- [ ] Create surgery exceeding maxDuration → extra fees calculate
- [ ] Run migration script → all prestations updated
- [ ] Review surgeon revenue page → shows correct extra fees

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Min/Max fields not showing | Clear browser cache, reload page |
| Extra fees not calculating | Check if maxDuration is set on prestation |
| Migration fails | Ensure DB_URL env var is set, try again |
| Old surgeries show wrong fees | Extra fees frozen at creation; data is correct |

---

## Support

For questions or issues:
1. Check the full implementation guide: `PRESTATION_DURATION_SPLIT_IMPLEMENTATION.md`
2. Review migration script: `scripts/migrate-prestation-durations.js`
3. Check controller logic: `controller/surgery.controller.js` lines 666, 684
