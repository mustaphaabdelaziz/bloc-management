# Prestation Excel Import Feature

## Overview
This feature allows administrators and direction users to bulk import prestations (surgical procedures) from an Excel file (.xlsx or .xls) instead of manually creating each one through the UI.

## Files Created/Modified

### New Files
1. **`public/js/prestation.js`** - Client-side validation and form handling
2. **`views/prestations/import-results.ejs`** - Results page after import
3. **`scripts/generate-test-excel.js`** - Script to generate test Excel files

### Modified Files
1. **`routes/prestation.routes.js`** - Added POST `/prestations/import` route with multer middleware
2. **`controller/prestation.controller.js`** - Added `importPrestations()` function
3. **`views/prestations/index.ejs`** - Added import button and modal UI
4. **`package.json`** - Added `xlsx` dependency (via `npm install xlsx`)

## Features

### Import Modal
- Located in prestation list page (accessed via "Importer Excel" button)
- File upload with drag-and-drop support
- Real-time file validation (type, size)
- Download template button to get a pre-formatted Excel file
- Clear instructions on required/optional columns

### Data Validation
- **Required fields:** Designation, Specialty (must exist), Prix HT, Duration, TVA
- **Optional fields:** Code (auto-generates if empty), exceededDurationUnit, exceededDurationFee, urgentFeePercentage
- **Error handling:** Per-row validation with detailed error messages
- **Numeric validation:** Automatic parsing and type checking
- **Percentage conversion:** TVA and urgent fees converted from % to decimals

### Excel Template
Download pre-formatted Excel template with:
- Column headers in French
- 3 example rows
- Proper formatting and column widths

### Import Results Page
Shows:
- Summary cards (total rows, imported count, error count)
- Detailed error table with row numbers and error messages
- Advice on fixing common errors
- Link back to prestation list

## Usage

### For End Users
1. Go to Prestation Management page (`/prestations`)
2. Click "Importer Excel" button
3. (Optional) Click "Télécharger le modèle" to download the template
4. Select your Excel file (.xlsx or .xls)
5. File validation happens automatically
6. Click "Importer" to start the upload
7. View results with success/error summary

### For Developers
```javascript
// Test import with sample data
node scripts/generate-test-excel.js
// Creates: test-prestations.xlsx
```

## Excel File Format

### Required Columns (must exist in header row)
| Column | Type | Example | Notes |
|--------|------|---------|-------|
| Désignation | Text | Pontage Aorto-Coronarien | Prestation name |
| Spécialité | Text | Cardiologie | Must match existing specialty |
| Prix HT (DA) | Number | 250000 | Must be positive |
| Durée (minutes) | Number | 120 | Must be positive |
| TVA (%) | Number | 9 | Entered as %, stored as decimal (0.09) |

### Optional Columns
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| Code | Text | Auto-generated | Leave empty to auto-generate |
| Unité Dépassement (min) | Number | 15 | Time unit for overage fees |
| Frais Dépassement (DA) | Number | 0 | Fee per time unit |
| Frais Urgents (%) | Number | 0 | Urgent surcharge (0-100%) |

### Column Name Matching
The import is flexible with column names:
- Case-insensitive matching (e.g., "DESIGNATION", "designation", "Designation")
- Whitespace trimmed automatically
- French special characters supported (é, è, ê, etc.)

Examples of matching variations:
- "Désignation" = "Designation" = "désignation" = "DESIGNATION"
- "Spécialité" = "Specialite" = "spécialité"

## Technical Details

### Server-Side Processing
```javascript
POST /prestations/import
- Authentication: Required (isLoggedIn)
- Authorization: admin or direction only
- File size limit: 5 MB
- File types: .xlsx, .xls only
- Storage: Memory (not disk)
- Processing: 
  1. Parse Excel using xlsx library
  2. Validate each row
  3. Look up specialty by name
  4. Convert percentages to decimals
  5. Create Prestation documents
  6. Return results view
```

### Error Handling
- **Missing file:** Redirect with error message
- **Empty file:** Redirect with error message
- **Invalid file format:** Multer catches and returns error
- **Per-row errors:** Collected and displayed on results page
- **Partial success:** Valid rows inserted even if some rows fail
- **Duplicate codes:** Skipped with error message

### Data Transformations
```javascript
// TVA: 9 (percentage) → 0.09 (decimal)
tva: parseFloat(tvaInput) / 100

// Urgent fee: 10 (percentage) → 0.10 (decimal), clamped 0-1
urgentFeePercentage: Math.min(1, Math.max(0, parseFloat(urgentFeeInput) / 100))

// Specialty name lookup
specialtyMap[specialtyName.toLowerCase().trim()] → ObjectId
```

### Client-Side Validation
- File type check (.xlsx, .xls)
- File size check (5 MB max)
- Visual feedback with error/info messages
- Loading state during upload
- Template download via XLSX library (in-browser generation)

## Security

### Authentication & Authorization
- Must be logged in (checked by `isLoggedIn` middleware)
- Must have admin or direction role (checked by `ensureAdminOrDirection`)
- Respects RBAC system

### File Upload Security
- File stored in memory (not disk), processed immediately
- MIME type validation
- File extension validation
- Size limit (5 MB)
- No file execution risk (Excel data only)

## Dependencies

### New External Library
- `xlsx` (v0.18.5+) - Excel file parsing
  - Installed via: `npm install xlsx`
  - CDN version included in template download: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`

### Existing Dependencies
- `multer` - File upload (already in project)
- `express` - Web framework
- `mongoose` - Database operations
- `catchAsync` - Error wrapper utility

## Testing

### Manual Testing Steps
1. Start server: `npm run dev`
2. Login as admin or direction user
3. Navigate to `/prestations`
4. Click "Importer Excel"
5. Download template or select `test-prestations.xlsx`
6. Click "Importer"
7. Verify results page shows 5 imported prestations
8. Check prestation list for new entries

### Test Cases Included
- Valid import with all required fields
- Mixed valid/invalid rows (partial success)
- Duplicate specialty handling
- Missing required fields
- Invalid numeric values
- Non-existent specialty names

### Test Excel File
Location: `test-prestations.xlsx`
Contains:
- 5 valid test prestations
- Various specialties (Cardiologie, Chirurgie Générale, Gynécologie)
- Different price points and durations

## Troubleshooting

### Import Modal Not Appearing
- Verify user role includes admin or direction
- Check browser console for JavaScript errors
- Verify Bootstrap is loaded (required for modal)

### File Upload Fails
- Check file size (max 5 MB)
- Verify file format (.xlsx or .xls only)
- Check file is not corrupted
- Check browser console for network errors

### Specialty Not Found
- Verify specialty name matches exactly (case-insensitive)
- Check specialty exists in database
- Navigate to Specialty management to create if missing

### Rows Imported but No Data
- Check database connection
- Verify MongoDB is running
- Check browser console for server errors

## Performance Considerations

- **Memory usage:** Entire file buffered in memory (5 MB max)
- **Database operations:** Bulk insertions via Mongoose (sequential, not parallelized)
- **Large imports:** 5 MB = ~1000-10000 rows depending on data
- **Optimization possible:** Could batch insert if needed

## Future Enhancements

1. **CSV Support** - Add ability to import from CSV files
2. **Column Mapping** - Allow users to specify column order/names
3. **Template Updates** - Auto-generate template with actual specialties
4. **Batch Processing** - For very large files (>100K rows)
5. **Duplicate Detection** - More sophisticated duplicate checking
6. **Roll-back** - Ability to undo failed imports
7. **Audit Logging** - Track all import attempts and results
8. **Email Notifications** - Send results to user via email

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for JavaScript errors
3. Check server logs for backend errors
4. Verify all files are in correct locations
5. Ensure xlsx library is installed: `npm install xlsx`
