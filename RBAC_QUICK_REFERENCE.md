# RBAC Quick Reference Guide

## Role Hierarchy (Access Levels)

```
Admin > Direction > ChefBloc/Assistante > Buyer/Medecin > Others
```

## Common Use Cases

### 1. Protect a Route (All Users)
```javascript
const { isLoggedIn } = require('../middleware/auth');
router.get('/resource', isLoggedIn, controller.method);
```

### 2. Protect a Route (Admin Only)
```javascript
const { ensureAdmin } = require('../middleware/rbac');
router.post('/resource', isLoggedIn, ensureAdmin, controller.method);
```

### 3. Protect a Route (Admin or Direction)
```javascript
const { ensureAdminOrDirection } = require('../middleware/rbac');
router.put('/resource/:id', isLoggedIn, ensureAdminOrDirection, controller.method);
```

### 4. Protect a Route (Multiple Specific Roles)
```javascript
const { requireAny } = require('../middleware/rbac');
router.get('/resource', isLoggedIn, requireAny('admin', 'direction', 'assistante'), controller.method);
```

### 5. Filter Sensitive Data in Controller
```javascript
module.exports.listResources = async (req, res) => {
  const resources = await Resource.find();
  
  const userPrivileges = req.user?.privileges || [];
  const canViewSensitive = userPrivileges.includes('admin') || userPrivileges.includes('direction');
  
  const filtered = canViewSensitive ? resources : resources.map(r => ({
    ...r.toObject(),
    sensitiveField: undefined
  }));
  
  res.render('resources/index', { resources: filtered, canViewSensitive });
};
```

### 6. Conditional Rendering in Views
```ejs
<!-- Hide/show based on permission -->
<% if (permissions.canManageData) { %>
  <button class="btn btn-primary">Create New</button>
<% } %>

<!-- Hide sensitive data -->
<% if (permissions.canViewPricing) { %>
  <td><%= resource.priceHT %> DA</td>
<% } else { %>
  <td>-</td>
<% } %>

<!-- Controller-level flag -->
<% if (canViewPricing && resource.priceHT) { %>
  <p>Price: <%= resource.priceHT %></p>
<% } %>
```

## Role Permissions Quick Lookup

| Action | Middleware to Use |
|--------|-------------------|
| View patients | `ensureViewPatients` |
| Manage patients | `ensureViewPatients` (create/edit), `ensureManagementAccess` (delete) |
| View surgeries | `ensureViewSurgeries` |
| Manage surgeries | `ensureManagementAccess` |
| View materials | `isLoggedIn` (all users) |
| Manage materials | `ensureMaterialsAccess` |
| View prestations | `isLoggedIn` (all users) |
| Manage prestations | `ensureAdminOrDirection` |
| View surgeons | `isLoggedIn` (all users) |
| Manage surgeons | `ensureAdminOrDirection` |
| View reports | `ensureAdminOrDirection` |
| Manage users | `ensureAdmin` |

## Permission Flags Available in Views

```javascript
// Role checks
permissions.isAdmin
permissions.isDirection
permissions.isAssistante
permissions.isBuyer

// Capability checks
permissions.canManageMaterials
permissions.canManageSurgeries
permissions.canManageUsers
permissions.canViewPatients
permissions.canViewSurgeries
permissions.canViewReports
permissions.canViewPricing
permissions.canSeeContractInfo
permissions.canManageData
```

## Sensitive Data to Hide from Assistante

### Prestations
- `priceHT`, `tva`, `exceededDurationFee`, `urgentFeePercentage`

### Surgeons
- `contractType`, `allocationRate`, `percentageRate`

### Materials
- `priceHT`, `weightedPrice`

### Surgeries
- `surgeonAmount`, `clinicAmount` (fee calculations)

## Common RBAC Patterns

### Pattern 1: View All, Manage Restricted
```javascript
router.route('/resources')
  .get(isLoggedIn, controller.list)                    // All can view
  .post(isLoggedIn, ensureAdminOrDirection, controller.create); // Only admin/direction can create
```

### Pattern 2: Different Delete Permissions
```javascript
router.delete('/resources/:id', isLoggedIn, ensureManagementAccess, controller.delete);
// Management (admin/direction/chefBloc) can delete, assistante cannot
```

### Pattern 3: View with Data Filtering
```javascript
// In controller
const canViewPricing = userPrivileges.includes('admin') || userPrivileges.includes('direction');
res.render('view', { data, canViewPricing });

// In view
<% if (canViewPricing) { %>
  <td><%= item.price %></td>
<% } %>
```

## Testing Checklist

- [ ] Admin can access everything
- [ ] Direction cannot access user management
- [ ] Assistante can view but not manage most entities
- [ ] Assistante cannot see pricing/contract info
- [ ] Buyer can only manage materials
- [ ] Unauthorized routes redirect with error message
- [ ] Sensitive data hidden in views for restricted roles

## Error Handling

### Unauthorized Access (Web)
```javascript
req.flash('error', 'Accès non autorisé');
res.redirect('/');
```

### Unauthorized Access (API)
```javascript
res.status(403).json({ error: 'Accès non autorisé' });
```

## Debugging Tips

1. **Log user privileges in controller**:
   ```javascript
   console.log('User:', req.user?.email, 'Privileges:', req.user?.privileges);
   ```

2. **Display permissions in view (debug only)**:
   ```ejs
   <%# Remove in production %>
   <pre><%= JSON.stringify(permissions, null, 2) %></pre>
   ```

3. **Check middleware chain**:
   ```javascript
   // Ensure isLoggedIn comes before RBAC checks
   router.get('/resource', isLoggedIn, ensureAdmin, controller.method);
   //                       ^^^^^^^^^^  ^^^^^^^^^^^
   //                       First       Second
   ```

## Adding a New Role

1. **Add to User model** (`models/User.js`):
   ```javascript
   enum: ['admin', 'direction', 'assistante', 'buyer', 'newRole', ...]
   ```

2. **Add middleware** (`middleware/rbac.js`):
   ```javascript
   const ensureNewRole = requireAny('newRole');
   module.exports = { ..., ensureNewRole };
   ```

3. **Add permission flags** (`config/local.js`):
   ```javascript
   permissions.isNewRole = privileges.includes('newRole');
   permissions.canDoSomething = permissions.isAdmin || permissions.isNewRole;
   ```

4. **Apply to routes**:
   ```javascript
   const { ensureNewRole } = require('../middleware/rbac');
   router.get('/resource', isLoggedIn, ensureNewRole, controller.method);
   ```

5. **Update views** (if needed):
   ```ejs
   <% if (permissions.isNewRole) { %>
     <!-- New role specific UI -->
   <% } %>
   ```
