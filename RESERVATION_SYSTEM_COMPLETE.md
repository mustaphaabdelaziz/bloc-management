# Reservation System Implementation - Complete

## Overview
Implemented a two-phase booking system where users can create lightweight **Reservations** (planning phase) that can later be converted into full **Surgeries** (confirmed operations with all details).

## Implementation Summary

### 1. ✅ Specialty-Based Prestation Filtering
**Location:** `views/surgeries/slotBooking.ejs`

- Added `data-specialty` attributes to surgeon and prestation option tags
- Implemented JavaScript filtering that shows only prestations matching the selected surgeon's specialty
- When no surgeon selected or surgeon has no specialty, all prestations are shown
- Improves UX by preventing mismatched surgery types

**Code:**
```javascript
surgeonSelect.addEventListener('change', function() {
  const surgeonSpecialtyId = this.selectedOptions[0]?.dataset.specialty;
  prestationOptions.forEach(option => {
    // Show only matching specialties or unclassified items
    if (!surgeonSpecialtyId || !prestationSpecialtyId || 
        prestationSpecialtyId === surgeonSpecialtyId) {
      option.style.display = '';
    } else {
      option.style.display = 'none';
    }
  });
});
```

### 2. ✅ Operating Room Selection in Surgery Form
**Location:** `views/surgeries/new.ejs`, `controller/surgery.controller.js`

- Added operatingRoom dropdown to surgery creation form
- Loads active operating rooms from database
- Required field for all new surgeries
- Positioned after prestation selection for logical flow

**Controller Update:**
```javascript
const operatingRooms = await OperatingRoom.find({ isActive: true }).sort({ name: 1 });
```

**View Update:**
```html
<select class="form-control-modern" id="operatingRoom" name="operatingRoom" required>
  <option value="">-- Sélectionner une salle --</option>
  <% operatingRooms.forEach(room => { %>
    <option value="<%= room._id %>">
      <%= room.name %> (<%= room.code %>)
    </option>
  <% }); %>
</select>
```

### 3. ✅ Planning View Updates
**Location:** `controller/surgery.controller.js`, `views/surgeries/planning.ejs`

**Controller Changes:**
- Queries both `Surgery` and `Reservation` collections
- Merges results with type indicator (`type: 'surgery'` or `type: 'reservation'`)
- Sorts by scheduled time
- Added type filter (all/surgery/reservation)

**View Changes:**
- Added "Type" column with badges (blue for reservation, orange for surgery)
- Added type filter dropdown
- Shows appropriate status badges for each type
- Added "Convertir" action button for pending/confirmed reservations
- Updated legend to explain both types
- Empty state now suggests both surgery creation and reservation booking

**Query Logic:**
```javascript
// Surgery query
const surgeryQuery = {
  $or: [
    { scheduledStartTime: { $gte: startDate, $lte: endDate } },
    { entreeSalle: { $gte: startDate, $lte: endDate } }
  ]
};

// Reservation query
const reservationQuery = {
  scheduledStartTime: { $gte: startDate, $lte: endDate },
  reservationStatus: { $in: ['pending', 'confirmed'] }
};

// Merge results
const allEvents = [
  ...surgeries.map(s => ({ ...s, type: 'surgery', code: s.code })),
  ...reservations.map(r => ({ ...r, type: 'reservation', code: r.temporaryCode }))
];
```

### 4. ✅ Reservation-to-Surgery Conversion Flow
**Location:** `routes/surgery.routes.js`, `controller/surgery.controller.js`, `views/surgeries/new.ejs`

#### Routes Added:
```javascript
router.get("/new/from-reservation/:id", isLoggedIn, ensureHeadDepartManagement, 
  catchAsync(renderCreateSurgeryFromReservation));
router.post("/new/from-reservation/:id", isLoggedIn, ensureHeadDepartManagement, 
  catchAsync(createSurgeryFromReservation));
```

#### Controller Method: `renderCreateSurgeryFromReservation`
1. Loads reservation by ID with populated references
2. Checks if already converted (returns error if true)
3. Loads all form data (patients, surgeons, prestations, materials, etc.)
4. Builds prefilled surgery object from reservation data
5. Passes `fromReservation: true` flag to view

#### Controller Method: `createSurgeryFromReservation`
1. Validates reservation exists and not already converted
2. Creates Surgery document from form data
3. Marks reservation as converted:
   - `reservationStatus = 'converted'`
   - `convertedToSurgery = surgery._id`
   - `convertedAt = new Date()`
4. Calculates surgery fees
5. Redirects to new surgery details page

#### View Updates:
**Dynamic Header:**
```html
<% if (fromReservation) { %>
  <h1>Convertir Réservation en Chirurgie</h1>
  <p>Confirmer la réservation <%= reservation.temporaryCode %></p>
<% } else { %>
  <h1>Nouvelle Chirurgie</h1>
<% } %>
```

**Dynamic Form Action:**
```html
<form action="<%= fromReservation ? '/surgeries/new/from-reservation/' + reservation._id : '/surgeries' %>">
```

**Prefill JavaScript:**
```javascript
// Sets patient, surgeon, prestation, operatingRoom from reservation
// Calculates smart defaults for entreeBloc, entreeSalle, incisionTime
entreeBlocInput.value = scheduledStart - 30min;
entreeSalleInput.value = scheduledStart;
incisionTimeInput.value = scheduledStart + 15min;
```

### 5. ✅ Conversion Button in Planning View
**Location:** `views/surgeries/planning.ejs`

Added to Actions column:
```html
<% if (event.type === 'reservation' && 
       (event.reservationStatus === 'pending' || event.reservationStatus === 'confirmed')) { %>
  <a href="/surgeries/new/from-reservation/<%= event._id %>" 
     class="btn btn-sm btn-success" 
     title="Convertir en chirurgie">
    <i class="bi bi-arrow-right-circle"></i> Convertir
  </a>
<% } %>
```

## Data Flow

### Phase 1: Slot Booking (Reservation)
1. User navigates to `/surgeries/planning/slots`
2. Selects operating room, date, and time slots
3. Fills basic info: patient, surgeon, prestation
4. System creates **Reservation** document:
   - `temporaryCode`: RES-001, RES-002, etc.
   - `reservationStatus`: 'pending' or 'confirmed'
   - Basic scheduling info only
   - NO materials, NO incision times, NO medical staff
5. Redirects to planning view

### Phase 2: Conversion to Surgery
1. User views planning and clicks "Convertir" on reservation
2. System loads surgery form with prefilled data:
   - Patient, surgeon, prestation, operating room
   - Calculated default times (entreeBloc, entreeSalle, incisionTime)
3. User adds complete surgery details:
   - Actual surgery code (CH-XXX)
   - Precise timing (incision, closing, sortie)
   - Materials consumed
   - Medical staff assigned
   - ASA classification
   - Anesthesia details
4. System creates **Surgery** document
5. System updates **Reservation**:
   - `reservationStatus = 'converted'`
   - `convertedToSurgery = surgery._id`
   - `convertedAt = timestamp`
6. Redirects to surgery details page

## Technical Details

### Models Used
- **Reservation** (`models/Reservation.js`): Lightweight booking
  - temporaryCode (String, unique)
  - operatingRoom, patient, surgeon, prestation (refs)
  - scheduledStartTime, scheduledEndTime (Date)
  - reservationStatus (enum: pending/confirmed/converted/cancelled)
  - convertedToSurgery (ref to Surgery)
  - convertedAt (Date)

- **Surgery** (`models/Surgery.js`): Complete operation record
  - All Reservation fields PLUS:
  - code (String, unique, CH-XXX format)
  - incisionTime, closingIncisionTime
  - entreeBloc, entreeSalle, sortieSalle
  - consumedMaterials[], medicalStaff[]
  - asaClassification, anesthesiaType
  - surgeonAmount, clinicAmount (calculated fees)

### Conflict Detection
Updated `services/reservationService.js`:
- `checkRoomAvailability()` checks BOTH Surgery and Reservation collections
- `generateSlotsForDay()` marks slots occupied by either type
- Prevents double-booking across both collections

### UI Indicators
- **Reservation badges**: Blue with calendar icon
- **Surgery badges**: Orange with scissors icon
- **Status badges**: 
  - Pending (yellow)
  - Confirmed (green)
  - Planned (blue)
  - Urgent (red)
  - Converted (shown as surgery in planning)

## User Workflow Examples

### Scenario 1: Quick Reservation
```
1. Chef de bloc receives surgery request
2. Goes to Planning → Fait une réservation
3. Selects room "Salle 1", date "2025-06-15"
4. Clicks slots 09:00-11:00 (2 hours)
5. Selects patient, surgeon, prestation
6. Submits → Creates RES-042
7. Reservation appears in planning view
```

### Scenario 2: Converting to Surgery
```
1. Surgery day arrives
2. Chef de bloc opens Planning
3. Sees RES-042 in list
4. Clicks "Convertir" button
5. Form opens with prefilled data:
   - Patient: Jean Dupont
   - Surgeon: Dr. Martin
   - Prestation: Appendectomy
   - Operating Room: Salle 1
   - Times: Auto-calculated from reservation
6. Adds:
   - Surgery code: CH-2025-156
   - Materials: Scalpels, sutures, etc.
   - Medical staff: Anesthetist, nurses
   - ASA: III
7. Submits → Creates CH-2025-156
8. RES-042 marked as converted
9. Redirects to surgery details page
```

### Scenario 3: Planning Overview
```
1. Direction views Planning
2. Sees mixed list:
   - [Réservation] RES-042 - 09:00-11:00 - Salle 1
   - [Chirurgie] CH-2025-150 - 13:00-15:00 - Salle 2
   - [Réservation] RES-043 - 16:00-18:00 - Salle 1
3. Filters by type: "Réservations"
4. Only sees RES-042, RES-043
5. Can convert, modify, or cancel each
```

## Testing Checklist

- [x] Create reservation via slot booking
- [x] View reservation in planning
- [x] Filter by type (all/surgery/reservation)
- [x] Filter prestations by surgeon specialty
- [x] Convert reservation to surgery
- [x] Verify prefilled form data
- [x] Verify reservation marked as converted
- [x] Verify converted reservation no longer shows "Convertir" button
- [x] Create surgery directly (without reservation)
- [x] Verify operating room selection required
- [x] Test conflict detection between surgeries and reservations

## Files Modified

### Controllers
- `controller/surgery.controller.js`
  - Updated `renderCreateSurgeryForm()` - added operatingRooms
  - Updated `showPlanning()` - queries both collections
  - Added `renderCreateSurgeryFromReservation()` - conversion form
  - Added `createSurgeryFromReservation()` - conversion handler

### Routes
- `routes/surgery.routes.js`
  - Added GET `/surgeries/new/from-reservation/:id`
  - Added POST `/surgeries/new/from-reservation/:id`

### Views
- `views/surgeries/new.ejs`
  - Added operating room dropdown
  - Added conversion mode header/alerts
  - Added dynamic form action
  - Added prefill JavaScript
- `views/surgeries/slotBooking.ejs`
  - Added data-specialty attributes
  - Added specialty filtering JavaScript
  - Updated patient label format (removed parentheses)
  - Updated slot badges (type indicators)
- `views/surgeries/planning.ejs`
  - Added type filter
  - Added type column with badges
  - Updated table to show both surgeries and reservations
  - Added "Convertir" action button
  - Updated legend
  - Updated empty state

### Services
- `services/reservationService.js`
  - Updated `checkRoomAvailability()` - checks both collections
  - Updated `generateSlotsForDay()` - shows both types

## Configuration

No configuration changes required. System uses existing:
- RBAC permissions (ensureHeadDepartManagement)
- Database connection
- Session management
- Flash messages

## Dependencies

No new dependencies added. Uses existing:
- Mongoose (models)
- Express (routing)
- EJS (templating)
- Bootstrap 5 (UI)

## Future Enhancements

1. **Bulk Conversion**: Convert multiple reservations at once
2. **Reservation Reminders**: Email/SMS notifications before surgery date
3. **Calendar View**: Visual week/month grid instead of table
4. **Recurring Reservations**: Book weekly slots for regular surgeries
5. **Conflict Warnings**: Suggest alternative times when room busy
6. **Export to ICS**: Download calendar file for external apps
7. **Statistics Dashboard**: Reservation conversion rate, room utilization

## Rollback Instructions

If issues occur, revert these commits in order:
1. Remove conversion routes from `routes/surgery.routes.js`
2. Remove conversion methods from `controller/surgery.controller.js`
3. Revert planning view to original (reservations only)
4. Revert slot booking view changes
5. Remove operating room field from new.ejs
6. Clear any Reservation documents with `db.reservations.deleteMany({})`

## Support

For issues or questions:
- Check browser console for JavaScript errors
- Check server logs for backend errors
- Verify Reservation model exists and has proper indexes
- Ensure OperatingRoom collection has active rooms
- Test with admin user first (bypasses all RBAC checks)

---

**Status**: ✅ All tasks completed
**Date**: 2025-06-XX
**Implemented By**: GitHub Copilot
