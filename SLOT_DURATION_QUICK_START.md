# Slot Duration Configuration - Quick Reference

## What Is It?
Slot duration defines how long each booking slot lasts. For example:
- **30 minutes** = Slots from 08:00-08:30, 08:30-09:00, etc.
- **60 minutes** = Slots from 08:00-09:00, 09:00-10:00, etc. (default)
- **2 hours** = Slots from 08:00-10:00, 10:00-12:00, etc.

## Quick Setup

### Step 1: Open Operating Rooms
```
URL: http://localhost:7777/operating-rooms
```

### Step 2: Create or Edit Room
- **Create**: Click "Nouvelle Salle Opératoire"
- **Edit**: Click room name, then "Modifier"

### Step 3: Set Slot Duration
Find "Configuration des créneaux" section:
```
Durée des créneaux de réservation: [dropdown ▼]

Options:
  15 minutes
  30 minutes
  45 minutes
  1 heure (par défaut) ← Default
  1h30
  2 heures
  3 heures
  4 heures
  8 heures
```

### Step 4: Save
Click "Enregistrer" (new) or "Mettre à jour" (edit)

## Real-World Examples

### Quick Consultation Room (15 min slots)
```
Slot duration: 15 minutes
Operating hours: 08:00-18:00 (10 hours)
Total slots: 40
Usage: Patient consultations, check-ups
```

### Standard Operating Theatre (60 min slots) - DEFAULT
```
Slot duration: 1 hour
Operating hours: 08:00-18:00 (10 hours)
Total slots: 10
Usage: Routine surgeries
```

### Complex Surgery Room (2-hour slots)
```
Slot duration: 2 hours
Operating hours: 07:00-19:00 (12 hours)
Total slots: 6
Usage: Complex operations
```

### Emergency Department (1-hour slots, 24/7)
```
Slot duration: 1 hour
Operating hours: 24/7
Total slots: 24
Usage: Emergency procedures anytime
```

## Slot Duration Values

| Duration | Minutes | Typical Use |
|----------|---------|-------------|
| 15 min | 15 | Fast consultations |
| 30 min | 30 | Standard consultations |
| 45 min | 45 | Extended consultations |
| **1 hour** | 60 | **Regular surgeries** |
| 1h30 | 90 | Complex procedures |
| 2 hours | 120 | Major surgeries |
| 3 hours | 180 | Lengthy operations |
| 4 hours | 240 | Very complex surgeries |
| 8 hours | 480 | Full-day procedures |

## How It Affects Slot Booking

### Example: Standard OR (1-hour slots)
```
Operating: 08:00-18:00 (10 hours)

Slots created:
✅ 08:00-09:00
✅ 09:00-10:00
✅ 10:00-11:00
✅ 11:00-12:00
✅ 12:00-13:00
✅ 13:00-14:00
✅ 14:00-15:00
✅ 15:00-16:00
✅ 16:00-17:00
✅ 17:00-18:00

Total: 10 slots
```

### Example: Fast Consultation (30-minute slots)
```
Operating: 08:00-12:00 (4 hours)

Slots created:
✅ 08:00-08:30
✅ 08:30-09:00
✅ 09:00-09:30
✅ 09:30-10:00
✅ 10:00-10:30
✅ 10:30-11:00
✅ 11:00-11:30
✅ 11:30-12:00

Total: 8 slots
```

### Example: Complex Surgery (2-hour slots)
```
Operating: 08:00-18:00 (10 hours)

Slots created:
✅ 08:00-10:00
✅ 10:00-12:00
✅ 12:00-14:00
✅ 14:00-16:00
✅ 16:00-18:00

Total: 5 slots
```

## Calculation Formula

```
Total Slots = (Operating Hours in Minutes) ÷ Slot Duration

Examples:
- (10 hours × 60) ÷ 60 min = 600 ÷ 60 = 10 slots
- (10 hours × 60) ÷ 30 min = 600 ÷ 30 = 20 slots
- (10 hours × 60) ÷ 120 min = 600 ÷ 120 = 5 slots
```

## Changing Slot Duration

### Scenario: Need to adjust from 1-hour to 30-minute slots

**Before:**
- Room: Standard OR
- Duration: 1 hour
- Hours: 08:00-18:00
- Total slots: 10

**Steps to change:**
1. Go to operating rooms
2. Edit room
3. Change duration to "30 minutes"
4. Save

**After:**
- Room: Standard OR (unchanged)
- Duration: **30 minutes** (updated)
- Hours: 08:00-18:00 (unchanged)
- Total slots: **20** (automatically updated)

## Slot Booking Integration

### When You Book Slots

1. Go to slot booking page
2. Select date + operating room
3. Click "Charger les créneaux" (Load Slots)
4. System automatically:
   - Reads room's slot duration
   - Generates slots in that duration
   - Applies active hours filtering
   - Filters past slots (if today)
5. Displays available slots

### No Additional Configuration Needed!
The slot duration is **automatically applied** from the room configuration.

## Viewing Current Duration

### In Room Details
1. Go to `/operating-rooms`
2. Click a room name
3. Scroll to "Configuration des créneaux"
4. See current duration display

Example:
```
Configuration des créneaux
Durée des créneaux: 30 minutes
```

## Limitations & Constraints

**Minimum Duration**: 15 minutes
**Maximum Duration**: 480 minutes (8 hours)

**Valid Durations**: 
- 15, 30, 45, 60, 90, 120, 180, 240, 480

**Invalid Durations**:
- ❌ 20 minutes (not in list)
- ❌ 5 minutes (too short)
- ❌ 500 minutes (too long)
- ❌ Negative numbers
- ❌ Zero

## Common Issues & Solutions

### Q: I set 30 minutes but slots show 1-hour intervals?
**A**: 
1. Check room was saved properly
2. Reload browser (Ctrl+F5)
3. Try editing room again
4. Verify dropdown shows "30 minutes" selected

### Q: How many slots will I get?
**A**: 
- Formula: (Operating hours × 60) ÷ Duration in minutes
- Example: (10 × 60) ÷ 30 = 20 slots

### Q: Can I use custom duration like 25 minutes?
**A**: 
- Only preset values allowed: 15, 30, 45, 60, 90, 120, 180, 240, 480
- Contact admin to add new durations

### Q: Does duration change affect existing bookings?
**A**: 
- No, existing bookings not affected
- Only new slot generation uses new duration
- Helps with transitions

## Best Practices

✅ **Use 60 minutes (1 hour)** for standard surgeries
✅ **Use 30 minutes** for consultations/quick procedures
✅ **Use 120 minutes (2 hours)** for complex surgeries
✅ **Use 15 minutes** for very fast consultations
✅ **Consider your staff** - don't use too many small slots
✅ **Match your clinic's reality** - slots should reflect actual needs
✅ **Review periodically** - adjust if needed

## Tips

💡 **Pro Tip 1**: Smaller slots = More available times
- 15 min slots give more options
- 2-hour slots give fewer options

💡 **Pro Tip 2**: Match procedure type
- Fast = 15-30 minutes
- Standard = 60 minutes
- Complex = 120-240 minutes

💡 **Pro Tip 3**: Consider breaks
- If 30-min slots, consider lunch break in active hours
- Don't create slots during planned breaks

💡 **Pro Tip 4**: Test before committing
- Change duration
- Load slots
- Verify they look right

## Support

For issues or questions:
1. Check room configuration is saved
2. Verify duration is in dropdown list
3. Reload browser/clear cache
4. Contact administrator

## Related Features

- **Active Hours**: Set when room operates (08:00-18:00, 24/7, etc.)
- **Past Time Filtering**: Automatically hide past slots for today
- **Conflict Detection**: Prevents double-booking regardless of duration

## Summary

| Feature | Details |
|---------|---------|
| **Purpose** | Define how long each booking slot lasts |
| **Default** | 60 minutes (1 hour) |
| **Range** | 15 to 480 minutes |
| **Options** | 15, 30, 45, 60, 90, 120, 180, 240, 480 |
| **Application** | Per-room configuration |
| **When Used** | Slot generation (automatic) |
| **Impact** | Affects number of available slots |

**Last Updated**: 06/12/2025
