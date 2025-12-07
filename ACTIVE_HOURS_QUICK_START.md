# Active Hours Quick Reference Guide

## What Is It?
Active hours (or operating hours) define when each operating room is available for scheduling. This controls which time slots are displayed when booking surgeries.

## Why Use It?
- **Realistic Scheduling**: Prevent booking outside actual operating hours
- **Emergency Rooms**: Mark rooms as 24/7
- **Planning**: Different rooms have different schedules
- **User Experience**: Only show available time slots

## Quick Start

### Step 1: Go to Operating Rooms Management
```
Dashboard → Salles Opératoires (or click "Operating Rooms")
URL: http://localhost:7777/operating-rooms
```

### Step 2: Create or Edit a Room
- **New Room**: Click "Nouvelle Salle Opératoire" button
- **Edit Existing**: Click the room, then "Modifier"

### Step 3: Configure Hours (Scroll to bottom)

#### Option A: Standard Hours (Default)
```
☐ Activer les heures d'ouverture personnalisées
→ Uses default 8:00 AM - 6:00 PM
```

#### Option B: Custom Hours
```
✓ Activer les heures d'ouverture personnalisées
☐ Disponible 24h/24 7j/7
Heure d'ouverture: 07:00
Heure de fermeture: 21:00
```

#### Option C: Emergency Room (24/7)
```
✓ Activer les heures d'ouverture personnalisées
✓ Disponible 24h/24 7j/7
→ Available anytime
```

### Step 4: Save
Click "Enregistrer" (new) or "Mettre à jour" (edit)

## Configuration Examples

### Morning Surgery Room
- Start: 06:00
- End: 14:00
- Use: Early morning surgeries

### Afternoon Surgery Room
- Start: 14:00
- End: 22:00
- Use: Afternoon & evening procedures

### Emergency Room
- 24/7 Enabled
- Use: Urgent procedures anytime

### Standard Operating Theatre
- Start: 08:00
- End: 18:00
- Use: Regular scheduled operations

## How It Works

### When You Book Slots

1. **Select date and room** → "Charger les créneaux"
2. **System checks**:
   - Is the room active hours enabled? 
   - If yes: What are the start/end times?
   - If 24/7: Show full day slots
3. **Slots are filtered** to show only within hours
4. **Today's slots**: Also hide anything before current time
5. **Display**: Only relevant, available slots shown

### Slot Display Examples

**Room: Standard (08:00-18:00)**
**Today: 06/12/2025 at 14:15**

```
❌ 08:00-09:00  (before current time)
❌ 09:00-10:00  (before current time)
...
✅ 15:00-16:00  ← First available
✅ 16:00-17:00
✅ 17:00-18:00
❌ 18:00-19:00  (after closing)
❌ 19:00-20:00  (after closing)
```

**Room: Emergency (24/7)**
**Today: 06/12/2025 at 14:15**

```
❌ 08:00-09:00  (before current time)
...
✅ 15:00-16:00  ← First available
✅ 16:00-17:00
...
✅ 23:00-00:00
✅ 00:00-01:00  (next day)
... (continues 24 hours)
```

## View Room Hours

### In Room Details
1. Go to room's page
2. Look for "Heures d'ouverture" section
3. Shows either:
   - "Disponible 24h/24 7j/7"
   - or "HH:MM to HH:MM"

## Tips

✅ **Enable custom hours** for accurate scheduling
✅ **Use 24/7** for ICU, emergency, or continuous operations
✅ **Set realistic times** to match actual clinic schedule
✅ **Review regularly** if hours change seasonally
✅ **Test after changes** by loading slots for that room

## Troubleshooting

### No Slots Appearing?
1. Check room's active hours are configured
2. Verify current time is within room hours (for today)
3. Check for existing reservations blocking time

### Wrong Times Showing?
1. Edit room
2. Verify start/end times
3. Toggle 24/7 if applicable
4. Save and test again

### 24/7 Not Working?
1. Ensure "Disponible 24h/24 7j/7" checkbox is ✓
2. Room must have "Activer les heures d'ouverture" enabled
3. Save and clear browser cache if needed

## Time Format

**Input Format**: 24-hour time
- 00:00 = Midnight
- 06:00 = 6:00 AM
- 14:00 = 2:00 PM
- 18:00 = 6:00 PM
- 23:59 = 11:59 PM

## Impact on Slot Booking

```
System Default Hours
        ↓
    (if disabled on room)
        ↓
Room Active Hours (if enabled)
        ↓
Current Time Filter (only for today)
        ↓
Final Displayed Slots
```

## Notes

- Changes apply immediately after saving
- Existing reservations are not affected
- Active hours only control slot display, not availability
- Different rooms can have different hours
- 24/7 mode overrides specific hours
