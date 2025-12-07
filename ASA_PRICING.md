# ASA Classification & Pricing System

## Overview

The ASA (American Society of Anesthesiologists) classification system has been integrated into the surgery management system to assess patient physical health status before surgical intervention and apply appropriate pricing adjustments.

## ASA Classifications

### ASA I: Healthy Patient
- **Definition:** Normal, healthy patient with no organic, physiological, or psychiatric disease
- **Example:** Young adult in good health, non-smoker, minimal alcohol consumption
- **Default Fees:**
  - Surgeon: 5,000 DA
  - Clinic: 3,000 DA

### ASA II: Mild Systemic Disease
- **Definition:** Patient with mild, well-controlled systemic disease without significant functional limitation
- **Examples:** Controlled mild hypertension, diet-controlled diabetes, mild chronic bronchitis
- **Default Fees:**
  - Surgeon: 8,000 DA
  - Clinic: 5,000 DA

### ASA III: Severe Systemic Disease
- **Definition:** Patient with severe systemic disease that impacts overall health and may limit activity, but not constantly life-threatening
- **Examples:** Stable angina, poorly controlled diabetes, severe hypertension
- **Default Fees:**
  - Surgeon: 12,000 DA
  - Clinic: 8,000 DA

## ASA Urgent Flag (U)

The urgent flag can be applied **independently** of the surgery status (planned/urgent). When the `asaUrgent` flag is set:
- The letter "U" is appended to the ASA class (e.g., ASA III U)
- An urgent multiplier (default: 1.2 = 20% increase) is applied to both surgeon and clinic ASA fees

**Example:**
- ASA II base fees: Surgeon 8,000 DA + Clinic 5,000 DA
- ASA II U fees: Surgeon 9,600 DA + Clinic 6,000 DA (after 1.2x multiplier)

## Configuration

### Location: Database-Driven (MongoDB)

ASA pricing is now stored in the **MongoDB database** instead of a config file, allowing you to update prices through the web interface without restarting the server.

### Access: `/asa-pricing` (Admin & Direction only)

Navigate to **Configuration > Tarifs ASA** in the main menu to manage pricing.

### Database Model: `AsaPricing`

```javascript
{
  class: String,              // "I", "II", or "III"
  surgeonFee: Number,         // Flat fee for surgeon (DA)
  clinicFee: Number,          // Flat fee for clinic (DA)
  urgentMultiplier: Number,   // Multiplier when asaUrgent=true
  description: String,        // Classification description
  isActive: Boolean,          // Enable/disable pricing
  timestamps: true            // createdAt, updatedAt
}
```

### Default Pricing (Auto-Initialized on First Access)

| Class | Surgeon Fee | Clinic Fee | Urgent Multiplier | Description |
|-------|------------|-----------|-------------------|-------------|
| ASA I | 5,000 DA | 3,000 DA | 1.2 | Patient en bonne santé |
| ASA II | 8,000 DA | 5,000 DA | 1.2 | Maladie systémique légère |
| ASA III | 12,000 DA | 8,000 DA | 1.2 | Maladie systémique grave |

### Customizing ASA Pricing

**Web Interface (Recommended):**
1. Log in as Admin or Direction
2. Navigate to **Configuration > Tarifs ASA** in the menu
3. Click **"Modifier les Tarifs"** on any ASA class card
4. Update surgeon fee, clinic fee, and/or urgent multiplier
5. Preview the changes in real-time
6. Click **"Enregistrer les Modifications"**
7. Changes apply immediately to new calculations (no restart needed)

**Features:**
- ✅ Real-time preview of standard and urgent fees
- ✅ Input validation (positive values, multiplier ≥ 1)
- ✅ Instant updates without server restart
- ✅ Audit trail with timestamps
- ✅ Per-class configuration (I, II, III)

**Initialize Default Pricing:**
If no pricing exists, click **"Initialiser Tarifs Par Défaut"** to create the standard pricing structure.

**Note:** Changes only affect new fee calculations. Existing surgeries retain their calculated amounts unless manually recalculated via the "Calculate Fees" button.

## Fee Calculation Integration

ASA fees are **flat fees** added to the final surgeon and clinic amounts after all other calculations (materials, personal fees, contract-based splits, etc.).

### Location Contract
```
surgeonAmount = 0 + asaSurgeonFee
clinicAmount = (locationCost + materials + personalFees + extraFees) + asaClinicFee
```

### Percentage Contract
```
surgeonAmount = (netAmount × surgeonPercent - extraFees) + asaSurgeonFee
clinicAmount = (netAmount × clinicPercent + patientMaterials + extraFees) + asaClinicFee
```

### When ASA Urgent Flag is Set
```
asaSurgeonFee = baseSurgeonFee × urgentMultiplier
asaClinicFee = baseClinicFee × urgentMultiplier
```

## User Interface

### Surgery Creation/Edit Forms
- **ASA Class Dropdown:** Select I, II, III, or leave unspecified (null for historical records)
- **ASA Urgent Checkbox:** Independent toggle to mark as urgent (adds "U" suffix)
- **Inline Help:** Definitions displayed in an info alert above the fields

### Surgery Details View
- ASA class displayed as a badge with heart-pulse icon
- Tooltip shows full classification definition
- "U" suffix shown when urgent flag is set

### Surgery List/Filtering
- **ASA Filter Dropdown:** Filter by class (I, II, III) or "Non spécifiée" (none)
- **ASA Column:** Displays classification badge in surgery list table
- Empty cell shown for surgeries without ASA classification

## Database Schema

### Model: `Surgery` (`models/Surgery.js`)

```javascript
asaClass: {
  type: String,
  enum: ["I", "II", "III"],
  default: null,
},
asaUrgent: {
  type: Boolean,
  default: false,
}
```

- `asaClass` is nullable to support historical surgeries created before ASA implementation
- `asaUrgent` defaults to `false` and can be toggled independently of surgery status

## Backward Compatibility

- **Historical Surgeries:** Existing surgeries without ASA classification have `asaClass = null` and `asaUrgent = false`
- **Fee Calculation:** If `asaClass` is null, no ASA fees are added (0 DA for both surgeon and clinic)
- **Editing Legacy Records:** Users can add ASA classification to historical surgeries by editing them

## RBAC & Permissions

ASA classification fields are visible and editable according to standard surgery management permissions:
- **Admin, Direction, Chef Bloc:** Can create/edit surgeries with ASA data
- **Assistante:** View-only access to ASA classification in surgery details
- **Médecin:** Can view ASA for their own surgeries

Financial details (ASA fee amounts) are hidden from users without `canViewPricing` permission.

## Reporting Considerations

ASA classification can be used for:
- **Risk Assessment Reports:** Group surgeries by ASA class to analyze complexity
- **Financial Analysis:** Compare revenue impact of different ASA classes
- **Clinical Statistics:** Track distribution of patient health statuses

To add ASA to reports, filter surgeries by `asaClass` in report controller queries.

## Best Practices

1. **Accurate Classification:** Ensure anesthesiologists or qualified staff assign ASA classes based on patient health assessment
2. **Urgent Flag Usage:** Use `asaUrgent` for emergency surgeries requiring immediate intervention, independent of scheduling status
3. **Price Review:** Periodically review ASA fees to align with market rates and operational costs
4. **Documentation:** Record justification for ASA class assignment in surgery notes
5. **Recalculation:** After modifying ASA classification or pricing config, use the "Recalculate Fees" button on surgery details

## Troubleshooting

### ASA Fees Not Appearing
- Check that `asaClass` is set (not null)
- Verify `config/asaPricing.js` exists and is properly formatted
- Ensure surgery fees have been calculated (manually trigger via "Calculate Fees" button)

### Wrong Fee Amounts
- Confirm correct ASA class is selected (I/II/III)
- Check if urgent flag is correctly set
- Review `urgentMultiplier` in config file
- Verify no manual adjustments to `surgeonAmount` or `clinicAmount` in database

### Legacy Surgeries Missing ASA
- ASA classification is optional; null values are expected for older records
- Edit the surgery and add ASA classification if needed
- Fees will automatically recalculate on save

## Technical Implementation Summary

**Files Modified/Created:**
- `models/Surgery.js` - Added `asaClass` and `asaUrgent` fields
- `config/asaPricing.js` - ASA pricing configuration
- `controller/surgery.controller.js` - Fee calculation logic + ASA filtering
- `views/surgeries/new.ejs` - ASA input fields
- `views/surgeries/edit.ejs` - ASA input fields with pre-populated values
- `views/surgeries/show.ejs` - ASA display with definitions
- `views/surgeries/index.ejs` - ASA column and filter dropdown
- `ASA_PRICING.md` - This documentation

**Calculation Function:** `calculateSurgeonFees()` in `controller/surgery.controller.js` (lines ~485-560)

---

**Last Updated:** December 3, 2025  
**Version:** 1.0  
**Author:** Bloc Management Development Team
