# headDepart Role Permissions Summary

## Overview
The **headDepart** (Department Head) role has been configured with view-only access to operational entities without financial information.

---

## ✅ Permissions Granted

### 1. **Materials** (View Only)
- ✅ Can view materials list
- ✅ Can view material details
- ❌ **Cannot see**: Pricing (priceHT, weightedPrice)
- ❌ **Cannot**: Create, edit, delete materials
- ❌ **Cannot**: Add material arrivals
- **Buttons hidden**: New, Edit, Delete, Add Arrival

### 2. **Prestations** (View Only)
- ✅ Can view prestations list
- ✅ Can view prestation details (designation, duration, specialty)
- ❌ **Cannot see**: Pricing (priceHT, tva, exceededDurationFee, urgentFeePercentage)
- ❌ **Cannot**: Create, edit, delete prestations
- **Buttons hidden**: New, Edit, Delete

### 3. **Medical Staff** (View Only)
- ✅ Can view medical staff list
- ✅ Can view staff details
- ❌ **Cannot**: Create, edit, delete staff members
- **Buttons hidden**: New, Edit, Delete

### 4. **Surgeons** (View Only, No Financial Info)
- ✅ Can view surgeons list
- ✅ Can view surgeon details (name, code, specialty, contact)
- ❌ **Cannot see**: Contract information (contractType, locationRate, percentageRate)
- ❌ **Cannot see**: Any financial information
- ❌ **Cannot**: Create, edit, delete surgeons
- **Buttons hidden**: New, Edit, Delete
- **Fields hidden**: Type Contrat, Taux, all financial info

### 5. **Surgeries** (View Only, No Financial Info)
- ✅ Can view surgeries list
- ✅ Can view surgery details (patient, surgeon, prestation, dates, status)
- ✅ Can view material consumption details
- ✅ Can view participating medical staff details
- ❌ **Cannot see**: Honoraires column (surgeonAmount, clinicAmount)
- ❌ **Cannot see**: Financial calculations section
- ❌ **Cannot see**: "Explication des Calculs d'Honoraires" section
- ❌ **Cannot see**: "Résumé des Règles de Calcul" section
- ❌ **Cannot see**: "Prix de base" field
- ❌ **Cannot**: Create, edit, delete surgeries
- ❌ **Cannot**: Calculate fees (button hidden)
- **Buttons hidden**: Calculate Fees
- **Sections hidden**: All financial calculation explanations

### 6. **Patients** (View Only)
- ✅ Can view patients list
- ✅ Can view patient details
- ❌ **Cannot**: Create, edit, delete patients (management-level action)

### 7. **Surgery Edit Form** (No Financial Fields)
When viewing surgery edit form (if ever accessible):
- ❌ **Cannot edit**: `adjustedPrice` field (hidden)
- ❌ **Cannot see**: "Prix de base" information (hidden)
- Only non-financial fields would be editable

---

## 🚫 Permissions Denied

### Cannot Access:
- User management
- System configuration
- Reports
- Any financial data or calculations
- Creating/editing/deleting any entities

### Cannot Manage:
- Materials (buyer-only)
- Surgeries (admin/direction only)
- Patients (admin/direction only)
- Any CRUD operations on master data

---

## 🔒 Data Filtering

### Controller-Level Filtering
Data is filtered at the controller level before being sent to views:

1. **Surgeons**: Contract info removed (`contractType`, `locationRate`, `percentageRate`)
2. **Prestations**: Pricing removed (`priceHT`, `tva`, `exceededDurationFee`, `urgentFeePercentage`)
3. **Materials**: Pricing removed (`priceHT`, `weightedPrice`)
4. **Surgeries**: Financial info not calculated/displayed (`surgeonAmount`, `clinicAmount`)

### Permission Flags in Views
Templates use these flags to conditionally render content:

- `permissions.isHeadDepart` - Identifies headDepart role
- `permissions.isHeadDepartOnly` - headDepart without admin/direction privileges
- `permissions.canViewFinancialInfo` - `false` for headDepart (admin/direction only)
- `permissions.canSeeContractInfo` - `false` for headDepart (admin/direction only)
- `permissions.canEditSurgeryFinancials` - `false` for headDepart (admin/direction only)
- `permissions.canManageData` - `false` for headDepart (admin/direction only)

---

## 📋 Implementation Details

### RBAC Middleware (`middleware/rbac.js`)
New view-only guards added:
```javascript
const ensureViewMaterials = requireAny('admin', 'direction', 'headDepart', 'buyer');
const ensureViewPrestations = requireAny('admin', 'direction', 'headDepart');
const ensureViewMedicalStaff = requireAny('admin', 'direction', 'headDepart');
const ensureViewSurgeons = requireAny('admin', 'direction', 'headDepart');
```

Management restricted to admin/direction only:
```javascript
const ensureManagementAccess = requireAny('admin', 'direction'); // headDepart excluded
```

### Routes Updated
- `routes/material.routes.js` - Applied `ensureViewMaterials` for list/show
- `routes/prestation.routes.js` - Applied `ensureViewPrestations` for list/show
- `routes/surgeon.routes.js` - Applied `ensureViewSurgeons` for list/show
- `routes/medicalStaff.routes.js` - Applied `ensureViewMedicalStaff` for list/show
- `routes/surgery.routes.js` - Already has `ensureViewSurgeries` applied

### Controllers Updated
- `controller/surgeon.controller.js` - Filters contract info for headDepart
- `controller/prestation.controller.js` - Filters pricing for headDepart
- `controller/material.controller.js` - Filters pricing for headDepart (buyer keeps pricing)
- `controller/surgery.controller.js` - Passes `canViewFinancialInfo` and `canEditSurgeryFinancials` flags

---

## 🎯 Use Case
**headDepart** role is designed for department heads who need to:
- Monitor operations (patients, surgeries, staff, materials)
- View resource availability and usage
- Track surgery scheduling and completion
- **Without access to**: Financial data, contract information, pricing, or management capabilities

This role provides operational visibility while maintaining financial confidentiality.

---

## ⚠️ Important Notes

1. **Financial Data Completely Hidden**: headDepart cannot see any pricing, fees, or contract information
2. **View-Only Access**: Cannot create, edit, or delete any entities
3. **No Management Rights**: Cannot manage surgeries, patients, or other entities
4. **Material Consumption Visible**: Can see which materials were used in surgeries (without prices)
5. **Staff Participation Visible**: Can see which medical staff participated in surgeries

---

## 🔄 Comparison with Other Roles

| Feature | Admin | Direction | headDepart | Assistante | Buyer |
|---------|-------|-----------|------------|------------|-------|
| View Materials | ✅ (full) | ✅ (full) | 👁️ (no price) | 👁️ (no price) | ✅ (full) |
| Manage Materials | ✅ | ❌ | ❌ | ❌ | ✅ |
| View Prestations | ✅ (full) | ✅ (full) | 👁️ (no price) | 👁️ (no price) | ❌ |
| Manage Prestations | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Surgeons | ✅ (full) | ✅ (full) | 👁️ (no contract) | 👁️ (no contract) | ❌ |
| Manage Surgeons | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Surgeries | ✅ (full) | ✅ (full) | 👁️ (no fees) | 👁️ (view) | ❌ |
| Manage Surgeries | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Financial Info | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage Patients | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ❌ | ❌ | ❌ |

**Legend**: ✅ Full Access | 👁️ View Only (Limited) | ❌ No Access

---

**Implementation Date**: 2025-11-18
**Status**: ✅ Complete
