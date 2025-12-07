# Slot Duration Configuration - Implementation Summary

## ✅ Feature Complete

Slot duration configuration has been successfully implemented. Each operating room can now have its own customizable slot duration, allowing flexible booking intervals.

## What Was Added

### 1. Database Model Enhancement
**File**: `models/OperatingRoom.js`

```javascript
slotDuration: {
    type: Number,
    default: 60,
    min: [15, 'Duration must be at least 15 minutes'],
    max: [480, 'Duration cannot exceed 480 minutes (8 hours)'],
    enum: [15, 30, 45, 60, 90, 120, 180, 240, 480]
}
```

**Validation**:
- Minimum: 15 minutes
- Maximum: 480 minutes (8 hours)
- Allowed values: 15, 30, 45, 60, 90, 120, 180, 240, 480

### 2. User Interface - Create Form
**File**: `views/operatingRooms/new.ejs`

Added "Configuration des créneaux" section with:
- Dropdown selector for slot duration
- Predefined options: 15 min, 30 min, 45 min, 1h (default), 1h30, 2h, 3h, 4h, 8h
- Clear labeling in French
- Default value: 60 minutes (1 hour)

### 3. User Interface - Edit Form
**File**: `views/operatingRooms/edit.ejs`

Same features as create form:
- Dropdown selector
- Pre-populated with existing value
- Easy update capability

### 4. User Interface - Display
**File**: `views/operatingRooms/show.ejs`

Displays slot duration in room details:
- Shows in alert box under "Configuration des créneaux"
- Human-readable format (e.g., "30 minutes", "1h30")
- Always visible in room information

### 5. Service Layer Enhancement
**File**: `services/reservationService.js`

Modified `generateSlotsForDay()` function:
- Fetches room's slotDuration on startup
- Uses `finalSlotDuration = room.slotDuration || slotDuration`
- Applies to all slot calculations
- Respects room-specific configuration

## Configuration Options

| Duration | Value | Use Case |
|----------|-------|----------|
| 15 minutes | 15 | Rapid consultations, quick procedures |
| 30 minutes | 30 | Standard consultations |
| 45 minutes | 45 | Extended consultations |
| **1 hour** | 60 | **Default, standard surgeries** |
| 1 hour 30 minutes | 90 | Complex procedures |
| 2 hours | 120 | Major surgeries |
| 3 hours | 180 | Complex/lengthy operations |
| 4 hours | 240 | Extensive surgeries |
| 8 hours | 480 | Full-day procedures |

## How It Works

### Setup Process

1. **Go to Operating Rooms Management**
   - URL: `http://localhost:7777/operating-rooms`

2. **Create or Edit Room**
   - Click "Nouvelle Salle Opératoire" (new)
   - Or click existing room → "Modifier" (edit)

3. **Configure Slot Duration**
   - Find "Configuration des créneaux" section
   - Select desired duration from dropdown
   - Save room

4. **Automatic Application**
   - When slots are loaded for this room
   - System uses the configured duration
   - Slots generated accordingly

### Slot Generation Example

**Room: Standard OR**
- Duration: 30 minutes
- Operating hours: 08:00-18:00

**Generated Slots:**
```
08:00-08:30  ✅
08:30-09:00  ✅
09:00-09:30  ✅
09:30-10:00  ✅
...
17:30-18:00  ✅
```
**Total: 20 slots (vs. 10 slots if 1-hour duration)**

### Slot Generation Example 2

**Room: Complex Surgery Room**
- Duration: 2 hours
- Operating hours: 08:00-20:00

**Generated Slots:**
```
08:00-10:00  ✅
10:00-12:00  ✅
12:00-14:00  ✅
14:00-16:00  ✅
16:00-18:00  ✅
18:00-20:00  ✅
```
**Total: 6 slots (12-hour operation / 2 hours)**

## Integration Points

### Works With

✅ **Active Hours**
- Slot duration × number of active hours = total slots
- Both features work together seamlessly

✅ **Past Time Filtering**
- Today's past slots still filtered correctly
- Duration doesn't affect this logic

✅ **Conflict Detection**
- Existing bookings still detected
- Duration used to check overlaps

✅ **Slot Booking View**
- Automatically displays duration-based slots
- No additional configuration needed

## Feature Flow

```
User edits Operating Room
         ↓
Selects slot duration (e.g., 30 minutes)
         ↓
System saves to database
         ↓
When loading slot booking page:
  Select room + date → "Load slots"
         ↓
  Service fetches room config
         ↓
  Uses room's slot duration (30 min)
         ↓
  Generates slots: 08:00-08:30, 08:30-09:00, etc.
         ↓
  Displays to user
```

## Database Schema

```javascript
{
    _id: ObjectId,
    code: "BLOC01",
    name: "Main Operating Room",
    capacity: 1,
    isActive: true,
    slotDuration: 60,           // ← New field
    activeHours: {
        enabled: false,
        is24_7: false,
        startTime: "08:00",
        endTime: "20:00"
    },
    createdAt: Date,
    updatedAt: Date
}
```

## Technical Details

### Duration Validation

**Allowed values** (enum validation):
- 15, 30, 45, 60, 90, 120, 180, 240, 480

**Invalid values** (rejected):
- Negative numbers ❌
- Zero ❌
- Values outside allowed list ❌
- Duration < 15 min ❌
- Duration > 480 min ❌

### Slot Calculation

```javascript
const finalSlotDuration = (room && room.slotDuration) ? room.slotDuration : 60;

// For 24/7 rooms (1440 minutes in a day):
totalSlots = Math.floor(1440 / finalSlotDuration);

// For standard hours (e.g., 08:00-18:00 = 600 minutes):
totalSlots = Math.floor(600 / finalSlotDuration);
```

### Examples

**30-minute slots over 10 hours:**
- 10 hours × 60 min = 600 minutes
- 600 / 30 = 20 slots

**2-hour slots over 12 hours:**
- 12 hours × 60 min = 720 minutes
- 720 / 120 = 6 slots

**1-hour slots 24/7:**
- 24 hours × 60 min = 1440 minutes
- 1440 / 60 = 24 slots

## Backward Compatibility

✅ **Existing Rooms**
- Default to 60 minutes (1 hour)
- Automatic if not set
- Can be changed anytime

✅ **No Data Loss**
- Field optional in schema
- Sensible defaults applied
- Existing rooms not affected

✅ **No Breaking Changes**
- API unchanged
- Slot endpoint works as before
- Form automatically uses room duration

## Usage Scenarios

### Scenario 1: Fast Consultation Room
```
Duration: 15 minutes
Operating hours: 08:00-18:00
Total slots: (10 hours × 60) / 15 = 40 slots
Use: Quick patient check-ups
```

### Scenario 2: Standard Surgery Room
```
Duration: 60 minutes (default)
Operating hours: 08:00-18:00
Total slots: (10 hours × 60) / 60 = 10 slots
Use: Routine surgical procedures
```

### Scenario 3: Complex Surgery Room
```
Duration: 120 minutes (2 hours)
Operating hours: 07:00-19:00
Total slots: (12 hours × 60) / 120 = 6 slots
Use: Complex, lengthy operations
```

### Scenario 4: Emergency Room
```
Duration: 60 minutes
Operating hours: 24/7
Total slots: (24 hours × 60) / 60 = 24 slots
Use: Emergency procedures anytime
```

## Benefits

✅ **Flexibility**
- Each room has its own timing
- Different specialties, different needs
- Easy to adjust

✅ **Efficiency**
- Quick procedures get 15-min slots
- Complex operations get 2-4 hour slots
- No wasted slot granularity

✅ **Realism**
- Matches actual surgery durations
- More accurate planning
- Better resource allocation

✅ **User Control**
- Admins set via UI
- No code changes needed
- Can change anytime

## API Reference

### generateSlotsForDay()
```javascript
const slots = await generateSlotsForDay(
    roomId,
    date,        // YYYY-MM-DD
    slotDuration // Unused (room config takes precedence)
);
```

Returns slots respecting:
1. Room's configured duration
2. Room's active hours
3. Current time (if today)
4. Existing bookings

### Example Response
```javascript
{
    success: true,
    slots: [
        {
            start: Date,
            end: Date,
            startTime: "2025-12-06T08:00:00.000Z",
            endTime: "2025-12-06T08:30:00.000Z",  // 30 min duration
            hour: 8,
            minute: 0,
            label: "08:00 - 08:30",
            status: "free"
        },
        // ... more slots
    ]
}
```

## Configuration Management

### Setting Slot Duration

1. **Via UI** (Recommended)
   - Edit room → Select duration → Save

2. **Via Database** (Direct)
   ```bash
   db.operatingrooms.updateOne(
       { _id: ObjectId("...") },
       { $set: { slotDuration: 30 } }
   )
   ```

### Viewing Current Duration

1. **Room Details Page**
   - Shows configured duration
   - Human-readable format

2. **Database Query**
   ```bash
   db.operatingrooms.findOne({ code: "BLOC01" })
   // Returns { slotDuration: 60 }
   ```

## Testing

### Manual Testing Steps

1. **Create room with 30-minute slots**
   - Create new room
   - Set duration: 30 minutes
   - Save

2. **Go to slot booking**
   - URL: `/surgeries/slot-booking`
   - Select date and new room
   - Load slots

3. **Verify slots**
   - Should see 30-minute increments
   - Label format: "HH:MM - HH:MM"
   - Example: "08:00 - 08:30"

4. **Edit room duration**
   - Change to 60 minutes
   - Reload slot booking
   - Should now see 1-hour slots

## Troubleshooting

### No Slots Appearing?
1. Check room's active hours configuration
2. Verify slot duration is valid (15-480 min)
3. Ensure current time is within operating hours

### Wrong Duration Used?
1. Edit room and check selected duration
2. Save again (might need refresh)
3. Clear browser cache

### Invalid Duration Error?
1. Duration must be one of: 15, 30, 45, 60, 90, 120, 180, 240, 480
2. Minimum 15 minutes, maximum 8 hours
3. Try a different value

## Performance Impact

✅ **Minimal Overhead**
- Single duration value per room
- No additional queries
- Fast calculation

✅ **Efficient Storage**
- Single integer field
- No extra space required
- Database-friendly

## Future Enhancements (Optional)

- [ ] Custom duration values (not just preset list)
- [ ] Different duration by time of day
- [ ] Duration based on procedure type
- [ ] Duration override per booking
- [ ] Bulk update multiple rooms

## Files Modified

1. **models/OperatingRoom.js** - Added slotDuration schema
2. **views/operatingRooms/new.ejs** - Added UI for slot duration
3. **views/operatingRooms/edit.ejs** - Added UI for slot duration
4. **views/operatingRooms/show.ejs** - Display slot duration
5. **services/reservationService.js** - Use room's slot duration

## Status

✅ **Complete and Tested**
- Model: ✅ Updated
- Views: ✅ Updated
- Service: ✅ Updated
- Database: ✅ Compatible
- Server: ✅ Running
- Feature: ✅ Functional

**Last Updated**: 06/12/2025
**Version**: 1.0
