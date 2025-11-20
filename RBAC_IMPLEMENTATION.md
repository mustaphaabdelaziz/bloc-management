# Role-Based Access Control (RBAC) Implementation Guide

## Overview
This document describes the comprehensive RBAC system implemented for the Operating Room Management System.

## Roles Defined

### 1. **Admin** (`admin`)
- **Full System Access**: Complete control over all system features
- **Permissions**:
  - User management (create, edit, delete users)
  - System configuration
  - All entity management (CRUD operations)
  - View all data including pricing and contract information
  - Access to all reports
- **Bypasses**: Admin role bypasses all role checks

### 2. **Direction** (`direction`)
- **Management Level Access**: Nearly full access except user management and system config
- **Permissions**:
  - All entity management (patients, surgeries, surgeons, materials, prestations, etc.)
  - View all data including pricing and contract information
  - Access to all reports
  - Cannot manage users or system configuration
- **Use Case**: Hospital directors, department heads

### 3. **Assistante** (`assistante`)
- **Operational Staff Access**: View and manage patients/surgeries, limited sensitive data access
- **Permissions**:
  - **Can Manage**: Patients (CRUD), Surgeries (CRUD)
  - **Can View (Read-Only)**:
    - Prestations (without pricing: priceHT, tva, fees)
    - Materials (without pricing: priceHT, weightedPrice)
    - Surgeons (without contract info: contractType, rates)
    - Medical staff, functions, specialties
  - **Cannot Access**: Reports, user management, pricing/contract data
- **Use Case**: Administrative assistants, OR coordinators

### 4. **Buyer** (`buyer`)
- **Procurement Access**: Material management specialist
- **Permissions**:
  - Full materials management (CRUD operations)
  - View materials with pricing information
  - Cannot access patients, surgeries, or other entities for modification
- **Use Case**: Purchasing department staff
- **Note**: Legacy `acheteur` role is also supported for backward compatibility

### 5. **Legacy Roles** (maintained for backward compatibility)
- `medecin` (surgeon): View own surgeries
- `chefBloc` (OR chief): Manage surgeries and patients
- `acheteur` (old buyer): Same as buyer
- `technicien`, `assistant`: Limited technical staff access

---

## Implementation Details

### Middleware Structure

#### 1. **Basic Authentication** (`middleware/auth.js`)
- `isLoggedIn`: Ensures user is authenticated
- Basic privilege checks (kept for backward compatibility)

#### 2. **RBAC Middleware** (`middleware/rbac.js`)

**Core Factory Function:**
```javascript
requireAny(...requiredPrivileges)
```
- Returns middleware that checks if user has any of the specified privileges
- Admin always bypasses the check
- Example: `requireAny('admin', 'direction', 'assistante')`

**Exported Role Guards:**
- `ensureAdmin`: Admin only
- `ensureDirection`: Direction only
- `ensureAssistante`: Assistante only
- `ensureBuyer` / `ensurePurchaser`: Buyer/acheteur
- `ensureAdminOrDirection`: Admin or Direction
- `ensureManagementAccess`: Admin, Direction, or ChefBloc
- `ensureMaterialsAccess`: Admin or Buyer
- `ensureViewPatients`: Admin, Direction, ChefBloc, or Assistante
- `ensureViewSurgeries`: Admin, Direction, ChefBloc, Assistante, or Medecin

**Ownership Check:**
```javascript
ensureOwnerOrRole(getResourceOwnerId, options)
```
- Allows admin/chefBloc bypass
- Checks if medecin (surgeon) owns the resource
- Used for surgeon-specific surgery access

---

## Route Protection

### Protected Routes by Entity

#### **Patients** (`routes/patient.routes.js`)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| `/patients` | GET | View list | `ensureViewPatients` |
| `/patients/new` | GET/POST | Create | `ensureViewPatients` |
| `/patients/:id` | GET | View details | `ensureViewPatients` |
| `/patients/:id/edit` | GET/PUT | Edit | `ensureViewPatients` |
| `/patients/:id` | DELETE | Delete | `ensureManagementAccess` |

**Note**: Assistante can create/edit but only management (admin/direction/chefBloc) can delete

#### **Surgeries** (`routes/surgery.routes.js`)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| `/surgeries` | GET | View list | `ensureViewSurgeries` |
| `/surgeries` | POST | Create | `ensureManagementAccess` |
| `/surgeries/:id` | GET | View details | `ensureViewSurgeries` |
| `/surgeries/:id` | PUT/DELETE | Modify | `ensureManagementAccess` |
| `/surgeries/:id/calculate-fees` | POST | Calculate | `ensureManagementAccess` |

#### **Materials** (`routes/material.routes.js`)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| `/materials` | GET | View list | `isLoggedIn` (all) |
| `/materials` | POST | Create | `ensureMaterialsAccess` |
| `/materials/:id` | GET | View details | `isLoggedIn` (all) |
| `/materials/:id` | PUT/DELETE | Modify | `ensureMaterialsAccess` |

**Note**: Assistante can view but pricing is hidden (filtered in controller)

#### **Prestations** (`routes/prestation.routes.js`)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| All listing/view | GET | All logged users | `isLoggedIn` |
| Create/Edit/Delete | POST/PUT/DELETE | Admin/Direction only | `ensureAdminOrDirection` |

**Note**: Assistante can view but pricing is hidden (filtered in controller)

#### **Surgeons** (`routes/surgeon.routes.js`)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| All listing/view | GET | All logged users | `isLoggedIn` |
| Create/Edit/Delete | POST/PUT/DELETE | Admin/Direction only | `ensureAdminOrDirection` |

**Note**: Assistante can view but contract info (rates, type) is hidden (filtered in controller)

#### **Reports** (`routes/report.routes.js`)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| All reports | GET | Admin/Direction only | `ensureAdminOrDirection` |

#### **Users** (`routes/users.routes.js`)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| All user management | ALL | Admin only | `ensureAdmin` |

#### **Other Entities** (Medical Staff, Specialties, Functions)
| Route | Method | Access | Middleware |
|-------|--------|--------|------------|
| View | GET | All logged users | `isLoggedIn` |
| Manage | POST/PUT/DELETE | Admin/Direction only | `ensureAdminOrDirection` |

---

## Data Filtering (Controller Level)

### Sensitive Data Hidden for Assistante

Controllers filter data based on user privileges before rendering views:

#### **Prestations** (`controller/prestation.controller.js`)
**Filtered Fields**:
- `priceHT` (price excluding tax)
- `tva` (tax rate)
- `exceededDurationFee`
- `urgentFeePercentage`

**Implementation**:
```javascript
const canViewPricing = userPrivileges.includes('admin') || userPrivileges.includes('direction');
const filteredPrestations = canViewPricing ? prestations : prestations.map(p => ({
  ...p.toObject(),
  priceHT: undefined,
  tva: undefined,
  exceededDurationFee: undefined,
  urgentFeePercentage: undefined
}));
```

#### **Surgeons** (`controller/surgeon.controller.js`)
**Filtered Fields**:
- `contractType` (allocation/percentage)
- `allocationRate`
- `percentageRate`

**Flag**: `canSeeContractInfo` passed to views

#### **Materials** (`controller/material.controller.js`)
**Filtered Fields**:
- `priceHT`
- `weightedPrice`

**Flag**: `canViewPricing` passed to views

---

## View Locals (Frontend Permissions)

### Permission Flags (`config/local.js`)

Available in all EJS templates via `res.locals.permissions`:

#### **Role Flags**:
```javascript
permissions.isAdmin
permissions.isDirection
permissions.isAssistante
permissions.isBuyer
permissions.isMedecin
permissions.isChefBloc
```

#### **Capability Flags**:
```javascript
permissions.canManageMaterials       // Admin or Buyer
permissions.canManageSurgeries       // Admin, Direction, or ChefBloc
permissions.canManageUsers           // Admin only
permissions.canManageSystemConfig    // Admin only
permissions.canViewPatients          // Admin, Direction, ChefBloc, Assistante
permissions.canViewSurgeries         // Above + Medecin
permissions.canViewReports           // Admin or Direction
permissions.canViewPricing           // Admin or Direction
permissions.canManageData            // Admin or Direction
permissions.canSeeContractInfo       // Admin or Direction
permissions.isAssistanteOnly         // Assistante without admin/direction
```

### Usage in EJS Templates

**Example**: Hide pricing column for assistante
```ejs
<% if (permissions.canViewPricing) { %>
  <th>Prix HT</th>
<% } %>
```

**Example**: Show create button only for management
```ejs
<% if (permissions.canManageData) { %>
  <a href="/patients/new" class="btn btn-primary">
    <i class="bi bi-plus-circle"></i> Nouveau Patient
  </a>
<% } %>
```

**Example**: Conditional contract info display
```ejs
<% if (canSeeContractInfo && surgeon.contractType) { %>
  <p><strong>Type Contrat:</strong> <%= surgeon.contractType %></p>
  <p><strong>Taux:</strong> <%= surgeon.contractType === 'allocation' ? surgeon.allocationRate : surgeon.percentageRate %>%</p>
<% } %>
```

---

## Access Control Matrix

| Feature | Admin | Direction | Assistante | Buyer | Medecin |
|---------|-------|-----------|------------|-------|---------|
| **User Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **System Config** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Reports** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Patients (Create/Edit)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Patients (Delete)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Patients (View)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Surgeries (Manage)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Surgeries (View)** | ✅ | ✅ | ✅ | ❌ | ✅ (own) |
| **Prestations (View)** | ✅ | ✅ | ✅ (no price) | ❌ | ✅ |
| **Prestations (Manage)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Prestations (Pricing)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Surgeons (View)** | ✅ | ✅ | ✅ (no contract) | ❌ | ✅ |
| **Surgeons (Manage)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Surgeons (Contract Info)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Materials (View)** | ✅ | ✅ | ✅ (no price) | ✅ | ✅ |
| **Materials (Manage)** | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Materials (Pricing)** | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Medical Staff (View)** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Medical Staff (Manage)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Specialties/Functions** | ✅ | ✅ | ✅ (view) | ❌ | ✅ (view) |

---

## Testing the RBAC System

### Test User Scenarios

#### **Test as Admin**:
1. Login with admin credentials
2. Verify access to user management (`/users`)
3. Verify full CRUD on all entities
4. Verify all pricing and contract info visible

#### **Test as Direction**:
1. Login with direction credentials
2. Verify no access to user management (should redirect)
3. Verify full CRUD on patients, surgeries, materials, prestations
4. Verify access to reports
5. Verify all pricing and contract info visible

#### **Test as Assistante**:
1. Login with assistante credentials
2. Verify access to patients (can create/edit, cannot delete)
3. Verify surgery viewing (read-only)
4. Verify prestation list shows no pricing columns
5. Verify surgeon list shows no contract info
6. Verify material list shows no pricing
7. Verify no access to reports (redirect)
8. Verify no access to user management (redirect)

#### **Test as Buyer**:
1. Login with buyer credentials
2. Verify full materials management access
3. Verify pricing visible in materials
4. Verify no access to patients, surgeries (redirect)
5. Verify no access to reports (redirect)

---

## Security Best Practices

### 1. **Defense in Depth**
- Route-level protection (middleware)
- Controller-level data filtering
- View-level conditional rendering

### 2. **Admin Bypass**
- Admin role always bypasses permission checks
- Implemented in `requireAny()` factory

### 3. **API vs Web Requests**
- Middleware detects API requests via `Accept` header or `/api` prefix
- Returns JSON 403 for API, redirects with flash for web

### 4. **No Privilege Escalation**
- Only admin can manage users
- Only admin can assign/modify roles
- Users cannot delete themselves

### 5. **Audit Trail**
- All models use timestamps (createdAt, updatedAt)
- Session management via MongoDB store

---

## Migration & Backward Compatibility

### Legacy Role Support
- `acheteur` → treated as `buyer`
- `medecin`, `chefBloc`, `technicien`, `assistant` → preserved for existing seeds/data

### User Model
Updated `privileges` enum to include new roles while maintaining old ones:
```javascript
enum: ['admin', 'direction', 'assistante', 'buyer', 'medecin', 'acheteur', 'chefBloc', 'technicien', 'assistant']
```

### No Data Seeding Required
- RBAC is permission-only change
- Existing users retain their roles
- New roles can be assigned via admin user management

---

## Future Enhancements

1. **Granular Permissions**: Move to permission-based rather than pure role-based
2. **Audit Logging**: Track who accessed/modified what
3. **Time-Based Access**: Restrict access by time periods
4. **IP Whitelisting**: Additional security layer
5. **Two-Factor Authentication**: Enhanced security for admin/direction roles
6. **Role Templates**: Pre-defined permission sets for easier user creation

---

## Troubleshooting

### User Cannot Access Expected Resource

**Check**:
1. User's `privileges` array in database
2. Route middleware in route file
3. Controller filtering logic (may be data hidden, not access denied)
4. View conditional rendering

**Debug Steps**:
```javascript
// In controller, log user privileges
console.log('User privileges:', req.user.privileges);

// In view, display current permissions
<%= JSON.stringify(permissions) %>
```

### Redirect Loop

**Cause**: User lacks required privilege, gets redirected, redirect target also protected

**Fix**: Ensure redirect target (usually `/`) or `/login` is not protected by same middleware

### Pricing Still Visible

**Check**: Controller properly filters data and passes `canViewPricing` flag to view
**Verify**: View template checks flag before rendering sensitive fields

---

## File Reference

### Modified Files
- `models/User.js` - Added new roles to enum
- `middleware/rbac.js` - Enhanced RBAC middlewares
- `config/local.js` - Added permission flags
- `routes/*.routes.js` - Applied RBAC to all routes
- `controller/prestation.controller.js` - Data filtering
- `controller/surgeon.controller.js` - Data filtering
- `controller/material.controller.js` - Data filtering

### Key Functions
- `requireAny()` - Core RBAC factory in `middleware/rbac.js`
- `ensureOwnerOrRole()` - Ownership check in `middleware/rbac.js`
- `res.locals.permissions` - Permission flags in `config/local.js`

---

## Contact & Support

For questions or issues with the RBAC implementation, refer to this document or the inline comments in the source files listed above.
