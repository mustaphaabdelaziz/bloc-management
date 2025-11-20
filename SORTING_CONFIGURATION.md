# Entity Sorting Configuration Summary

## All Entities Now Sorted Alphabetically/Alphabetically

| Entity | Sort Field | Order | Location | Status |
|--------|-----------|-------|----------|--------|
| **Specialty** | `name` | Ascending (A-Z) | `controller/speciality.controller.js` line 4 | ✅ |
| **Fonction** | `name` | Ascending (A-Z) | `controller/fonction.controller.js` line 6 | ✅ |
| **Prestation** | `designation` | Ascending (A-Z) | `controller/prestation.controller.js` line 10-11 | ✅ |
| **Patient** | `lastName` | Ascending (A-Z) | `controller/patient.controller.js` line 21 | ✅ UPDATED |
| **User** | `lastname` | Ascending (A-Z) | `routes/users.routes.js` line 10 | ✅ UPDATED |
| **Medical Staff** | `lastName` | Ascending (A-Z) | `controller/medicalStaff.controller.js` line 6 | ✅ |
| **Surgeon** | `lastName` | Ascending (A-Z) | `controller/surgeon.controller.js` line 10 | ✅ |

## Changes Made

### 1. Patient List (`controller/patient.controller.js` line 21)
```javascript
// BEFORE
.sort({ createdAt: -1 })

// AFTER
.sort({ lastName: 1 })
```
- Changed from newest first (creation date) to alphabetical by last name

### 2. User List (`routes/users.routes.js` line 10)
```javascript
// BEFORE
const users = await User.find({}).select('-password');

// AFTER
const users = await User.find({}).select('-password').sort({ lastname: 1 });
```
- Added sorting by lastname in ascending alphabetical order

## Implementation Details

All sorting uses MongoDB's standard sort syntax:
- `{ fieldName: 1 }` = Ascending (A-Z)
- `{ fieldName: -1 }` = Descending (Z-A)

All lists are now consistently sorted in ascending (A-Z) order for better user experience and predictability.
