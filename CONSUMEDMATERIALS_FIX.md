# consumedMaterials Insertion - Issue Analysis & Fix

## Problem Identified

When creating a surgery with materials, the `consumedMaterials` array is empty because the hidden input fields (`consumableMaterialId` and `patientMaterialId`) are not being populated with the material MongoDB IDs.

**Evidence from server logs:**
```
"consumableMaterialId": ["", ""],  ← EMPTY!
"patientMaterialId": "",            ← EMPTY!
```

## Root Cause

The form has:
1. Visible text input: `<input name="consumableMaterialName" list="...">` 
2. Hidden input: `<input type="hidden" name="consumableMaterialId">`

The hidden input was never getting populated because the datalist option `value` attribute contained the **material ID** instead of the **designation** that users would type/select.

The JavaScript handler `setupDatalistHandler()` tries to match:
- User's selection/input: "Broche de Kirschner N° 1,5" (the designation)
- Datalist option value: "507f1f77bcf86cd799439011" (the material ID)

Since these don't match, the hidden input never gets the material ID!

## Solution Applied

Changed the datalist option `value` attribute from material ID to designation:

### Before:
```html
<option value="<%= mat._id %>">
    <%= mat.designation %>
</option>
```

### After:
```html
<option value="<%= mat.designation %>" data-id="<%= mat._id %>">
    <%= mat.designation %>
</option>
```

Now the matching works:
1. User selects "Broche de Kirschner N° 1,5" from datalist
2. JavaScript matches this value in datalist options
3. Extracts `data-id` attribute containing the MongoDB ID
4. Populates hidden input with the ID

## Files Modified

1. **views/surgeries/new.ejs** - Updated datalist for consumable and patient materials (lines 315-341)
2. **views/surgeries/new.ejs** - Updated window.consumableMaterialOptions and window.patientMaterialOptions (lines 509-536)
3. **controller/surgery.controller.js** - Added detailed DEBUG logging to trace material processing

## How to Verify the Fix

1. Navigate to: http://localhost:7777/surgeries/new
2. Fill in the surgery form
3. In the "Matériaux Consommables" section:
   - Type or select "Broche de Kirschner" (should autocomplete)
   - Enter quantity "2"
4. In the "Matériaux Patient" section:
   - Type or select another material
   - Enter quantity "3"
5. Submit the form
6. **Expected result**: The "Matériaux Utilisés" section should show the added materials

## Testing in Browser Console

Open DevTools (F12) and check the Network tab when submitting the form:

**BEFORE FIX** (WRONG):
```
consumableMaterialId: ["", ""]
consumableMaterialQuantity: ["2", "1"]
patientMaterialId: ""
patientMaterialQuantity: "1"
```

**AFTER FIX** (CORRECT):
```
consumableMaterialId: ["507f1f77bcf86cd799439011", "...]
consumableMaterialQuantity: ["2", "1"]
patientMaterialId: "507f1f77bcf86cd799439012"
patientMaterialQuantity: "1"
```

## Server Debugging Output

The controller now logs each material processed. In the server terminal (npm run dev output), you should see:

```
DEBUG - Processing consumed materials...
DEBUG - consumableMaterialId: ["507f1f77bcf86cd799439011"]
DEBUG - consumableMaterialQuantity: ["2"]
DEBUG - Processing 1 consumable materials
DEBUG - [0] materialId: "507f1f77bcf86cd799439011", quantity: "2"
DEBUG - Added consumable: Broche de Kirschner x2 @ 13000/unit
DEBUG - Total consumed materials to save: 1
```

## What Changed in the setupDatalistHandler Function

No code changes needed - the function already handles this correctly:

```javascript
// Extracts the data-id attribute if option value doesn't match
const attrValue = opts[i].getAttribute(attr) || opts[i].value;
hiddenInput.value = attrValue;
```

With the fix, when user selects "Broche de Kirschner N° 1,5":
1. `opts[i].value === "Broche de Kirschner N° 1,5"` ✓ MATCHES
2. `opts[i].getAttribute('data-id')` returns the MongoDB ID ✓ EXTRACTED
3. `hiddenInput.value` is set to the MongoDB ID ✓ POPULATED

## Next Steps

1. **Test the fix** by creating a surgery with materials
2. **Verify materials display** in the surgery show page "Matériaux Utilisés" section
3. **Check server logs** for DEBUG output confirming material processing
4. **Verify fees** are recalculated correctly based on material costs

If materials still don't display after this fix, run `node test-consumed-materials-fix.js` to verify the database insertion logic works independently.
