# Operating Room Planning & Reservation System

**Feature:** Operating room scheduling, reservations, and conflict management for the Bloc Management system.

**Date:** December 4, 2025  
**Updated:** January 18, 2025 (Slot Booking Feature)

---

## Overview

This feature adds comprehensive operating room (OR) management capabilities to the surgery workflow:

1. **Operating Room Management** - CRUD operations for OR entities (code, name, capacity, equipment, location, status)
2. **Reservation System** - Time-bound room booking integrated with surgeries
3. **Slot-Based Booking** - Visual hourly slot selection interface (NEW)
4. **Conflict Detection** - Auto-deny overlapping reservations (Option A)
5. **Planning Timeline** - Perpetual history view of all reservations with filters (Option B)
6. **RBAC Integration** - Role-based access for room management and reservations

---

## Booking Methods

### Method 1: Slot-Based Booking (Recommended)
**Path:** Chirurgies → Réservation par créneaux  
**URL:** `/surgeries/planning/book-slots`

**Features:**
- Visual hourly slot grid (8am-6pm, 10 slots)
- Color-coded availability (green=free, red=taken, blue=selected)
- Multi-select contiguous slots for longer surgeries
- Instant conflict visualization
- Auto-calculation of duration and time range

**See:** [SLOT_BOOKING_GUIDE.md](./SLOT_BOOKING_GUIDE.md) for detailed user guide

### Method 2: Manual Time Entry (Classic)
**Path:** Chirurgies → Planification des salles  
**URL:** `/surgeries/planning/view`

**Features:**
- Manual datetime picker entry
- Table-based reservation view
- Filtering by room, surgeon, date, status
- Direct reservation editing

---

## Architecture

### Data Models

#### OperatingRoom (`models/OperatingRoom.js`)
```javascript
{
  code: String (unique, uppercase),      // e.g., "BLOC01"
  name: String (required),               // e.g., "Salle d'opération principale"
  capacity: Number (default: 1),         // Simultaneous surgeries
  equipment: [String],                   // e.g., ["Scanner", "Microscope"]
  description: String,
  isActive: Boolean (default: true),
  location: String,                      // e.g., "Aile sud"
  floor: String,                         // e.g., "2ème étage"
  timestamps: true
}
```

#### Surgery Extensions (`models/Surgery.js`)
```javascript
{
  // New fields added:
  operatingRoom: ObjectId (ref: 'OperatingRoom'),
  scheduledStartTime: Date,
  scheduledEndTime: Date,
  reservationStatus: String (enum: ['reserved', 'confirmed', 'cancelled', 'completed']),
  reservationNotes: String
}
```

### Services

#### Reservation Service (`services/reservationService.js`)

**`checkRoomAvailability(roomId, startTime, endTime, excludeSurgeryId)`**
- Queries overlapping surgeries for the same room
- Returns `{ available: boolean, conflicts: Array }` or error
- Auto-deny logic: Checks three overlap cases:
  1. New reservation starts during an existing one
  2. New reservation ends during an existing one
  3. New reservation completely contains an existing one
- Only considers active reservations (`reserved`, `confirmed`)

**`getRoomReservations(roomId, startDate, endDate)`**
- Fetches all reservations for a specific room in date range
- Includes `reserved`, `confirmed`, `completed` statuses

**`getAllReservations(startDate, endDate, filters)`**
- Fetches reservations across all rooms with optional filters (roomId, surgeonId, status)
- Used by planning timeline view

**`validateReservationTimes(startTime, endTime)`**
- Validates time logic (start < end, min 15min, max 12h, not in past)
- Returns `{ valid: boolean, error: string }`

### Controllers

#### OperatingRoom Controller (`controller/operatingRoom.controller.js`)
- **operatingRoomList** - List with search/status filters
- **createOperatingRoom** - Handles equipment array from comma-separated string
- **viewOperatingRoom** - Shows room details + upcoming 10 reservations
- **updateOperatingRoom** - Full update with equipment parsing
- **deleteOperatingRoom** - Blocks deletion if active reservations exist
- **toggleActiveStatus** - Enable/disable room

#### Surgery Controller Extensions (`controller/surgery.controller.js`)
- **showPlanning** - Timeline view with filters (room, surgeon, date range)
- **createOrUpdateReservation** - Creates/updates reservation with conflict check
  - Validates ownership (management or surgeon owner)
  - Calls `checkRoomAvailability()` before save
  - Returns JSON (for AJAX) with conflicts if any
- **cancelReservation** - Sets `reservationStatus` to `'cancelled'`
- **checkAvailability** - AJAX endpoint for real-time conflict checking

---

## RBAC & Permissions

### Roles & Access

| Role          | Manage Rooms | View Planning | Create Reservations | Cancel Reservations |
|---------------|--------------|---------------|---------------------|---------------------|
| `admin`       | ✅            | ✅             | ✅                   | ✅                   |
| `direction`   | ✅            | ✅             | ✅                   | ✅                   |
| `headDepart`  | ❌            | ✅             | ✅                   | ✅ (own surgeries)   |
| `assistante`  | ❌            | ✅ (view only)| ❌                   | ❌                   |
| `buyer`       | ❌            | ❌             | ❌                   | ❌                   |
| `medecin`     | ❌            | ❌             | ❌                   | ❌                   |

### Permission Flags (`config/local.js`)
```javascript
permissions.canManageRooms = permissions.isAdmin || permissions.isDirection;
permissions.canViewPlanning = permissions.isAdmin || permissions.isDirection || permissions.isHeadDepart || permissions.isAssistante;
permissions.canCreateReservations = permissions.isAdmin || permissions.isDirection || permissions.isHeadDepart;
```

### Middleware Guards
- **Operating Room routes** (`routes/operatingRoom.routes.js`): `ensureManagementAccess` (admin/direction only)
- **Reservation routes** (`routes/surgery.routes.js`): Custom logic in controller checks ownership or management role

---

## Routes

### Operating Room Routes (`/operating-rooms`)
```
GET    /                      - List all rooms (with filters)
POST   /                      - Create new room
GET    /new                   - New room form
GET    /:id                   - View room details + upcoming reservations
GET    /:id/edit              - Edit room form
PUT    /:id                   - Update room
DELETE /:id                   - Delete room (blocks if active reservations)
POST   /:id/toggle-status     - Activate/deactivate room
```

### Surgery Reservation Routes (`/surgeries`)
```
GET    /planning/view                  - Planning timeline with filters
GET    /planning/check-availability    - AJAX conflict check
POST   /:id/reservation                - Create/update reservation
DELETE /:id/reservation                - Cancel reservation
```

---

## Views

### Operating Room Views (`views/operatingRooms/`)
- **index.ejs** - List view with search (code, name, location) and status filters
- **new.ejs** - Create form (code, name, capacity, equipment, location, floor, description, isActive)
- **edit.ejs** - Update form (same fields)
- **show.ejs** - Details + upcoming 10 reservations table + delete form

### Planning View (`views/surgeries/planning.ejs`)
- Filters: room, surgeon, start date (shows 7-day range)
- Table layout: Date | Time | Room | Surgeon | Patient | Prestation | Duration | Status | Code
- Legend: Réservé (blue), Confirmé (green), Terminé (gray), Annulé (red)
- Empty state with link to create surgery

### Surgery List/Show Updates
- **index.ejs** - Added "Salle" column showing room code + reservation status badge
- **show.ejs** - Added room info section with clickable room link and scheduled time slot

---

## Conflict Detection Logic (Auto-Deny - Option A)

### Algorithm
When creating/updating a reservation, `checkRoomAvailability()` queries MongoDB for overlapping surgeries:

```javascript
{
  operatingRoom: roomId,
  reservationStatus: { $in: ['reserved', 'confirmed'] },
  $or: [
    // Case 1: New starts during existing
    { scheduledStartTime: { $lte: newStart }, scheduledEndTime: { $gt: newStart } },
    // Case 2: New ends during existing
    { scheduledStartTime: { $lt: newEnd }, scheduledEndTime: { $gte: newEnd } },
    // Case 3: New contains existing
    { scheduledStartTime: { $gte: newStart }, scheduledEndTime: { $lte: newEnd } }
  ]
}
```

If conflicts found, returns:
```json
{
  "available": false,
  "conflicts": [
    {
      "surgeryCode": "CHIR-001",
      "surgeon": "Dr. John Doe",
      "patient": "Jane Smith",
      "startTime": "2025-12-05T09:00:00Z",
      "endTime": "2025-12-05T11:00:00Z",
      "status": "confirmed"
    }
  ]
}
```

Controller rejects with HTTP 409 Conflict.

### Edge Cases
- **Grace period:** Start times in past (up to 5 min ago) allowed for flexibility
- **Min duration:** 15 minutes enforced
- **Max duration:** 12 hours enforced
- **Cancelled/completed:** Not considered as conflicts

---

## Timeline View (Perpetual History - Option B)

### Features
- **Perpetual retention:** All historical reservations remain visible (no archiving)
- **Date range navigation:** Default 7-day view from selected start date
- **Filters:** Room, Surgeon, Status (persisted in query params)
- **Sorting:** Chronological by `scheduledStartTime`
- **Responsive table:** Horizontal scroll on mobile

### Performance Considerations
- **Indexed fields:** `operatingRoom`, `scheduledStartTime`, `reservationStatus` (recommended)
- **Pagination:** Not implemented yet; consider for >1000 records
- **Export:** Future enhancement (CSV/Excel export for long-range reporting)

---

## Usage Workflow

### 1. Create Operating Room
1. Admin/Direction navigates to **Configuration → Salles Opératoires**
2. Clicks **"Nouvelle Salle"**
3. Fills code (e.g., "BLOC02"), name, capacity, equipment (comma-separated), location, floor
4. Saves → Room appears in list

### 2. Plan Surgery with Room Reservation
1. HeadDepart/Direction creates surgery via **Chirurgies → Nouvelle Chirurgie** (future enhancement: add room selection in form)
2. **OR** Updates existing surgery to add room reservation:
   - Edit surgery (`/surgeries/:id/edit`)
   - Select operating room from dropdown (future enhancement)
   - Enter scheduled start/end times
   - Save → Backend calls `checkRoomAvailability()`
   - If conflict, shows error with conflicting surgery details
   - If available, reservation saved with status `'reserved'`

### 3. View Planning Timeline
1. Any role with `canViewPlanning` navigates to **Chirurgies → Planification des salles**
2. Applies filters (room, surgeon, date)
3. Views table of reservations
4. Clicks surgery code to view details

### 4. Cancel Reservation
1. Management or surgeon owner accesses surgery detail
2. Clicks "Annuler réservation" button (future enhancement: add button)
3. Confirmation dialog → DELETE `/surgeries/:id/reservation`
4. Reservation status set to `'cancelled'` (slot becomes available)

---

## Future Enhancements

### Immediate (Post-MVP)
1. **Room selection in surgery forms** - Add operating room dropdown + time pickers to `new.ejs`/`edit.ejs`
2. **Cancel reservation button** - Add to surgery show view
3. **Real-time conflict feedback** - AJAX validation on form before submit
4. **Notification system** - Email/SMS on conflicts or cancellations (if requested)

### Mid-term
1. **Visual timeline grid** - HTML5 canvas or library (FullCalendar.js) for day/week view
2. **Drag-and-drop rescheduling** - Interactive timeline with conflict highlighting
3. **Recurring reservations** - Support for recurring surgery slots
4. **Room utilization reports** - Analytics on room usage, idle time, peak hours
5. **Equipment tracking** - Link equipment availability to reservations
6. **Capacity management** - Support for rooms with capacity > 1 (parallel surgeries)

### Long-term
1. **Auto-scheduling** - AI-powered slot suggestions based on surgeon availability, prestation duration, room requirements
2. **Mobile app** - Native iOS/Android app for surgeons to book on-the-go
3. **Integration** - Sync with external hospital management systems (HL7, FHIR)

---

## Testing Checklist

### Operating Room Management
- [ ] **Create room** - Valid data → success, duplicate code → error
- [ ] **Update room** - Change name, equipment, status → persists
- [ ] **Delete room** - No active reservations → success, active reservations → blocked
- [ ] **Toggle status** - Active ↔ Inactive → updates correctly
- [ ] **View room details** - Shows upcoming 10 reservations
- [ ] **RBAC** - Buyer/assistante cannot access rooms, direction/admin can

### Reservation System
- [ ] **Create reservation** - Available slot → success, conflict → HTTP 409 with details
- [ ] **Overlap detection** - Test all 3 overlap cases (start, end, contain)
- [ ] **Time validation** - Past time → error, negative duration → error, 0 min → error
- [ ] **Update reservation** - Reschedule to new slot → conflict check runs
- [ ] **Cancel reservation** - Status changes to 'cancelled', slot becomes available
- [ ] **RBAC** - HeadDepart can reserve, assistante cannot

### Planning Timeline
- [ ] **View planning** - Shows reservations for date range
- [ ] **Filter by room** - Only shows selected room's reservations
- [ ] **Filter by surgeon** - Only shows selected surgeon's surgeries
- [ ] **Date range** - Shows 7 days from selected date
- [ ] **Empty state** - No reservations → displays friendly message
- [ ] **Perpetual history** - Old reservations (>1 year ago) remain visible

### Surgery List/Show Views
- [ ] **List view** - Room column displays code + status badge
- [ ] **Show view** - Room section shows clickable link, scheduled times, reservation status
- [ ] **No room** - Displays "-" when surgery has no room assigned

### Navigation
- [ ] **Chirurgies menu** - Dropdown shows "Liste" and "Planification"
- [ ] **Configuration menu** - "Salles Opératoires" appears for admin/direction only

---

## Database Migration

No migration script required. New fields on `Surgery` model default to `null`/empty. Existing surgeries remain unaffected. New `OperatingRoom` collection auto-created on first insert.

**Optional index creation** (for performance):
```javascript
db.surgeries.createIndex({ operatingRoom: 1, scheduledStartTime: 1 });
db.surgeries.createIndex({ reservationStatus: 1 });
db.operatingrooms.createIndex({ code: 1 }, { unique: true });
db.operatingrooms.createIndex({ isActive: 1 });
```

---

## Dependencies

- **Existing:** Express, Mongoose, EJS, Bootstrap 5, Bootstrap Icons
- **New:** None (uses existing stack)

---

## Known Limitations

1. **No real-time updates** - Planning view requires manual refresh
2. **No visual timeline** - Table layout only (no calendar/Gantt view)
3. **No equipment validation** - Doesn't check if room has required equipment for surgery
4. **No capacity management** - Assumes capacity=1 (one surgery at a time)
5. **No surgeon availability** - Doesn't check if surgeon is available for slot
6. **No mobile optimization** - Responsive table may be cumbersome on small screens

---

## Support & Maintenance

- **Logs:** Conflict detection and reservation errors logged to console via `console.error()`
- **Flash messages:** User-facing errors displayed via `req.flash('error', ...)`
- **Audit trail:** `createdBy`, `updatedBy` fields track changes (future enhancement: add to OperatingRoom)

---

## References

- [RBAC Implementation](RBAC_IMPLEMENTATION.md)
- [Surgery Lifecycle](SURGERY_LIFECYCLE_IMPLEMENTATION.md)
- [Project Architecture](.github/copilot-instructions.md)
