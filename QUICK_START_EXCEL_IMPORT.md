# ⚡ Excel Import - Quick Start Guide

## 30-Second Setup

```bash
# Already done! xlsx is installed. Just start your server:
npm run dev
```

## 1-Minute Test

1. Open browser → `http://localhost:3000/prestations` (or your port)
2. Login as **admin** or **direction** user
3. Click green **"Importer Excel"** button
4. Select file: `test-prestations.xlsx` (in project root)
5. Click **"Importer"**
6. ✅ See results: 5 prestations imported!

## What Happened

- 5 test prestations were added to database
- Each has name, specialty, price, duration
- All can be edited/deleted normally
- Appears in prestation list immediately

## Create Your Own Excel File

### Option 1: Use Template (Easiest)
1. Click "Importer Excel" button
2. Click "Télécharger le modèle" (Download Template)
3. Edit the downloaded file
4. Upload it back

### Option 2: Create From Scratch
Create Excel with these columns:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Code | Désignation | Spécialité | Prix HT (DA) | TVA (%) | Durée (minutes) |
| (leave empty) | Chirurgie ABC | Cardiologie | 200000 | 9 | 100 |

**Rules:**
- Code: Leave empty (auto-generates) OR enter unique value
- Désignation: Required, any text
- Spécialité: Required, must exist in system
- Prix HT: Required, number only, positive
- TVA: Required, number (9 or 19 typically)
- Durée: Required, number only, positive

Optional columns (if needed):
- Unité Dépassement (min) - default 15
- Frais Dépassement (DA) - default 0
- Frais Urgents (%) - default 0

## Troubleshooting

### "Seuls les fichiers Excel (.xlsx, .xls) sont autorisés"
→ Use .xlsx or .xls format, not .csv or .ods

### "Spécialité non trouvée"
→ Check the specialty name matches exactly (Cardiologie, not cardio)

### "Prix HT invalide"
→ Make sure the value is a number, not text

### "Aucune prestation trouvée" after import
→ Check browser console for errors
→ Verify specialty exists before importing

### Only some rows imported
→ Check results page - errors are listed per row
→ Fix those rows and re-import

## Advanced: Generate Test Files

```bash
node scripts/generate-test-excel.js
# Creates: test-prestations.xlsx (overwrites existing)
```

## File Locations

- UI Button: `/prestations` page
- Import Route: `POST /prestations/import`
- Test File: `/test-prestations.xlsx` (root)
- Documentation: `/PRESTATION_IMPORT_FEATURE.md`
- Source Code:
  - Backend: `controller/prestation.controller.js`
  - Frontend: `public/js/prestation.js`
  - UI: `views/prestations/index.ejs`

## Common Tasks

### View Import Results
Results shown immediately after import:
- ✅ Success count
- ❌ Error count (if any)
- Detailed error list with row numbers

### Download Template
Click button in the import modal:
`<button id="downloadTemplate">Télécharger le modèle</button>`

### Generate Test Data
```bash
node scripts/generate-test-excel.js
```

### Import Custom File
1. Prepare Excel with your data
2. Follow column format rules
3. Upload via modal
4. Review results

### Export Prestations
Not implemented yet. Current options:
- Manual copy from UI table
- Database query
- API export (future feature)

## Limits

- Max file size: 5 MB
- File formats: .xlsx, .xls only
- Per-row errors shown in results
- Valid rows inserted even if some fail
- No duplicate checking on designation

## Security

✅ Must be logged in  
✅ Must be admin/direction role  
✅ File validated (type + size)  
✅ File stored in memory only  
✅ No code execution risk  

## Next Steps

**For Users:**
1. Download template
2. Fill with your data
3. Import
4. Done! Prestations are ready to use

**For Developers:**
1. Read `PRESTATION_IMPORT_FEATURE.md` for detailed specs
2. Review code in `controller/prestation.controller.js`
3. Check test file: `test-prestations.xlsx`
4. Run testing checklist: `EXCEL_IMPORT_TESTING_CHECKLIST.md`

## Questions?

See documentation files:
- **`PRESTATION_IMPORT_FEATURE.md`** - Complete reference
- **`EXCEL_IMPORT_IMPLEMENTATION.md`** - What changed
- **`EXCEL_IMPORT_TESTING_CHECKLIST.md`** - How to test

---

**That's it!** Feature is ready to use. 🚀
