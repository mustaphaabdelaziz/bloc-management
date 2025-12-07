# Surgery Lifecycle State Implementation

## Overview
Implemented a two-state lifecycle system for surgeries:
- **State 1 (Editable)**: Users can edit and update the surgery
- **State 2 (Closed/Clôturée)**: Surgery is completed, verified, and ready for payment. Only admins can modify closed surgeries.

## Changes Made

### 1. Model Updates (`models/Surgery.js`)
Added three new fields to the Surgery schema:

```javascript
statusLifecycle: {
  type: String,
  enum: ["editable", "closed"],
  default: "editable",
},
closedAt: {
  type: Date,
  default: null,
},
closedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
}
```

### 2. Controller Updates (`controller/surgery.controller.js`)

#### Modified Existing Methods
- **`updateSurgery`**: Added check to prevent non-admin users from editing closed surgeries
- **`updateSurgeryStatus`**: Added check to prevent non-admin users from changing status of closed surgeries
- **`deleteSurgery`**: Added check to prevent non-admin users from deleting closed surgeries

#### New Controller Methods
- **`closeSurgery`**: Allows only admins to close a surgery
  - Sets `statusLifecycle` to 'closed'
  - Records `closedAt` timestamp
  - Records `closedBy` user ID
  - Prevents double-closing

- **`reopenSurgery`**: Allows only admins to reopen a closed surgery
  - Sets `statusLifecycle` back to 'editable'
  - Clears `closedAt` and `closedBy` fields
  - Only works on closed surgeries

### 3. Route Updates (`routes/surgery.routes.js`)
Added two new routes:
```javascript
router.post("/:id/close", isLoggedIn, ensureManagementAccess, catchAsync(closeSurgery));
router.post("/:id/reopen", isLoggedIn, ensureManagementAccess, catchAsync(reopenSurgery));
```

### 4. Permission Updates (`config/local.js`)
Added three new permission flags:
```javascript
permissions.canCloseSurgeries = permissions.isAdmin;
permissions.canReopenSurgeries = permissions.isAdmin;
permissions.canEditClosedSurgeries = permissions.isAdmin;
```

### 5. View Updates

#### Surgery List View (`views/surgeries/index.ejs`)
- Added "Clôturée" badge next to surgery status for closed surgeries
- Conditionally hide "Edit" button for closed surgeries (except for admins)

#### Surgery Detail View (`views/surgeries/show.ejs`)
- Added "Clôturée" badge in header for closed surgeries
- Display closed date and time in surgery details
- Added "Clôturer" button (shown for editable surgeries, admin only)
- Added "Réouvrir" button (shown for closed surgeries, admin only)
- Conditionally hide "Modifier" button for closed surgeries (except for admins)
- Added confirmation dialogs for close/reopen actions

#### Surgery Edit View (`views/surgeries/edit.ejs`)
- Added warning alert at top for closed surgeries
- Added "Clôturée" badge in header
- Disabled all form fields for closed surgeries (non-admin users)
- Changed submit button to disabled state with appropriate message
- Added JavaScript to disable form elements for closed surgeries

## User Flow

### For Regular Users (non-admin)
1. Create and edit surgeries normally when in "editable" state
2. Cannot edit, update status, or delete closed surgeries
3. Can view closed surgeries but all form fields are disabled
4. Cannot close or reopen surgeries

### For Admin Users
1. Can edit surgeries in both "editable" and "closed" states
2. Can close surgeries using the "Clôturer" button (with confirmation)
3. Can reopen closed surgeries using the "Réouvrir" button (with confirmation)
4. Can delete closed surgeries
5. Full override control over surgery lifecycle

## Key Features

### Security
- Controller-level validation prevents non-admin modifications
- Route-level middleware ensures proper authentication
- View-level disabling provides user-friendly interface
- All state changes are audited (timestamp and user ID)

### User Experience
- Visual indicators (badges, icons) show surgery state clearly
- Confirmation dialogs prevent accidental state changes
- Flash messages provide clear feedback on actions
- Disabled form fields prevent confusion for non-admin users

### Data Integrity
- Closed surgeries preserve financial data for payment processing
- Audit trail tracks who closed a surgery and when
- Admin override allows corrections if needed
- Existing urgent/planned status remains independent of lifecycle state

## Testing Checklist

- [ ] Create a new surgery (should be "editable" by default)
- [ ] Edit an editable surgery as admin
- [ ] Edit an editable surgery as non-admin user
- [ ] Close a surgery as admin (verify closedAt and closedBy are set)
- [ ] Try to edit a closed surgery as non-admin (should be prevented)
- [ ] Try to change status of closed surgery as non-admin (should be prevented)
- [ ] Try to delete a closed surgery as non-admin (should be prevented)
- [ ] Edit a closed surgery as admin (should work)
- [ ] Reopen a closed surgery as admin (verify fields are cleared)
- [ ] Verify closed badge appears in list and detail views
- [ ] Verify form fields are disabled in edit view for non-admins
- [ ] Test close/reopen confirmation dialogs

## Database Migration Notes

**Existing surgeries** will automatically have `statusLifecycle: "editable"` as the default value. No migration script is required since Mongoose will apply the default value for existing documents when they are loaded.

If you want to explicitly set the field for all existing documents, you can run:
```javascript
db.surgeries.updateMany(
  { statusLifecycle: { $exists: false } },
  { $set: { statusLifecycle: "editable", closedAt: null, closedBy: null } }
)
```

## Future Enhancements

Potential improvements:
1. Add role-based closing (allow "direction" or "chefBloc" to close surgeries)
2. Add intermediate states (e.g., "pending_verification" before closed)
3. Add history log of state changes
4. Send notifications when surgery is closed
5. Add bulk close/reopen operations
6. Add reports filtered by lifecycle state
7. Prevent closing surgeries without required data (e.g., must have materials, end date, etc.)
