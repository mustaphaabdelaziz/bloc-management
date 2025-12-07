# 🔗 API Contract: Surgery Edit Form Enhancement

## Endpoint Details

### GET /surgeries/:id/edit
Render the surgery edit form with medical staff and materials sections.

#### Response Data Structure
```javascript
{
  title: "Modifier Chirurgie",
  
  surgery: {
    _id: ObjectId,
    code: String,
    patient: ObjectId,
    surgeon: ObjectId,
    prestation: ObjectId,
    
    // Medical Staff (populated)
    medicalStaff: [
      {
        _id: ObjectId,
        staff: {
          _id: ObjectId,
          firstName: String,
          lastName: String,
          // ... full MedicalStaff document
        },
        rolePlayedId: {
          _id: ObjectId,
          name: String,
          // ... full Fonction document
        }
      }
    ],
    
    // Consumed Materials (populated)
    consumedMaterials: [
      {
        _id: ObjectId,
        material: {
          _id: ObjectId,
          designation: String,
          category: String, // "consumable" | "patient"
          stock: Number,
          unitOfMeasure: String,
          priceHT: Number,
          weightedPrice: Number,
          // ... full Material document
        },
        quantity: Number,
        priceUsed: Number // Frozen at creation
      }
    ],
    
    // Other fields
    status: String, // "planned" | "urgent"
    statusLifecycle: String, // "open" | "closed"
    notes: String,
    adjustedPrice: Number,
    applyExtraFees: Boolean,
    // ... other surgery fields
  },
  
  // Lookup Data
  patients: [
    {
      _id: ObjectId,
      firstName: String,
      lastName: String,
      code: String
    }
  ],
  
  surgeons: [
    {
      _id: ObjectId,
      firstName: String,
      lastName: String,
      specialty: { _id: ObjectId, name: String },
      contractType: String
    }
  ],
  
  prestations: [
    {
      _id: ObjectId,
      designation: String,
      specialty: { _id: ObjectId, name: String },
      duration: Number,
      priceHT: Number
    }
  ],
  
  medicalStaff: [
    {
      _id: ObjectId,
      firstName: String,
      lastName: String,
      fonctions: [
        {
          _id: ObjectId,
          name: String
        }
      ]
    }
  ],
  
  fonctions: [
    {
      _id: ObjectId,
      name: String
    }
  ],
  
  materials: [
    {
      _id: ObjectId,
      designation: String,
      category: String, // "consumable" | "patient"
      stock: Number,
      unitOfMeasure: String,
      priceHT: Number,
      weightedPrice: Number
    }
  ],
  
  // Permissions
  canEditSurgeryFinancials: Boolean
}
```

---

### PUT /surgeries/:id
Update the surgery with new medical staff and materials.

#### Request Body Structure
```javascript
{
  // Basic Fields
  patient: ObjectId,
  surgeon: ObjectId,
  prestation: ObjectId,
  status: String, // "planned" | "urgent"
  
  // Dates
  entreeBloc: Date,
  entreeSalle: Date,
  incisionTime: Date,
  closingIncisionTime: Date (optional),
  sortieSalle: Date (optional),
  
  // Financial
  adjustedPrice: Number (optional),
  applyExtraFees: Boolean,
  
  // Notes
  notes: String,
  
  // ===== NEW: Medical Staff Arrays =====
  // Both arrays must be present and same length
  medicalStaff: [
    "ObjectId_1",      // Staff member 1
    "ObjectId_2",      // Staff member 2
    "ObjectId_3"       // Staff member 3
  ],
  rolePlayedId: [
    "ObjectId_role1",  // Role for staff 1
    "ObjectId_role2",  // Role for staff 2
    "ObjectId_role3"   // Role for staff 3
  ],
  
  // ===== NEW: Consumable Materials Arrays =====
  // Both arrays must be present and same length
  consumableMaterialId: [
    "ObjectId_mat1",   // Material 1
    "ObjectId_mat2"    // Material 2
  ],
  consumableMaterialQuantity: [
    10,                // Quantity for material 1
    5                  // Quantity for material 2
  ],
  
  // ===== NEW: Patient Materials Arrays =====
  // Both arrays must be present and same length
  patientMaterialId: [
    "ObjectId_patmat1", // Patient material 1
    "ObjectId_patmat2"  // Patient material 2
  ],
  patientMaterialQuantity: [
    2,                 // Quantity for material 1
    3                  // Quantity for material 2
  ]
}
```

#### Processing Rules (Controller)

**Medical Staff:**
```javascript
// Only include if:
// 1. medicalStaff array exists
// 2. rolePlayedId array exists
// 3. Both arrays have same length (by index mapping)
// 4. Each entry has non-empty staff AND non-empty role
// 5. After trim()

// Example: If submitted with empty role for index 0
{
  medicalStaff: ["staffId1", "staffId2"],
  rolePlayedId: ["", "roleId2"]  // Empty for index 0
}

// Result: Only index 1 is included
surgeryData.medicalStaff = [
  { staff: "staffId2", rolePlayedId: "roleId2" }
]
```

**Consumable Materials:**
```javascript
// Only include if:
// 1. consumableMaterialId array exists
// 2. consumableMaterialQuantity array exists
// 3. Both arrays have same length (by index mapping)
// 4. Each entry has non-empty ID AND non-empty quantity
// 5. Material document exists in database
// 6. After trim()

// Material document must exist or entry is skipped
const materialDoc = await Material.findById(materialId);
if (materialDoc) {
  consumedMaterials.push({
    material: materialId,
    quantity: parseFloat(quantity),
    priceUsed: materialDoc.weightedPrice || materialDoc.priceHT || 0
  });
}
```

**Patient Materials:**
```javascript
// Same rules as consumable materials
// Stored in same consumedMaterials array
// Differentiated by material.category === 'patient'
```

#### Response
```javascript
// On Success (HTTP 302 Redirect)
Location: /surgeries/:id?success=Chirurgie%20modifiée%20avec%20succès

// On Authorization Error (HTTP 302 Redirect)
Location: /surgeries/:id?error=Accès%20non%20autorisé

// On Closed Surgery Error (HTTP 302 Redirect)
Location: /surgeries/:id?error=Cette%20chirurgie%20est%20clôturée

// On Validation Error (HTTP 302 Redirect)
Location: /surgeries/:id/edit?error=L'heure%20d'incision%20...
```

---

## Form Data Collection

### Medical Staff Example
```html
<!-- Row 1: Staff1 with Role1 -->
<input type="hidden" name="medicalStaff" value="staffId1">
<select name="rolePlayedId" style="display: none;">
  <option value="roleId1" selected></option>
</select>

<!-- Row 2: Staff2 with Role2 -->
<input type="hidden" name="medicalStaff" value="staffId2">
<select name="rolePlayedId" style="display: none;">
  <option value="roleId2" selected></option>
</select>

<!-- Form Posts:
  medicalStaff: ["staffId1", "staffId2"]
  rolePlayedId: ["roleId1", "roleId2"]
-->
```

### Materials Example
```html
<!-- Consumable Row 1 -->
<input type="hidden" name="consumableMaterialId" value="matId1">
<input type="number" name="consumableMaterialQuantity" value="10">

<!-- Consumable Row 2 -->
<input type="hidden" name="consumableMaterialId" value="matId2">
<input type="number" name="consumableMaterialQuantity" value="5">

<!-- Patient Row 1 -->
<input type="hidden" name="patientMaterialId" value="patMatId1">
<input type="number" name="patientMaterialQuantity" value="2">

<!-- Form Posts:
  consumableMaterialId: ["matId1", "matId2"]
  consumableMaterialQuantity: ["10", "5"]
  patientMaterialId: ["patMatId1"]
  patientMaterialQuantity: ["2"]
-->
```

---

## Data Validation & Transformation

### Input Validation Sequence
```
1. Check arrays exist
2. Verify array lengths match (staff ↔ roles, mat ↔ qty)
3. For each index:
   a. Extract and trim string values
   b. Check both value and counter exist (non-empty)
   c. For materials: verify document exists in DB
   d. For prices: freeze at update time
4. Build final arrays (only valid entries)
5. Replace existing arrays in database
```

### Example: Invalid Entry Filtering
```javascript
// Input
{
  medicalStaff: ["id1", "   ", "id3"],  // Whitespace in middle
  rolePlayedId: ["r1", "r2", "r3"]
}

// Processing
for (let i = 0; i < staffArray.length; i++) {
  if (staff && staff.trim() && role && role.trim()) {
    // Include
  }
  // staff.trim() = "" at index 1 → SKIP
}

// Output
surgeryData.medicalStaff = [
  { staff: "id1", rolePlayedId: "r1" },
  // index 1 skipped
  { staff: "id3", rolePlayedId: "r3" }
]
```

---

## Permission Requirements

### GET /surgeries/:id/edit
**Required Privileges:**
- `admin` → Full access
- `direction` → Full access
- `chefBloc` → Own surgeries only
- `medecin` → Own surgeries only

**Fields Hidden:**
- `adjustedPrice` (only if `!canEditSurgeryFinancials`)
- Financial data (for `assistante`)

### PUT /surgeries/:id
**Required Privileges:**
- `admin` → Can edit any surgery (including closed)
- `direction` → Can edit any open surgery
- `chefBloc` → Can edit any open surgery
- `medecin` → Can edit own surgeries only
- Others → Forbidden

**Additional Checks:**
- If `statusLifecycle === 'closed'`: Only `admin` can edit
- Medecin: Must be linked to surgery's surgeon

---

## Error Scenarios

### Scenario 1: Empty Staff Entry
```javascript
// Request
{ medicalStaff: ["id1"], rolePlayedId: [""] }

// Processing
// rolePlayedId[0].trim() === "" → Skip

// Result
surgeryData.medicalStaff = []  // No staff added
```

### Scenario 2: Invalid Material ID
```javascript
// Request
{ 
  consumableMaterialId: ["validId", "invalidId"],
  consumableMaterialQuantity: ["10", "5"]
}

// Processing
const invalidDoc = await Material.findById("invalidId"); // null
if (invalidDoc) { // false
  // Skip this entry
}

// Result
consumedMaterials = [
  { material: "validId", quantity: 10, priceUsed: ... }
]
```

### Scenario 3: Closed Surgery by Non-Admin
```javascript
// Request
PUT /surgeries/id (statusLifecycle: "closed")

// Processing
if (statusLifecycle === 'closed' && !userPriv.includes('admin')) {
  throw error("Surgery closed - admin only")
}

// Result
res.redirect(`/surgeries/${id}?error=...`)
```

---

## Database Updates

### Surgery Document After Update
```javascript
{
  _id: ObjectId,
  code: String,
  
  // Replaced Arrays
  medicalStaff: [
    {
      _id: ObjectId,
      staff: ObjectId,        // Reference to MedicalStaff
      rolePlayedId: ObjectId  // Reference to Fonction
    }
  ],
  
  consumedMaterials: [
    {
      _id: ObjectId,
      material: ObjectId,     // Reference to Material
      quantity: Number,
      priceUsed: Number       // Frozen at update time
    }
  ],
  
  // Updated Fields
  patient: ObjectId,
  surgeon: ObjectId,
  prestation: ObjectId,
  status: String,
  adjustedPrice: Number,
  applyExtraFees: Boolean,
  notes: String,
  // ... timestamps updated
}
```

### Fee Recalculation
```javascript
// After successful update:
await calculateSurgeonFees(surgeryId);

// Updates:
surgery.surgeonAmount = calculated
surgery.clinicAmount = calculated
```

---

## Response Headers & Status

### Success Response (HTTP 302)
```
Location: /surgeries/:id?success=Chirurgie%20modifiée%20avec%20succès
Set-Cookie: connect.sid=... (session maintained)
```

### Error Response (HTTP 302)
```
Location: /surgeries/:id/edit?error=Accès%20non%20autorisé
Set-Cookie: connect.sid=... (session maintained)
```

---

## Example Complete Flow

### Step 1: User opens edit form
```
GET /surgeries/123/edit
→ Controllers fetches surgery with populated staff + materials
→ Fetches lookup data
→ Renders form with pre-filled values
```

### Step 2: User modifies form
```
- Changes staff role: Staff1 role change
- Adds new staff: Staff3
- Edits material quantity: Material1 qty 10 → 15
- Removes material: Material2 deleted
```

### Step 3: User submits form
```
PUT /surgeries/123
{
  medicalStaff: ["staff1Id", "staff3Id"],      // Added Staff3
  rolePayedId: ["newRoleId", "staff3RoleId"],  // Changed Staff1 role
  consumableMaterialId: ["mat1Id"],            // Removed Mat2
  consumableMaterialQuantity: ["15"]           // Changed qty
}
```

### Step 4: Server processes
```
1. Validate authorization
2. Check surgery not closed (unless admin)
3. Filter empty entries (none in this case)
4. Verify material documents exist
5. Build medicalStaff array
6. Build consumedMaterials array
7. Update database
8. Recalculate fees
9. Redirect with success
```

### Step 5: Result
```
Database Updated:
  ✓ Staff1 role changed
  ✓ Staff3 added
  ✓ Staff2 removed (wasn't in form)
  ✓ Material1 qty updated
  ✓ Material2 removed (wasn't in form)
  ✓ Surgeon/clinic fees recalculated

Browser Redirected:
  Location: /surgeries/123?success=...
```

---

**API Version:** 1.0  
**Last Updated:** November 24, 2025  
**Status:** ✅ Production Ready
