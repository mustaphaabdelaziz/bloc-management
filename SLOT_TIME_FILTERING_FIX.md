# Slot Time Filtering Fix

## Problem
When displaying available time slots for surgery reservations, the system was not properly filtering out past slots when viewing today's slots. This allowed users to see and potentially book slots in the past.

### Requirements
- ✅ Start time cannot be in the past
- ✅ Display only slots from the current time onwards
- ✅ When current time is 14:15 with 30-minute slots → display from 14:30 onwards
- ✅ When current time is 14:15 with 60-minute slots → display from 15:00 onwards

## Solution

### Modified File
- `services/reservationService.js` → `generateSlotsForDay()` function

### How It Works

The fix improves the slot filtering logic to calculate the correct starting slot index based on the current time and slot duration:

1. **Calculate Current Time**: Get the current time when rendering slots for today
2. **Find First Valid Slot Index**: Iterate through all possible slot start times until finding the first one that begins AFTER the current time
3. **Start Loop From Valid Index**: The main loop now starts from `startSlotIndex` instead of 0, automatically excluding all past slots

### Example Scenarios

#### Scenario 1: 30-minute slot duration
- Current time: 14:15
- Available slots: 08:00, 08:30, 09:00, ..., 14:00, 14:30, 15:00, ...
- Displayed: 14:30, 15:00, 15:30, ... (first slot after 14:15 is 14:30)

#### Scenario 2: 60-minute slot duration  
- Current time: 14:15
- Available slots: 08:00, 09:00, 10:00, ..., 14:00, 15:00, 16:00, ...
- Displayed: 15:00, 16:00, 17:00, ... (first slot after 14:15 is 15:00)

#### Scenario 3: Future dates
- All slots are displayed for future dates (isToday = false)
- No time-based filtering is applied

## Code Changes

### Before
```javascript
// Skip past slots if this is today
if (isToday && slotEnd <= now) {
    continue;
}
```
**Problem**: Only skipped slots if the END time was in the past, missing slots where the START time is past but END time is future.

### After
```javascript
// Calculate the starting slot index for today
let startSlotIndex = 0;
if (isToday) {
    // Find the first slot that starts after the current time
    for (let testI = 0; testI < totalSlots; testI++) {
        const testSlotStart = new Date(targetDate);
        
        // ... calculate testSlotStart ...
        
        // Start from the first slot that begins after current time
        if (testSlotStart > now) {
            startSlotIndex = testI;
            break;
        }
    }
}

for (let i = startSlotIndex; i < totalSlots; i++) {
    // ... generate slots ...
}
```
**Improvement**: Pre-calculates the correct starting index and only generates slots from that point onwards.

## Testing

To test this fix:

1. Navigate to the slot booking page: `/surgeries/planning/book-slots`
2. Select today's date and an operating room
3. The displayed slots should start from the next valid slot after the current time
4. For example, if it's 14:15:
   - 30-min slots should start at 14:30
   - 60-min slots should start at 15:00

## Impact
- ✅ Users can no longer select past time slots
- ✅ Better UX with realistic time slot options
- ✅ Prevents data inconsistencies from bookings in the past
