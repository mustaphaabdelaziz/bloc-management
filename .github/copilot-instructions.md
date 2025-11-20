# AI Coding Agent Instructions for Bloc Management

**Operating Room Management System**  Healthcare management for surgeries, patients, surgeons, staff, materials, and dynamic fee calculations (allocation vs. percentage contracts).

**Stack:** Node.js/Express, MongoDB/Mongoose, EJS+ejs-mate, Passport.js (local strategy)

---

## Architecture & Critical Patterns

### 1. **Role-Based Access Control (RBAC)**
- **Current Roles:** 
  - `admin` (full system access)
  - `direction` (all access except users & system config)
  - `assistante` (patients/surgeries management, view-only sensitive data)
  - `buyer` (materials management specialist)
  - Legacy: `medecin` (surgeons), `chefBloc` (OR manager), `acheteur` (old purchaser)
- **Location:** `middleware/auth.js` (basic checks), `middleware/rbac.js` (comprehensive factories)
- **Pattern:** All roles stored as `req.user.privileges` array. Admin **always bypasses** role checks.
- **Route Guards:**
  - `isLoggedIn` – checks `req.isAuthenticated()`
  - `requireAny('admin', 'direction', 'assistante')` – factory for any-of multiple roles
  - `ensureAdminOrDirection` – common management access
  - `ensureManagementAccess` – admin/direction/chefBloc
  - `ensureMaterialsAccess` – admin/buyer
  - `ensureViewPatients` – admin/direction/chefBloc/assistante
  - `ensureViewSurgeries` – above + medecin
  - `ensureOwnerOrRole(getResourceOwnerId)` – allows admin/chefBloc; surgeons see only their own surgeries
- **Data Filtering:** Controllers filter sensitive data (pricing, contract info) for assistante role
- **View Permissions:** `res.locals.permissions` flags (canViewPricing, canSeeContractInfo, etc.)
- **Documentation:** See `RBAC_IMPLEMENTATION.md` for complete details

### 2. **Complex Fee Calculation (Dual Contracts)**
- **Two models:** `allocation` (clinic hourly cost) vs `percentage` (surgeon profit-share)
- **Stored on Surgery:** `surgeonAmount`, `clinicAmount` (calculated via `calculateSurgeonFees(surgeryId)`)
- **Allocation contract:**
  - Surgeon: $0 (clinic collects)
  - Clinic: `(duration_hrs  allocationRate) + totalMaterials + personalFees(urgentMultiplier) + extraFees`
- **Percentage contract:**
  - Net amount = `prestationPrice  (1 + urgentRate) - patientMaterials`
  - Surgeon: `(net  surgeonPercent) - extraFees`
  - Clinic: `(net  clinicPercent) + patientMaterials + extraFees`
- **Extra Fees:** Only when `applyExtraFees=true` and `actualDuration > prestation.duration`
- **Critical:** Always use `surgery.adjustedPrice || prestation.priceHT` (frozen at creation); `material.category === 'patient'` determines cost treatment
- **Location:** `controller/surgery.controller.js` (lines 301450)

### 3. **Data Model Hub: Surgery**
- **Surgery refs:** `patient`, `surgeon`, `prestation` (always populate before calculations)
- **Embedded:** `consumedMaterials[]` (with frozen `priceUsed`), `medicalStaff[]` (staff + rolePlayedId)
- **Computed:** `actualDuration` = `(endDateTime - beginDateTime)` in minutes
- **Key fields:** `status` (enum: 'urgent'|'planned'), `code` (unique), `applyExtraFees` (bool)

### 4. **Error Handling & Async Routes**
- **Pattern:** Wrap all async controllers in `catchAsync()` (in `utils/catchAsync.js`)
- **No global error handler** (commented out in `app.js`)
- **Flash messages:** Stored via `req.flash()` or query params (`?error=msg&success=msg`); injected by `config/local.js`

### 5. **View Locals & Permission Rendering**
- **Middleware:** `config/local.js` injects `res.locals` after passport session
### 5. **View Locals & Permission Rendering**
- **Middleware:** `config/local.js` injects `res.locals` after passport session
- **Flags:** `permissions.isAdmin`, `.isDirection`, `.isAssistante`, `.isBuyer`, `.isMedecin`, `.isChefBloc`, etc.
- **Derived abilities:** 
  - `canManageMaterials` (admin|buyer)
  - `canManageSurgeries` (admin|direction|chefBloc)
  - `canViewPricing` (admin|direction)
  - `canSeeContractInfo` (admin|direction)
  - `canManageUsers` (admin only)
  - `canViewPatients`, `canViewSurgeries`, `canViewReports`, etc.
- **Usage in views:** `<% if (permissions.canViewPricing) { %> ... <% } %>`

---

## Running & Development

### Start Server
```bash
npm install && npm run dev          # nodemon watches changes
npm start                            # direct (no watch)
```

### Database
- **Connection:** `database/connection.js` reads `DB_URL` env var
- **Seeding:** `seeds/users.js`, `seeds/liste_actes.js`, etc.  run manually if needed
- **Session store:** MongoDB via `connect-mongo`

### Add New Capability
1. **Entity CRUD:** Create model  controller  route  EJS views (follow `surgeries/` pattern)
2. **New Role:** Add to `User.privileges` enum  update `config/local.js` permission flags
3. **Fee Formula Change:** Update `calculateSurgeonFees()` and report aggregations in sync
4. **Report:** Add controller method + route + template

---

## Code Organization & Modular Structure

### Per-Entity File Structure
For each entity (Patient, Surgery, Surgeon, etc.), follow this strict pattern:

```
models/Entity.js                    # Mongoose schema (singular name)
routes/entity.routes.js             # Express routes
controller/entity.controller.js      # Business logic
views/entity/
  ├── index.ejs                     # List view
  ├── new.ejs                       # Bootstrap modal (create form)
  ├── edit.ejs                      # Bootstrap modal (edit form)
  └── delete.ejs                    # Bootstrap modal (confirm delete)
public/css/entity.scss              # SCSS stylesheet (not CSS)
public/css/entity.css               # Compiled CSS from SCSS
public/js/entity.js                 # Entity-specific JavaScript
public/assets/entity/               # Entity-specific images/files
```

### Views Best Practices
- **Modals:** Use Bootstrap modals for `new.ejs`, `edit.ejs`, `delete.ejs` (not page redirects)
- **Partials:** Extract reusable components to `views/partials/` (e.g., `_form.ejs`, `_header.ejs`, `_footer.ejs`)
- **Layouts:** Use ejs-mate layout inheritance via `<%- contentFor('body') %>` in main layout file

### Styling
- **SCSS only:** Always use `.scss` files (Sass), never plain CSS
- **File organization:** One `.scss` file per entity (e.g., `public/css/patient.scss`)
- **Build step:** Compile SCSS to CSS before deployment (add npm script: `"sass": "sass public/css:public/css"`)
- **Global styles:** `public/css/main.scss` for shared utilities

### JavaScript Organization
- **Entity-specific logic:** Put in `public/js/entity.js` (e.g., `public/js/patient.js`)
- **Global utilities:** `public/js/validate-form.js`, `public/js/filter.js`, etc. in `public/js/`
- **DRY principle:** Avoid duplicating validation/logic between server and client

### Configuration & Environment
- **Environment variables:** Must use `.env` file (read by `dotenv` in `app.js`)
- **Template:** Create `.env.example` with all required vars documented
- **Database connection:** `database/connection.js` reads `DB_URL` from `.env`
- **Middleware:** All middleware in `middleware/` folder; import pattern in `app.js` as `require('./middleware/auth')`

### Assets Organization
- **Images/PDFs:** Place in `public/assets/` (entity-specific: `public/assets/patient/`, `public/assets/surgery/`, etc.)
- **Icons:** Use Bootstrap icons or store in `public/assets/icons/`

---

## Fee Calculation Logic (Critical)

### Workflow: When Fees Are Calculated
1. **Surgery Creation:** Fees auto-calculated post-transaction via `calculateSurgeonFees(surgeryId)`
2. **Manual Route:** POST `/:id/calculate-fees` explicitly recalculates and saves fees
3. **Auto-Recalc on View:** `viewSurgery` checks if `surgeonAmount === 0`, triggers auto-calculation if missing

### Price Freezing Pattern
- **At creation:** Store `adjustedPrice = req.body.adjustedPrice || prestation.priceHT`
- **At materials:** Store `priceUsed` on each consumedMaterial entry (not current price)
- **Reason:** Insulates historical surgeries from price changes; always recalculate to get current values

### Material Cost Aggregation
```javascript
// Aggregate material costs
for (const consumedMaterial of surgery.consumedMaterials) {
  const materialCost = (material.weightedPrice || material.priceHT) * quantity;
  totalMaterialCost += materialCost;
  
  // Separate tracking for patient vs clinic materials
  if (material.category === "patient") {
    totalPatientMaterialCost += materialCost;
  }
}
```
- **Patient materials:** Reduce net income base for percentage contracts
- **Clinic materials:** Included in clinic cost for allocation contracts

### Personal Fees (Hourly)
- Aggregated from all medical staff: `staff.personalFee * durationInHours`
- For **allocation contracts:** Gets urgent uplift: `personalFees × (1 + urgentPercent)`
- For **percentage contracts:** No uplift; fixed into surgeon's margin

### Contract Type: ALLOCATION
```
surgeonAmount = 0
clinicAmount = (durationHours × allocationRate) 
              + totalMaterialCost 
              + (totalPersonalFees × (1 + urgentPercent))
              + extraFees
```
- **surgeonAmount:** Always 0 (clinic covers surgeon via allocation)
- **extraFees:** Charged to clinic if `applyExtraFees && actualDuration > prestation.duration`
- **Formula:** `extraFees = (exceededDurationFee × (actualDuration - prestation.duration)) / exceededDurationUnit`

### Contract Type: PERCENTAGE
```
// 1. Net Amount (base for split)
netAmount = prestationPrice × (1 + urgentRate) - patientMaterials

// 2. Surgeon's Share
surgeonAmount = (netAmount × surgeonPercent) - extraFees

// 3. Clinic's Share
clinicAmount = (netAmount × clinicPercent) + patientMaterials + extraFees
```
- **urgentRate:** Applied only if `status === 'urgent'` (prestation.urgentFeePercentage)
- **extraFees:** Deducted from surgeon if `applyExtraFees && actualDuration > prestation.duration`
- **Patient Materials:** Excluded from surgeon share; added back to clinic (clinic absorbs cost)
- **Non-patient Materials:** Already deducted in net; doesn't affect split

### Key Fields Required for Calculation
- `surgery.adjustedPrice` – Frozen prestation price
- `surgery.actualDuration` – Computed: `(endDateTime - beginDateTime)` in minutes
- `surgery.status` – `'urgent'` or `'planned'` (enum)
- `surgery.applyExtraFees` – Boolean flag
- `surgery.consumedMaterials[].priceUsed` – Frozen at creation
- `surgeon.contractType` – `'allocation'` or `'percentage'`
- `surgeon.allocationRate` – For allocation contracts (numeric, hourly rate)
- `surgeon.percentageRate` – For percentage contracts (e.g., 45 = 45%)
- `prestation.duration` – Expected duration in minutes
- `prestation.urgentFeePercentage` – Urgent uplift (e.g., 0.1 = 10%)
- `prestation.exceededDurationUnit` – Fee unit (e.g., 15 minutes)
- `prestation.exceededDurationFee` – Fee per unit
- `material.category` – `'patient'` or other (affects net amount)
- `medicalStaff[].staff.personalFee` – Hourly rate per staff member

### Rounding & Safety
```javascript
surgeonAmount = Math.max(0, surgeonAmount);  // Never negative
clinicAmount = Math.max(0, clinicAmount);    // Never negative
surgeonAmount = Math.round(surgeonAmount * 100) / 100;  // 2 decimals
```

### Location & Updates
- **Function:** `controller/surgery.controller.js` line 301: `calculateSurgeonFees(surgeryId)`
- **Storage:** Saves to `Surgery.surgeonAmount` and `Surgery.clinicAmount`
- **Reports:** Aggregated in `controller/report.controller.js` for surgeon/clinic revenue

---

## Project Conventions

### Files & Naming
- **Models:** Singular (`Surgery`), MongoDB auto-pluralizes to `surgeries`
- **Routes:** `router.route(''/').get(...).post(...)` for list/create; `/:id` for show/update/delete
- **Controllers:** Method names `surgeryList`, `createSurgery`, `viewSurgery`, `updateSurgery`
- **Views:** Folder per entity; `views/surgeries/{index,new,show,edit}.ejs` where new/edit/delete are Bootstrap modals

### Authentication
- **Strategy:** `passport-local` with email + bcrypt hash
- **User fields:** `email` (unique, lowercase), `firstname`, `lastname`, `hash`, `salt`, `privileges[]`
- **Session:** MongoDB via `express-session` + `connect-mongo`

### Materials & Pricing
- **Category:** `'patient'` (patient-paid) vs. clinic-provided; affects fee math
- **Pricing priority:** `weightedPrice`  `priceHT` (fallback)
- **Frozen costs:** Store `priceUsed` on consumedMaterials at surgery creation

### Surgery Fields
- **Dates:** `beginDateTime` (manual), `endDateTime` (manual), `actualDuration` (computed, in minutes)
- **Status:** `'planned'` or `'urgent'` (enum)
- **Fees:** `surgeonAmount`, `clinicAmount` (calculated; not auto-updated on price change)

---

## Common Pitfalls

1. **Missing populate:** Surgery views crash if `surgeon`, `prestation` not populated
2. **Fee calc mismatch:** Allocation and percentage formulas differ; verify `surgeon.contractType`
3. **Material category:** Using wrong category  clinic takes losses; check `material.category`
4. **Price freezing:** Old surgeries keep `adjustedPrice` (by design)  recalculate manually if needed
5. **Admin bypass:** Admin always passes auth checks; test permissions with non-admin user
6. **Async without await:** Mongoose queries must be awaited; wrap in `catchAsync()`
7. **Session lost:** Verify `DB_URL` env var and `connect-mongo` config

---

## Testing Notes
- **No automated tests**  manual testing via UI
- **Pre-seeded users:** Check `seeds/users.js` for test credentials
- **Debug logging:** `controller/report.controller.js` and `config/passportConfig.js` have extensive logging