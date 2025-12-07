# Operating Room Active Hours Implementation

## Overview
Added support for configurable active hours (operating hours) for each operating room. Each room can be set to operate during specific hours (e.g., 08:00-20:00) or be available 24/7. Slot generation automatically respects these working hours.

## Changes Made

### 1. Model Update: `models/OperatingRoom.js`
Added `activeHours` schema with the following fields:

```javascript
activeHours: {
    enabled: Boolean (default: false),      // Enable/disable custom hours
    is24_7: Boolean (default: false),       // 24/7 availability flag
    startTime: String (default: '08:00'),   // Opening time (HH:MM format)
    endTime: String (default: '20:00')      // Closing time (HH:MM format)
}
```

### 2. View Updates

#### `views/operatingRooms/new.ejs`
- Added "Heures d'ouverture" (Operating Hours) section
- Checkbox to enable custom active hours
- Option for 24/7 availability
- Time input fields for start/end times
- JavaScript toggles to show/hide fields based on selections

#### `views/operatingRooms/edit.ejs`
- Same features as new.ejs for editing existing rooms
- Preserves existing active hours configuration
- Real-time UI feedback

#### `views/operatingRooms/show.ejs`
- Displays active hours when viewing room details
- Shows "Disponible 24h/24 7j/7" for 24/7 rooms
- Shows start and end times for scheduled rooms

### 3. Service Update: `services/reservationService.js`

Modified `generateSlotsForDay()` function to:

1. **Load room configuration**: Fetches the operating room document to check active hours
2. **Determine working hours**: 
   - If active hours disabled → uses default (8:00-18:00)
   - If 24/7 enabled → uses 0:00-24:00 (full day)
   - If custom hours → parses startTime and endTime
3. **Generate slots accordingly**: Creates slots only within operating hours

**Key Logic:**
```javascript
// Get room details to check active hours
const room = await OperatingRoom.findById(roomId);

// Determine working hours based on room's active hours
let finalWorkingHours = workingHours;
if (room && room.activeHours && room.activeHours.enabled) {
    if (room.activeHours.is24_7) {
        finalWorkingHours = { start: 0, end: 24 };
    } else {
        // Parse HH:MM format to hours
        const startTimeParts = room.activeHours.startTime.split(':');
        const endTimeParts = room.activeHours.endTime.split(':');
        finalWorkingHours = {
            start: parseInt(startTimeParts[0]),
            end: parseInt(endTimeParts[0]),
            startMinute: parseInt(startTimeParts[1]) || 0,
            endMinute: parseInt(endTimeParts[1]) || 0
        };
    }
}
```

## Features

### Room Configuration Options
1. **Default Mode** (no custom hours)
   - Uses system default (8:00 AM - 6:00 PM)
   
2. **Custom Hours**
   - Set any opening time (e.g., 07:00)
   - Set any closing time (e.g., 22:00)
   - Slots generated only within these hours
   
3. **24/7 Mode**
   - Room available around the clock
   - Slots cover entire day (00:00-23:59)
   - Perfect for emergency rooms

### User Interface
- **Toggle Settings**: Enable/disable active hours per room
- **Time Inputs**: Easy-to-use HTML5 time pickers
- **Smart Display**: Shows/hides time fields based on selections
- **Visual Feedback**: Active hours displayed in room details

## Usage

### Setting Room Hours

1. **Create/Edit Operating Room**
   - Navigate to `/operating-rooms` → New or Edit
   
2. **Enable Active Hours**
   - Check "Activer les heures d'ouverture personnalisées"
   
3. **Choose Mode**
   - **Option A**: Check "Disponible 24h/24 7j/7" for 24/7 access
   - **Option B**: Set start and end times for regular hours
   
4. **Save**
   - Click "Enregistrer" or "Mettre à jour"

### Examples

**Example 1: Standard Operating Room (08:00-18:00)**
- Enable: ✓
- 24/7: ☐
- Start: 08:00
- End: 18:00

**Example 2: Emergency Room (24/7)**
- Enable: ✓
- 24/7: ✓
- Result: Slots available anytime

**Example 3: Night Surgery Room (19:00-07:00)**
- Enable: ✓
- 24/7: ☐
- Start: 19:00
- End: 07:00 (next day)

## Slot Generation Behavior

### When Loading Slots for a Room:

1. **System checks room's active hours**
2. **Filters slots to match operating hours**
3. **For today**: Also filters out past time slots
4. **Only future available slots are displayed**

### Example Timeline
Date: 06/12/2025 | Room hours: 08:00-20:00 | Current time: 14:15

**Generated slots:**
- ~~08:00-09:00~~ (before current time)
- ~~09:00-10:00~~ (before current time)
- ... all slots before 14:15 hidden ...
- ✅ 15:00-16:00 (first visible)
- ✅ 16:00-17:00
- ✅ 17:00-18:00
- ✅ 18:00-19:00
- ✅ 19:00-20:00 (last slot before closing)
- ~~20:00-21:00~~ (after closing time)

## Database Migration

**Note:** The `activeHours` field is optional and defaults to disabled for existing rooms.

Existing rooms will:
- Have `activeHours.enabled = false` (no custom hours)
- Continue using system defaults (8:00-18:00)
- Can be updated anytime without data loss

## Technical Details

### Time Format
- Input/Storage format: `HH:MM` (24-hour)
- Examples: "08:00", "20:30", "23:59"

### 24/7 Calculation
- Generates 24 hours × 60 minutes / slotDuration slots
- Default 60-minute slots = 24 slots per day
- Slot minutes auto-wrap (e.g., 23:30 + 60min = 00:30 next day)

### Conflict Detection
- Active hours filtering happens BEFORE conflict checking
- Past time filtering happens BEFORE active hours filtering
- Results: Only current, future, available, in-hours slots shown

## Benefits

✅ **Operational Control**: Define precise working hours per room
✅ **Flexibility**: 24/7 support for emergency/intensive care
✅ **User Experience**: Users see only realistic booking times
✅ **Data Accuracy**: No need for manual filtering
✅ **Future-Proof**: Slots for future dates still show full range

## API Reference

### generateSlotsForDay()
```javascript
const slots = await generateSlotsForDay(
    roomId,        // Operating room ID
    date,          // Date string (YYYY-MM-DD)
    slotDuration,  // Minutes (default: 60)
    workingHours   // Default fallback {start: 8, end: 18}
);
```

Returns array of slots filtered by:
1. Room's active hours (if configured)
2. Current time (if today)
3. Existing reservations/surgeries
