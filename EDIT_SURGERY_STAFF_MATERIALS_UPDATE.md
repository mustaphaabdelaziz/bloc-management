# Surgery Edit Form Enhancement - Staff & Materials Support

## Summary of Changes

Added **Personnel Médical** (Medical Staff) and **Matériaux et Consommables** (Materials) sections to the surgery edit form, enabling users to manage these aspects of an existing surgery.

---

## Files Modified

### 1. **views/surgeries/edit.ejs**
- **Added:** Full medical staff management section (lines ~180-334)
  - Display existing staff with their roles
  - Pre-populated form fields for editing
  - Add/remove staff buttons with permission-based removal
  - Role selector widget matching create form design
  - Datalist integration for staff name autocomplete

- **Added:** Full materials management section (lines ~335-497)
  - **Consumable Materials:** Separate section for non-patient materials
    - Display existing consumable materials with quantities
    - Pre-populated form fields for editing
    - Add/remove buttons
    - Datalist for material name autocomplete
  
  - **Patient Materials:** Separate section for patient-paid materials
    - Display existing patient materials with quantities
    - Pre-populated form fields for editing
    - Add/remove buttons
    - Datalist for material name autocomplete

- **Added:** Helper functions (lines ~655-1037)
  - `initializeRoleSelect(customSelect, index)` - Manages custom role dropdown UI
  - `addStaffRow()` - Dynamically adds new medical staff row
  - `removeStaffRow(btn)` - Removes staff row with minimum row validation
  - `addConsumableMaterialRow()` - Dynamically adds consumable material row
  - `removeConsumableMaterialRow(btn)` - Removes consumable material row
  - `addPatientMaterialRow()` - Dynamically adds patient material row
  - `removePatientMaterialRow(btn)` - Removes patient material row
  - `updateRolesForStaff(input)` - Syncs datalist selection to hidden ID field
  - `updateDeleteButtonStates()` - Enforces minimum 1 row per section
  - Datalist event handlers for auto-completing medical staff and materials

---

### 2. **controller/surgery.controller.js**

#### Updated `updateSurgery()` function:
- **Medical Staff Processing** (lines ~658-671)
  - Added filtering to exclude empty staff entries
  - Only includes entries where both staff ID and role are provided
  - Matches create form logic for consistency

- **Materials Processing** (lines ~673-722)
  - Enhanced consumable materials handling with trimming
  - Enhanced patient materials handling with trimming
  - Added null-safe lookups for material documents
  - Stores frozen price at time of edit (priceUsed field)
  - Only includes materials with both ID and quantity

---

## Features Implemented

### Medical Staff Management
✅ **Display existing staff** - Pre-populated with current assignments
✅ **Edit staff assignments** - Update roles and staff members
✅ **Add new staff** - Dynamic row addition with role selector
✅ **Remove staff** - Delete staff assignments (except first row if only one)
✅ **Role selector widget** - Custom dropdown matching create form UX
✅ **Autocomplete** - Staff name datalist for quick selection

### Materials Management
✅ **Display consumable materials** - Separate from patient materials
✅ **Display patient materials** - Patient-paid materials tracked separately
✅ **Edit quantities** - Update material consumption amounts
✅ **Add new materials** - Dynamic rows for both material types
✅ **Remove materials** - Delete material entries (except first row if only one)
✅ **Autocomplete** - Material name datalist with stock info

### Permission-Based Controls
✅ **User permissions** - Passed via `res.locals.permissions`
✅ **Delete button states** - Enforces minimum 1 row per section
✅ **Closed surgery protection** - Admin-only editing via `canEditClosedSurgeries`
✅ **Financial controls** - Only admin/direction can see/edit financial fields

---

## Backend Integration

### Data Flow
1. **Form submission** → Multiple arrays (medicalStaff, rolePlayedId, etc.)
2. **Controller processing** → Filters empty entries, validates data
3. **Database update** → Replaces medicalStaff and consumedMaterials arrays
4. **Fee recalculation** → Auto-triggers `calculateSurgeonFees()` for accuracy

### Database Schema Assumptions
```javascript
// Surgery.medicalStaff[] array
{
  staff: ObjectId (reference to MedicalStaff),
  rolePlayedId: ObjectId (reference to Fonction)
}

// Surgery.consumedMaterials[] array
{
  material: ObjectId (reference to Material),
  quantity: Number,
  priceUsed: Number (frozen at time of addition/edit)
}
```

---

## UI/UX Design Matches

### Consistency with Create Form
- ✅ Same medical staff row structure
- ✅ Same role selector widget styling
- ✅ Same consumable vs patient material separation
- ✅ Same datalist autocomplete patterns
- ✅ Same add/remove button interactions

### Responsive Design
- ✅ Mobile-friendly row layouts (col-md-5, col-md-6, etc.)
- ✅ Bootstrap class naming conventions
- ✅ Icon indicators for material types (bi-tools, bi-person)

---

## Testing Checklist

### Medical Staff Editing
- [ ] Load existing surgery with medical staff
- [ ] Verify staff names and roles display pre-populated
- [ ] Edit staff member - change name/role
- [ ] Add new staff member - verify row appears and role selector works
- [ ] Remove staff member - confirm delete button works
- [ ] Submit form - verify updates persisted

### Materials Editing
- [ ] Load existing surgery with materials
- [ ] Verify consumable materials display in correct section
- [ ] Verify patient materials display in correct section
- [ ] Edit material quantity - change amount and verify update
- [ ] Add consumable material - verify row appears with datalist
- [ ] Add patient material - verify row appears with datalist
- [ ] Remove material - confirm delete button works
- [ ] Submit form - verify updates persisted

### Permission Controls
- [ ] As admin - verify can remove staff/materials
- [ ] As direction - verify can remove staff/materials
- [ ] As chefBloc - verify can remove staff/materials
- [ ] As assistante - verify limited/no access to sensitive fields
- [ ] For closed surgery as non-admin - verify form disabled
- [ ] For closed surgery as admin - verify can edit

### Error Handling
- [ ] Submit with empty staff name (only role selected) - should skip entry
- [ ] Submit with empty role (only staff selected) - should skip entry
- [ ] Submit with invalid material ID - should skip entry
- [ ] Submit with missing quantities - should skip entry
- [ ] Verify fee recalculation triggers on save

---

## API Response Structure

### GET /surgeries/:id/edit
Returns with populated data:
```javascript
{
  title: "Modifier Chirurgie",
  surgery: {
    _id: ObjectId,
    code: String,
    medicalStaff: [
      { staff: {...populated...}, rolePlayedId: {...populated...} }
    ],
    consumedMaterials: [
      { material: {...populated...}, quantity: Number, priceUsed: Number }
    ],
    statusLifecycle: String,
    // ... other fields
  },
  patients: Array,
  surgeons: Array,
  prestations: Array,
  medicalStaff: Array,
  fonctions: Array,
  materials: Array,
  canEditSurgeryFinancials: Boolean
}
```

### PUT /surgeries/:id
Expected request body:
```javascript
{
  patient: ObjectId,
  surgeon: ObjectId,
  prestation: ObjectId,
  status: String (planned|urgent),
  medicalStaff: Array (may contain multiple IDs or single ID),
  rolePlayedId: Array (corresponding roles),
  consumableMaterialId: Array,
  consumableMaterialQuantity: Array,
  patientMaterialId: Array,
  patientMaterialQuantity: Array,
  // ... other fields
}
```

---

## Known Constraints & Design Decisions

1. **Minimum rows enforced** - Cannot remove all staff/material entries (first row always present)
   - *Rationale:* Prevents accidental deletion of all entries via UI

2. **Empty entry filtering** - Server-side filtering removes incomplete staff/material entries
   - *Rationale:* Prevents malformed data in database

3. **Price freezing** - Material prices frozen at edit time (priceUsed field)
   - *Rationale:* Maintains historical accuracy if material prices change later

4. **Fee auto-recalculation** - Surgeon fees recalculate on every update
   - *Rationale:* Ensures fee calculations always reflect current data

5. **No stock deduction on edit** - Unlike create, editing doesn't adjust material stock
   - *Rationale:* Edit changes quantities already in database; only delta should matter (future enhancement)

---

## Future Enhancements

1. **Stock adjustment on edit** - Auto-adjust material stock when quantities change
2. **Batch material pricing** - Warn if material price changed since surgery creation
3. **Staff validation** - Verify staff member is still active/available
4. **Audit trail** - Log who changed what and when for medical staff/materials
5. **Confirmation dialogs** - Confirm before removing staff/materials
6. **Undo functionality** - Allow reverting to previous staff/materials config

---

## Deployment Notes

- No database schema changes required
- No new dependencies added
- Backward compatible with existing surgeries
- All changes isolated to edit form and update controller
- No impact on create form or other views
