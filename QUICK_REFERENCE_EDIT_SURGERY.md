# Quick Reference: Surgery Edit Form Staff & Materials

## 🎯 What Changed?

Added **Medical Staff** and **Materials** (Consumable & Patient) sections to the surgery edit form for full management capability.

---

## 📋 Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `views/surgeries/edit.ejs` | Added staff section + materials section + JS functions | +735 |
| `controller/surgery.controller.js` | Enhanced validation for staff + materials processing | +25 |

---

## 🔄 Form Data Structure

### Medical Staff Arrays
```javascript
// Form posts these arrays:
name="medicalStaff"         // Array of staff IDs
name="rolePlayedId"         // Array of corresponding role IDs (same length)
```

### Material Arrays
```javascript
// Consumable materials
name="consumableMaterialId"        // Array of material IDs
name="consumableMaterialQuantity"  // Array of quantities

// Patient materials
name="patientMaterialId"          // Array of material IDs
name="patientMaterialQuantity"    // Array of quantities
```

---

## 🎮 JavaScript Functions Reference

### Staff Management
```javascript
addStaffRow()              // Add new staff input row
removeStaffRow(btn)        // Remove staff row (with constraint)
updateRolesForStaff(input) // Sync datalist name to hidden ID
initializeRoleSelect(...)  // Initialize role dropdown widget
```

### Material Management
```javascript
addConsumableMaterialRow()      // Add consumable material row
removeConsumableMaterialRow(btn) // Remove consumable row
addPatientMaterialRow()         // Add patient material row
removePatientMaterialRow(btn)   // Remove patient row
```

### Utility
```javascript
updateDeleteButtonStates() // Enforce minimum 1 row per section
```

---

## 🔐 Permission Checks

### In Edit Form
```javascript
// Closed surgery protection
<% if (surgery.statusLifecycle === 'closed' && !permissions.canEditClosedSurgeries) { %>
  <!-- Form is disabled -->
<% } %>

// Financial fields (admin/direction only)
<% if (canEditSurgeryFinancials) { %>
  <!-- Show adjustedPrice field -->
<% } %>
```

### In Controller
```javascript
// Check if surgery is closed - only admin can edit
if (existingSurgery.statusLifecycle === 'closed' && !userPriv.includes('admin')) {
  return res.redirect(`/surgeries/${req.params.id}`);
}

// Check authorization
if (!userPriv.includes('admin') && !userPriv.includes('chefBloc')) {
  // Only allow medecin to edit their own surgeries
  // Other roles: forbidden
}
```

---

## 🧪 Testing Quick Checklist

### Medical Staff
- [ ] Load existing surgery → staff displays
- [ ] Edit role → Save → Verify persisted
- [ ] Add staff → Role selector works
- [ ] Remove staff → Entry deleted
- [ ] Leave only 1 staff → Delete button disabled

### Materials
- [ ] Load existing surgery → materials display correctly categorized
- [ ] Edit quantity → Save → Verify updated
- [ ] Add consumable → Datalist works
- [ ] Add patient material → Datalist works
- [ ] Remove material → Entry deleted
- [ ] Leave only 1 material per category → Delete button disabled

### Permissions
- [ ] Admin edits closed surgery → Works
- [ ] Non-admin edits closed surgery → Form disabled
- [ ] Assistante views form → Limited field visibility

---

## 🐛 Common Issues & Fixes

### Issue: Datalist not populating
**Fix:** Ensure `name=` attribute in input matches hidden field `name=` in parent container.

### Issue: Delete button not working
**Fix:** Check `onclick` function name matches: `removeStaffRow`, `removeConsumableMaterialRow`, etc.

### Issue: Role selector not showing options
**Fix:** Ensure `.custom-role-select` div contains `.role-select-dropdown` with `.role-select-option` children.

### Issue: Empty entries being saved
**Fix:** Controller filters empty entries via `staff.trim() && role.trim()` checks.

### Issue: Fee calculation not updating
**Fix:** Controller automatically calls `calculateSurgeonFees()` after save.

---

## 💾 Database Impact

### No Schema Changes Required
Existing arrays used:
- `Surgery.medicalStaff[]` - Same structure
- `Surgery.consumedMaterials[]` - Same structure

### Data Replacement Behavior
- Submitting form **replaces entire arrays** (not merge)
- Old entries are removed, new entries replace them
- Prices are frozen at update time via `priceUsed` field

---

## 🚀 Deployment Checklist

- [ ] Deploy `views/surgeries/edit.ejs`
- [ ] Deploy `controller/surgery.controller.js`
- [ ] Restart application
- [ ] Test staff editing workflow
- [ ] Test material editing workflow
- [ ] Verify permission restrictions
- [ ] Check fee calculations
- [ ] Monitor server logs for errors

---

## 📞 Support

### If form loads but staff/materials don't show:
1. Check controller passes `medicalStaff`, `fonctions`, `materials` to view
2. Verify surgery is populated: `.populate("medicalStaff.staff").populate("consumedMaterials.material")`

### If delete buttons always disabled:
1. Check `updateDeleteButtonStates()` is called
2. Verify button `onclick` attribute matches function name

### If datalist doesn't autocomplete:
1. Ensure `<datalist id="medicalStaffList">` exists
2. Verify input `list="medicalStaffList"` matches datalist ID

### If saves but changes don't persist:
1. Check controller stores data in `surgeryData` object
2. Verify `await Surgery.findByIdAndUpdate()` is called
3. Check database connection is working

---

## 📖 Related Documentation

- `EDIT_SURGERY_STAFF_MATERIALS_UPDATE.md` - Detailed implementation guide
- `EDIT_SURGERY_ENHANCEMENT_SUMMARY.md` - Complete feature overview
- `RBAC_IMPLEMENTATION.md` - Permission system details
- `SURGERY_LIFECYCLE_IMPLEMENTATION.md` - Surgery state management

---

## 🎯 Next Steps (Future Enhancements)

1. **Stock Adjustment** - Auto-update material stock on edit
2. **Audit Trail** - Log who changed what and when
3. **Confirmation Dialogs** - Warn before major changes
4. **Batch Operations** - Edit multiple surgeries at once
5. **Undo Functionality** - Revert to previous staff/materials config
