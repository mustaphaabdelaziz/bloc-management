# Quick Reference: Manual Surgery Code

## What Changed?

Surgery codes are now **manually entered** by users instead of auto-generated.

---

## User Experience

### Creating a Surgery
1. Navigate to **"Nouvelle Chirurgie"**
2. **Enter a unique code** (e.g., `CH-2025-001`, `SALLE-A-001`)
3. Fill in patient, surgeon, prestation, etc.
4. Submit form
5. System validates code uniqueness; shows error if duplicate

### Editing a Surgery
1. Navigate to surgery edit page
2. **Code field is now editable** (previously read-only)
3. Change code if needed (must still be unique)
4. Save changes

---

## Code Format Examples

Users can choose any format. Suggestions:
- `CH-2025-001` ← Clinic + Year + Sequence
- `HERNIE-25-001` ← Type + Year + Sequence
- `DR-SMITH-001` ← Surgeon + Sequence
- `SALLE-A-15` ← Room + Bed
- `2025-11-25-001` ← Full date + Sequence

**Key rule:** Must be unique across the system.

---

## Error Messages

| Scenario | Message |
|----------|---------|
| Code not entered | "Le code de chirurgie est obligatoire" |
| Code already exists | `Le code "X" est déjà utilisé. Veuillez choisir un code unique.` |

---

## Technical Details

### Database
- `code` is **required** and **unique indexed**
- Type: `String`
- No auto-generation on save

### Validation Points
1. **Create form** → Checks code not empty + not duplicate
2. **Edit form** → Checks code not empty + not duplicate (if changed)
3. **Model** → Database constraint enforces uniqueness

### Files Updated
- `models/Surgery.js` – Schema + removed pre-save hook
- `controller/surgery.controller.js` – Validation in create/update
- `views/surgeries/new.ejs` – Added code input + preview
- `views/surgeries/edit.ejs` – Made code editable

---

## For Existing Surgeries

- ✅ All existing codes (auto-generated format) still work
- ✅ No data migration needed
- ✅ New surgeries must have manual codes

---

## Support

If code validation fails:
1. Check error message in flash notification
2. If "already used" → choose a different code
3. If "obligatoire" → fill in the code field

Contact admin if you see database-level errors.
