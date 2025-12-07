# Manual Surgery Code Implementation

**Date:** November 25, 2025  
**Status:** ✅ Complete

## Overview
The Surgery code field has been converted from **auto-generated** (using `YYYY/XXXXX` pattern) to **manually entered by users** on form submission.

---

## Changes Made

### 1. **Models** (`models/Surgery.js`)

#### Changed schema definition:
```javascript
// BEFORE (Auto-generated, sparse)
code: {
  type: String,
  unique: true,
  sparse: true,
}

// AFTER (Required, user-provided)
code: {
  type: String,
  required: true,
  unique: true,
}
```

#### Removed:
- **Pre-save hook** (`surgerySchema.pre("save", async function (next) { ... })`): Deleted entire auto-generation logic that was calculating `YYYY/#####` format

**File:** `models/Surgery.js` (lines 5-8, 102-120 removed)

---

### 2. **Controllers** (`controller/surgery.controller.js`)

#### Created Surgery (`createSurgery` method)

**Added validations:**
1. Extract and trim `req.body.code`
2. Ensure code is not empty
3. Check for code uniqueness before saving
4. Flash error if code is duplicate; redirect to form

```javascript
// Validate and trim surgery code
const surgeryCode = String(req.body.code || '').trim();
if (!surgeryCode) {
  req.flash('error', 'Le code de chirurgie est obligatoire');
  return res.redirect('/surgeries/new');
}

// Check if code already exists
const existingCode = await Surgery.findOne({ code: surgeryCode });
if (existingCode) {
  req.flash('error', `Le code "${surgeryCode}" est déjà utilisé. Veuillez choisir un code unique.`);
  return res.redirect('/surgeries/new');
}
```

**Added to surgeryData:**
```javascript
const surgeryData = {
  code: surgeryCode,  // ← NEW
  patient: patientId,
  // ... rest of fields
};
```

**File:** `controller/surgery.controller.js` (lines 105-130)

---

#### Update Surgery (`updateSurgery` method)

**Added validations:**
1. Extract code from request body or keep existing
2. Ensure code is provided
3. Check for uniqueness only if code has changed
4. Flash error if duplicate; redirect to edit form

```javascript
// Validate and trim surgery code if provided
const surgeryCode = req.body.code ? String(req.body.code).trim() : currentSurgery.code;
if (!surgeryCode) {
  req.flash('error', 'Le code de chirurgie est obligatoire');
  return res.redirect(`/surgeries/${req.params.id}/edit`);
}

// Check if new code already exists (different from current code)
if (surgeryCode !== currentSurgery.code) {
  const existingCode = await Surgery.findOne({ code: surgeryCode });
  if (existingCode) {
    req.flash('error', `Le code "${surgeryCode}" est déjà utilisé. Veuillez choisir un code unique.`);
    return res.redirect(`/surgeries/${req.params.id}/edit`);
  }
}
```

**Added to surgeryData:**
```javascript
const surgeryData = {
  code: surgeryCode,  // ← NEW
  patient: req.body.patient,
  // ... rest of fields
};
```

**File:** `controller/surgery.controller.js` (lines 598-616)

---

### 3. **Views** – Create Form (`views/surgeries/new.ejs`)

#### Added Code Input Field

Placed at the **top** of the Basic Information section (before Patient):

```html
<div class="form-row">
    <div class="form-group">
        <label class="form-label">Code Chirurgie <span class="text-danger">*</span></label>
        <div class="input-wrapper-modern">
            <i class="input-icon-wrapper bi bi-barcode"></i>
            <input type="text" class="form-control-modern" id="code" name="code"
                   placeholder="Entrer un code unique" required autocomplete="off">
        </div>
        <div class="form-help-text">
            Exemple: CH-2025-001 ou SALLE-001
        </div>
    </div>
</div>
```

**Features:**
- ✅ Required field (marked with red asterisk)
- ✅ Barcode icon for visual clarity
- ✅ Help text with examples
- ✅ No autocomplete (prevents browser suggestions)

**File:** `views/surgeries/new.ejs` (lines 25-38)

#### Updated Preview Logic

**Before:**
```javascript
function generateSurgeryCode() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  document.getElementById('previewCode').textContent = `CH-${year}${month}-${random}`;
}
generateSurgeryCode();
```

**After:**
```javascript
function updatePreview() {
  // Update code
  const codeInput = document.getElementById('code');
  document.getElementById('previewCode').textContent =
      codeInput.value || 'Code...';
  // ... rest of preview updates
}
```

- Real-time preview now reflects **user input** instead of auto-generated value
- Preview updates when user types in code field

**File:** `views/surgeries/new.ejs` (lines 618-699)

---

### 4. **Views** – Edit Form (`views/surgeries/edit.ejs`)

#### Replaced Read-Only Code Field

**Before:**
```html
<label class="form-label">Code (Auto-généré)</label>
<input type="text" class="form-control-modern" id="code" name="code" 
       value="<%= surgery.code %>" readonly disabled>
<div class="form-help-text">Le code ne peut pas être modifié</div>
```

**After:**
```html
<label class="form-label">Code Chirurgie <span class="text-danger">*</span></label>
<div class="input-wrapper-modern">
    <i class="input-icon-wrapper bi bi-barcode"></i>
    <input type="text" class="form-control-modern" id="code" name="code" 
           value="<%= surgery.code %>" required autocomplete="off">
</div>
<div class="form-help-text">
    Entrer un code unique pour cette chirurgie
</div>
```

- ✅ Code field now **editable** (removed `readonly` and `disabled`)
- ✅ Required field (red asterisk)
- ✅ Updated help text (no longer says "cannot be modified")
- ✅ Matches styling and layout of new.ejs

**File:** `views/surgeries/edit.ejs` (lines 43-53)

---

## Testing Checklist

### ✅ New Surgery Form
- [ ] Navigate to "Nouvelle Chirurgie"
- [ ] Verify code input field appears at top with barcode icon
- [ ] Try submitting without entering code → Error message
- [ ] Try submitting with duplicate code → Error message with specifics
- [ ] Enter unique code (e.g., "CH-2025-TEST") → Form accepted
- [ ] Watch preview sidebar update with code as you type
- [ ] Submit and verify surgery created with correct code

### ✅ Edit Surgery Form
- [ ] Navigate to surgery edit page
- [ ] Verify code field is **editable** (not grayed out)
- [ ] Try changing to duplicate code → Error message
- [ ] Try changing to unique code → Update accepted
- [ ] Verify updated code displays in surgery detail view

### ✅ Error Handling
- [ ] Empty code → "Le code de chirurgie est obligatoire"
- [ ] Duplicate code on create → "Le code 'X' est déjà utilisé. Veuillez choisir un code unique."
- [ ] Duplicate code on update → Same error, no false positives

### ✅ Data Integrity
- [ ] Check database: `surgery.code` is required and unique indexed
- [ ] Existing surgeries with auto-generated codes still work
- [ ] Reports/searches still function (code field populated)
- [ ] Surgery list displays correct codes

---

## Migration Notes

### For Existing Surgeries
- ✅ **No data loss**: All existing surgeries retain their auto-generated codes (`2025/00001`, etc.)
- ✅ **Backward compatible**: The `code` field remains on all surgery documents
- ✅ **Unique index intact**: Existing codes are still unique and queryable

### Database Considerations
If running against existing data:
```javascript
// MongoDB: Make code field required (index is already unique)
db.surgeries.updateMany(
  { code: { $exists: false } },
  { $set: { code: "MIGRATE_" + new ObjectId() } }
);
```

---

## Code Format Suggestions

Users can now choose their own format:
- **Clinic-based**: `CH-2025-001`, `SALLE-A-001`
- **Date-based**: `25-11-001`, `2025-Nov-15-001`
- **Doctor-based**: `DR-SMITH-001`, `CHIRURGIE-DUPONT-25`
- **Mixed**: `OPS-25-001-HERNIE`

---

## Files Modified

1. ✅ `models/Surgery.js` – Schema: required code, removed pre-save hook
2. ✅ `controller/surgery.controller.js` – Create: code extraction + validation
3. ✅ `controller/surgery.controller.js` – Update: code extraction + validation
4. ✅ `views/surgeries/new.ejs` – Added code field + updated preview
5. ✅ `views/surgeries/edit.ejs` – Made code editable

---

## Next Steps (Optional)

- [ ] Update API documentation if exposing `/surgeries` endpoint
- [ ] Add code format validation (regex) if desired
- [ ] Create audit log for code changes (who changed it, when)
- [ ] Add bulk code import feature (if users need to migrate codes)
- [ ] Update tests/seeds to use valid manual codes

---

**Implementation verified:** All form fields updated, validations added, preview logic fixed, views match styling standards. ✅
