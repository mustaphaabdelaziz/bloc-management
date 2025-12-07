# Specialty Excel Import - Quick Reference Guide

## What Was Added

### New Endpoints
```
GET  /specialties/template         → Download Excel template
POST /specialties/import           → Upload and import Excel file
```

### New Files
```
public/js/specialty.js                    → Client-side logic
views/specialties/import-results.ejs      → Import results display
```

### Modified Files
```
routes/speciality.routes.js               → Added routes and multer config
controller/speciality.controller.js       → Added import functions
views/specialties/index.ejs               → Added import button and modal
```

## How It Works

### Step 1: User Clicks Import
- Opens modal with file input
- Shows two download options for template

### Step 2: Download Template
- Browser: Generates XLSX on-the-fly using JS library
- Server: Direct download of pre-generated XLSX
- Template includes sample data and instructions

### Step 3: User Fills Template
```
Code     | Nom                    | Description
---------|------------------------|---------------------------
CARDIO   | Cardiologie           | Spécialité des maladies du cœur
CHGEN    | Chirurgie Générale    | Chirurgie générale
GYNECO   | Gynécologie           | Obstétrique et gynécologie
```

### Step 4: Upload File
- Validates file format (.xlsx, .xls)
- Checks file size (max 5MB)
- Submits to `/specialties/import`

### Step 5: Process & Display Results
- Server validates each row
- Checks for duplicates
- Displays summary with success/error count
- Shows detailed errors per row

## Key Features

✅ **Template Download** - Two methods (browser & server)
✅ **Flexible Columns** - Handles French & English column names
✅ **Error Reports** - Detailed per-row error messages
✅ **Duplicate Detection** - Prevents duplicate codes
✅ **Validation** - Required fields and data types
✅ **User Feedback** - Clear success/error messages
✅ **Permission Control** - Admin/Direction/HeadDepart only

## Column Requirements

### Required
- **Code** - Unique identifier (e.g., CARDIO)
- **Nom** - Full specialty name (e.g., Cardiologie)

### Optional
- **Description** - Details about the specialty

## Excel Template Format

Sheet 1: "Spécialités"
- Row 1: Headers
- Rows 2+: Data rows
- Column widths auto-adjusted

Sheet 2: "Instructions"
- Detailed guidelines
- Available specialties list
- Important notes

## Error Messages

Common errors reported:
- "Code manquant" - Missing code value
- "Nom manquant" - Missing name value
- "Code \"CARDIO\" existe déjà" - Duplicate code
- Invalid data type errors

## Testing Commands

### Syntax Check
```bash
node -c controller/speciality.controller.js
node -c routes/speciality.routes.js
```

### Manual Testing
1. Navigate to /specialties
2. Click "Importer Excel" button
3. Download template
4. Fill with test data
5. Upload and verify results

## Code Examples

### Template Download
```javascript
GET /specialties/template
Response: Excel file with sample data
```

### Import Data
```javascript
POST /specialties/import
Body: multipart/form-data with excelFile
Response: Renders import-results.ejs with summary
```

### JavaScript Integration
```html
<script src="/js/specialty.js"></script>
<button onclick="showImportModal()">Import</button>
```

## Permissions

| Action | Allowed Roles |
|--------|---------------|
| View | All authenticated |
| Import | admin, direction, headDepart |
| Download Template | admin, direction, headDepart |

## Security Features

✅ File type validation
✅ File size limit (5MB)
✅ MIME type checking
✅ SQL injection prevention (Mongoose)
✅ Role-based access control

## Performance Considerations

- Uses memory storage (no disk I/O)
- Streams file buffer
- Batch processes rows
- No file cleanup needed
- Max file size 5MB

## Troubleshooting

| Issue | Solution |
|-------|----------|
| XLSX library not found | Check CDN link in view |
| File too large | Keep under 5MB |
| Invalid format | Use .xlsx or .xls |
| Duplicate code error | Check existing specialties |
| Permission denied | Verify user role |

## Future Enhancements

Possible additions:
- Bulk update capability
- Template with current specialties
- Progress bar for large imports
- Email confirmation
- Import history logging
- Rollback on error option
