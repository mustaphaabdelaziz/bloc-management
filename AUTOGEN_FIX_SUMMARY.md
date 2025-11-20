# Auto-Code Generation - Fix Summary

## Problem Identified
**Error:** `Validation failed: code: Path 'code' is required.`

**Root Cause:** Mongoose validates required fields **before** pre-save hooks execute. Even though the pre-save hook generates the code, Mongoose's validation middleware was rejecting the document because the `code` field had `required: true`.

## Solution Applied

### What Was Changed

#### 1. **Fonction.js** (Line 6-9)
```javascript
// BEFORE
code: {
  type: String,
  required: true,
  unique: true,
}

// AFTER
code: {
  type: String,
  unique: true,
  sparse: true,
}
```

#### 2. **Prestation.js** (Line 6-9)
```javascript
// BEFORE
code: {
  type: String,
  required: true,
  unique: true
}

// AFTER
code: {
  type: String,
  unique: true,
  sparse: true
}
```

#### 3. **Surgery.js** (Line 5-9)
```javascript
// BEFORE
code: {
  type: String,
  required: true,
  unique: true,
}

// AFTER
code: {
  type: String,
  unique: true,
  sparse: true,
}
```

### Key Changes Explained

1. **Removed `required: true`**
   - Allows documents to be saved without a code initially
   - The pre-save hook will add the code before validation completes
   - Prevents validation errors from blocking the save

2. **Added `sparse: true`**
   - Tells MongoDB to ignore `null` values when enforcing uniqueness
   - Prevents multiple documents with `null` codes from violating the unique constraint
   - Critical for the window between validation and code generation

### How It Works Now

**Execution Order:**
```
1. Document created without code
2. .save() called
3. Mongoose runs pre-save hooks FIRST
4. Pre-save hook generates code and sets this.code
5. Mongoose validation runs (now code exists, passes validation)
6. Document saved to database with auto-generated code
```

## Test Verification

Run the included test script to verify all three entities:
```bash
node test-autogen.js
```

Expected output:
```
✅ Fonction created with auto-generated code
✅ Prestation created with auto-generated code
✅ Surgery created with auto-generated code
```

## Code Patterns (After Fix)

### Fonction Pattern: `FCT0001`
```javascript
// No code required in request body
const fonction = new Fonction({
  name: "Anesthésiste"
  // code auto-generates
});
await fonction.save(); // code now: "FCT0001"
```

### Prestation Pattern: `CO-ORT-0001`
```javascript
// No code required in request body
const prestation = new Prestation({
  designation: "Opération",
  specialty: specialtyId, // Must provide specialty
  // code auto-generates based on specialty
});
await prestation.save(); // code now: "CO-ORT-0001"
```

### Surgery Pattern: `2025/00001`
```javascript
// No code required in request body
const surgery = new Surgery({
  patient: patientId,
  surgeon: surgeonId,
  prestation: prestationId,
  // code auto-generates based on current year
});
await surgery.save(); // code now: "2025/00001"
```

## No Breaking Changes

- ✅ Controllers already exclude code from request body (no changes needed)
- ✅ Forms already have code removed/readonly (no changes needed)
- ✅ Existing database records unaffected (pre-save hooks only run on new docs)
- ✅ Backward compatible with existing code patterns

## Files Modified

1. `models/Fonction.js` - Line 6-9
2. `models/Prestation.js` - Line 6-9
3. `models/Surgery.js` - Line 5-9

## Rollback Plan

If needed, restore original `required: true` in code fields, but this will require removing auto-generation or always sending code from controllers.

## Next Steps

1. Test with the provided `test-autogen.js` script
2. Try creating records through the UI forms
3. Verify codes auto-generate correctly
4. Check browser network tab to ensure forms don't send code field
