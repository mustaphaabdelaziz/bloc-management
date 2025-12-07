# RBAC Testing Checklist

Use this checklist to verify the RBAC implementation is working correctly.

---

## Pre-Testing Setup

- [ ] Database is running
- [ ] Application starts without errors (`npm run dev`)
- [ ] Test users exist for each role:
  - [ ] Admin user
  - [ ] Direction user
  - [ ] Assistante user
  - [ ] Buyer user
- [ ] Browser console is open for debugging

---

## 1. Admin Role Testing

**Login as Admin**

### User Management
- [ ] Can access `/users` route
- [ ] Can view all users
- [ ] Can create new user
- [ ] Can edit user privileges
- [ ] Can delete users (except self)
- [ ] Cannot delete own account (error message shown)

### Patients
- [ ] Can view patients list
- [ ] Can create new patient
- [ ] Can edit existing patient
- [ ] Can delete patient
- [ ] Can view patient details

### Surgeries
- [ ] Can view surgeries list
- [ ] Can create new surgery
- [ ] Can edit existing surgery
- [ ] Can delete surgery
- [ ] Can view surgery details
- [ ] Can calculate fees manually
- [ ] Can update surgery status
- [ ] Can see pricing information (surgeonAmount, clinicAmount)

### Prestations
- [ ] Can view prestations list
- [ ] Can create new prestation
- [ ] Can edit existing prestation
- [ ] Can delete prestation
- [ ] Can see pricing columns (priceHT, tva, exceededDurationFee, urgentFeePercentage)

### Surgeons
- [ ] Can view surgeons list
- [ ] Can create new surgeon
- [ ] Can edit existing surgeon
- [ ] Can delete surgeon
- [ ] Can see contract information (contractType, locationRate, percentageRate)

### Materials
- [ ] Can view materials list
- [ ] Can create new material
- [ ] Can edit existing material
- [ ] Can delete material
- [ ] Can add material arrival
- [ ] Can see pricing (priceHT, weightedPrice)

### Reports
- [ ] Can access `/reports` route
- [ ] Can view all report types
- [ ] Reports show complete data

### Other Entities
- [ ] Can manage medical staff (CRUD)
- [ ] Can manage specialties (CRUD)
- [ ] Can manage functions (CRUD)

---

## 2. Direction Role Testing

**Login as Direction User**

### User Management
- [ ] Cannot access `/users` route (redirects with error)
- [ ] Error message: "Accès non autorisé"

### Patients
- [ ] Can view patients list
- [ ] Can create new patient
- [ ] Can edit existing patient
- [ ] Can delete patient
- [ ] Can view patient details

### Surgeries
- [ ] Can view surgeries list
- [ ] Can create new surgery
- [ ] Can edit existing surgery
- [ ] Can delete surgery
- [ ] Can view surgery details
- [ ] Can calculate fees manually
- [ ] Can update surgery status
- [ ] Can see pricing information

### Prestations
- [ ] Can view prestations list
- [ ] Can create new prestation
- [ ] Can edit existing prestation
- [ ] Can delete prestation
- [ ] Can see pricing columns (priceHT, tva, etc.)

### Surgeons
- [ ] Can view surgeons list
- [ ] Can create new surgeon
- [ ] Can edit existing surgeon
- [ ] Can delete surgeon
- [ ] Can see contract information

### Materials
- [ ] Can view materials list
- [ ] Can view material details
- [ ] Can see pricing (priceHT, weightedPrice)
- [ ] Cannot create/edit/delete materials (no buttons shown or redirects)

### Reports
- [ ] Can access `/reports` route
- [ ] Can view all report types

### Other Entities
- [ ] Can manage medical staff (CRUD)
- [ ] Can manage specialties (CRUD)
- [ ] Can manage functions (CRUD)

---

## 3. Assistante Role Testing

**Login as Assistante User**

### User Management
- [ ] Cannot access `/users` route (redirects with error)

### Patients
- [ ] Can view patients list
- [ ] Can create new patient
- [ ] Can edit existing patient
- [ ] **Cannot** delete patient (button hidden or redirects with error)
- [ ] Can view patient details

### Surgeries
- [ ] Can view surgeries list
- [ ] Can view surgery details
- [ ] **Cannot** create new surgery (button hidden or redirects)
- [ ] **Cannot** edit surgery (button hidden or redirects)
- [ ] **Cannot** delete surgery (button hidden or redirects)
- [ ] **Cannot** calculate fees (button hidden or redirects)
- [ ] **Cannot** see surgeonAmount/clinicAmount (fields hidden)

### Prestations
- [ ] Can view prestations list
- [ ] **Cannot** see pricing columns (priceHT, tva, exceededDurationFee, urgentFeePercentage hidden)
- [ ] Can see designation, duration, specialty
- [ ] **Cannot** create/edit/delete prestations (buttons hidden or redirects)

### Surgeons
- [ ] Can view surgeons list
- [ ] **Cannot** see contract information (contractType, rates hidden)
- [ ] Can see name, code, specialty, contact info
- [ ] Can view surgeon details
- [ ] **Cannot** create/edit/delete surgeons (buttons hidden or redirects)

### Materials
- [ ] Can view materials list
- [ ] **Cannot** see pricing columns (priceHT, weightedPrice hidden)
- [ ] Can see designation, code, category, quantity
- [ ] Can view material details
- [ ] **Cannot** create/edit/delete materials (buttons hidden or redirects)
- [ ] **Cannot** add material arrivals (button hidden or redirects)

### Reports
- [ ] Cannot access `/reports` route (redirects with error)

### Other Entities
- [ ] Can view medical staff list (read-only)
- [ ] Can view specialties list (read-only)
- [ ] Can view functions list (read-only)
- [ ] **Cannot** create/edit/delete (buttons hidden or redirects)

### Navigation Menu
- [ ] Cannot see "Utilisateurs" menu item
- [ ] Cannot see "Rapports" menu item
- [ ] Can see "Patients" menu item
- [ ] Can see "Interventions" menu item (if visible to all)

---

## 4. Buyer Role Testing

**Login as Buyer User**

### User Management
- [ ] Cannot access `/users` route (redirects with error)

### Patients
- [ ] Cannot access `/patients` route (redirects with error or no menu item)

### Surgeries
- [ ] Cannot access `/surgeries` route (redirects with error or no menu item)

### Prestations
- [ ] Cannot access `/prestations` route (redirects with error or no menu item)

### Surgeons
- [ ] Cannot access `/surgeons` route (redirects with error or no menu item)

### Materials
- [ ] Can view materials list
- [ ] Can create new material
- [ ] Can edit existing material
- [ ] Can delete material
- [ ] Can add material arrival
- [ ] Can see pricing (priceHT, weightedPrice)
- [ ] All CRUD buttons visible

### Reports
- [ ] Cannot access `/reports` route (redirects with error)

### Other Entities
- [ ] Cannot manage medical staff
- [ ] Cannot manage specialties
- [ ] Cannot manage functions

### Navigation Menu
- [ ] Only "Matériaux" menu item visible (plus logout)
- [ ] No access to other entity menus

---

## 5. Cross-Cutting Concerns

### Authentication
- [ ] Unauthenticated users redirected to `/login`
- [ ] Flash message shown: "Vous devez être connecté"
- [ ] After login, user redirected to appropriate page

### Authorization Errors
- [ ] Unauthorized access shows flash error message
- [ ] User redirected to safe page (usually `/`)
- [ ] Error message is descriptive (e.g., "Accès non autorisé - droits administrateur requis")

### Data Filtering
- [ ] Assistante cannot see pricing in controller responses
- [ ] Assistante cannot see contract info in controller responses
- [ ] Data is filtered in controller, not just hidden in view
- [ ] API requests return 403 JSON for unauthorized access

### View Permissions
- [ ] `permissions` object available in all views
- [ ] All role flags work correctly (`isAdmin`, `isDirection`, etc.)
- [ ] All capability flags work correctly (`canViewPricing`, `canManageData`, etc.)
- [ ] Conditional rendering hides/shows elements appropriately

### Admin Bypass
- [ ] Admin can access everything regardless of other checks
- [ ] Admin bypass works in `requireAny()` factory
- [ ] Admin bypass works in custom middleware

---

## 6. Edge Cases

### Multiple Roles
- [ ] User with both `admin` and `direction` roles (admin takes precedence)
- [ ] User with both `buyer` and `acheteur` roles (both work)

### Legacy Roles
- [ ] `acheteur` role works same as `buyer`
- [ ] `medecin` role can view own surgeries
- [ ] `chefBloc` role can manage surgeries

### No Roles
- [ ] User with empty `privileges` array cannot access protected routes
- [ ] User with no `privileges` field cannot access protected routes

### Session Expiry
- [ ] Expired session redirects to login
- [ ] Flash message shown
- [ ] User can log in again successfully

---

## 7. API Endpoints (if applicable)

### Unauthorized API Access
- [ ] Returns 403 status code
- [ ] Returns JSON: `{ error: "Accès non autorisé" }`
- [ ] Does not redirect (API-specific behavior)

### Authorized API Access
- [ ] Returns expected data
- [ ] Data is filtered based on role (same as web)

---

## 8. Browser Testing

### Different Browsers
- [ ] Chrome/Edge: All features work
- [ ] Firefox: All features work
- [ ] Safari: All features work (if applicable)

### Different Screen Sizes
- [ ] Desktop: All UI elements visible/hidden correctly
- [ ] Tablet: Responsive design works
- [ ] Mobile: Responsive design works

---

## 9. Performance

### Page Load Times
- [ ] No significant slowdown from permission checks
- [ ] Database queries are efficient
- [ ] No N+1 query problems

### Permission Flag Generation
- [ ] `config/local.js` executes quickly
- [ ] No performance issues with permission flags

---

## 10. Security

### Direct URL Access
- [ ] Typing protected URL directly redirects unauthorized users
- [ ] No bypass through URL manipulation

### Form Submission
- [ ] POST/PUT/DELETE requests are protected
- [ ] Cannot bypass by removing buttons

### Developer Tools
- [ ] Hiding buttons in view doesn't expose security hole
- [ ] Server-side checks prevent unauthorized actions

---

## Testing Tools

### Manual Testing
1. Open browser in incognito/private mode
2. Clear cookies between role tests
3. Use different browser profiles for each role
4. Check browser console for errors

### Debugging
```javascript
// Add to controller to debug
console.log('User:', req.user?.email);
console.log('Privileges:', req.user?.privileges);
console.log('Permissions:', res.locals.permissions);
```

### Database Queries
```javascript
// In MongoDB shell - check user privileges
db.users.find({}, { email: 1, privileges: 1 })

// Update user privileges
db.users.updateOne(
  { email: 'test@example.com' },
  { $set: { privileges: ['assistante'] } }
)
```

---

## Common Issues & Solutions

### Issue: User has correct role but cannot access route
**Check**:
- Route middleware order (isLoggedIn before RBAC check)
- User privileges array in database
- Middleware function name (typo?)

### Issue: Buttons visible but action fails
**Cause**: View not updated to hide buttons
**Fix**: Add `<% if (permissions.canManageData) { %>` around button

### Issue: Data visible when should be hidden
**Cause**: Controller not filtering data
**Fix**: Add filtering logic in controller, pass flag to view

### Issue: Flash message not showing
**Cause**: `config/local.js` not injecting flash messages
**Fix**: Check middleware order in `app.js`

---

## Sign-Off

### Tested By
- Name: ________________
- Date: ________________
- Role Tested: [ ] Admin [ ] Direction [ ] Assistante [ ] Buyer

### Results
- [ ] All tests passed
- [ ] Issues found (document below)

### Issues Found
```
List any issues encountered during testing:
1. 
2. 
3. 
```

### Notes
```
Additional observations or comments:

```

---

**Testing Status**: ⬜ Not Started | 🔄 In Progress | ✅ Complete | ❌ Failed

**Overall Result**: ________________
