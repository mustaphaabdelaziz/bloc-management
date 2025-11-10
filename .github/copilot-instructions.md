# AI Coding Agent Instructions for Bloc Management

## Project Overview
**Système de Gestion de Bloc Opératoire** – A healthcare management system for operating room activity, including surgeries, patients, surgeons, medical staff, materials, and financial calculations.

**Stack:** Node.js/Express, MongoDB/Mongoose, EJS templating, Passport.js authentication

---

## Critical Architectural Patterns

### 1. **Role-Based Access Control (RBAC)**
- **Location:** `middleware/rbac.js`, `middleware/auth.js`
- **Key Roles:** `admin`, `medecin` (surgeon), `acheteur` (purchaser), `chefBloc` (operating room manager)
- **Pattern:** All auth checks via `req.user.privileges` array. Admin always bypasses role checks.
- **Route Protection:** Use `catchAsync()` wrapper with `isLoggedIn`, then role middleware like `ensureHeadChief`, `ensureSurgeon`, `requireAny()`
- **Ownership Guards:** `ensureOwnerOrRole()` factory allows medecin to view own surgeries only (filtered by linked surgeon ID)
- **Example:**
  ```javascript
  router.put("/:id", isLoggedIn, ensureHeadChief, catchAsync(updateSurgery));
  ```

### 2. **Complex Fee Calculation System**
- **Two Contract Types:** `allocation` (hourly rate) vs `percentage` (share of prestation price)
- **Key Formula Variations:**
  - **Allocation:** Surgeon pays clinic allocation (duration × rate) + materials + personnel fees (with urgent uplift)
  - **Percentage:** Surgeon receives (netAmount × percentage) - extraFees; clinic gets remainder + personnel + materials
- **Urgent Fee:** Applied as percentage of prestation price when `surgery.status === 'urgent'`
- **Extra Duration Fees:** Only for percentage contracts; applied when `applyExtraFees && actualDuration > prestation.duration`
- **Files:** `controller/surgery.controller.js` (function `calculateSurgeonFees`), `controller/report.controller.js` (revenue aggregation)
- **Critical:** Always use `surgery.adjustedPrice || prestation.priceHT` for dynamic pricing; material cost categorization matters (patient vs clinic)

### 3. **Async Error Handling & Route Pattern**
- **Location:** `utils/catchAsync.js`, `utils/ExpressError.js`
- **Pattern:** All async controllers wrapped in `catchAsync()` → errors auto-propagate to Express error handler
- **No Global Error Handler:** Error handling commented out in `app.js`; add status codes to views as `statusCode` prop
- **Example:**
  ```javascript
  module.exports.surgeryList = catchAsync(async (req, res) => { ... })
  // Usage: router.get("/", isLoggedIn, catchAsync(surgeryList));
  ```

### 4. **Data Population & Relationships**
- **Core Models:** Patient, Surgeon, Surgery (main hub), Prestation, MedicalStaff, Material, User
- **Surgery Schema:** Central aggregator – references patient, surgeon, prestation; embeds consumedMaterials and medicalStaff arrays
- **Pattern:** Always `.populate()` nested refs before calculations (e.g., `populate('surgeon prestation consumedMaterials.material')`)
- **Dates:** Use `moment.js` for formatting; `beginDateTime` stores surgery start, `endDateTime` stores end, `actualDuration` computed field (in minutes)

### 5. **View Locals & Permission Flags**
- **Location:** `config/local.js`
- **Pattern:** Middleware injects `res.locals.currentUser` (req.user) and permission flags (isAdmin, isMedecin, isAcheteur, isChefBloc, etc.)
- **Usage in EJS:** Conditionally render menu items/buttons based on `<% if (permissions.isChefBloc) { ... } %>`
- **Flash Messages:** Support both middleware flash and query params (`?success=` or `?error=`)

---

## Developer Workflows

### Running the Application
```bash
npm install                    # Install dependencies
npm run dev                    # Start with nodemon (watches for changes)
# Or: npm start               # Direct start
# Server runs on PORT env var or defaults to 3000
```

### Database Setup
- Connection: `database/connection.js` (reads `MONGODB_URI` env var)
- Seeding: `seeds/` folder contains pre-configured users (admin/test, medecin@example.com, acheteur@example.com, chefbloc@example.com)
- Run seeds manually if needed: execute with node CLI

### Common Development Tasks
- **Add New Entity:** Create model in `models/`, route in `routes/`, controller in `controller/`, view templates in `views/`
- **Add Permission:** Update `User.privileges` enum in `models/User.js`, add middleware factory in `middleware/rbac.js`, update permission flags in `config/local.js`
- **Modify Fee Calculation:** Update `calculateSurgeonFees()` function and revenue report aggregations in `controller/report.controller.js` simultaneously
- **Add Report:** Create controller method, route, and EJS template in `views/reports/`

---

## Project-Specific Conventions

### Naming & Structure
- **Model Collections:** Singular names in code (Patient, Surgery) → MongoDB auto-pluralizes for DB (patients, surgeries)
- **Route Pattern:** `router.route("/").get(...).post(...)` for list+create; `router.route("/:id").get().put().delete()` for CRUD
- **View Naming:** Match route segment + action (e.g., `/surgeries/new` → `views/surgeries/new.ejs`)
- **Controller Methods:** Suffixed with entity + action (e.g., `surgeryList`, `surgeryList`, `createSurgery`, `viewSurgery`)

### Authentication & Authorization
- **Passport Strategy:** Local strategy using email + bcrypt hash (no passport-local-mongoose); see `config/passportConfig.js`
- **User Model:** Stores `email`, `firstname`, `lastname`, `hash`, `salt`, `privileges` array
- **Password Verification:** `user.verifyPassword(plaintext, hash)` method using bcrypt
- **Session:** Uses MongoDB session store via `connect-mongo`; config in `config/sessionConfig.js`

### Material Management
- **Category Field:** Materials marked as `'patient'` (patient-specific cost) vs clinic-provided
- **Pricing:** Use `weightedPrice` if available, fall back to `priceHT`; critical for allocation vs percentage calculations
- **Seeding:** `seeds/liste_actes.js` initializes prestations; materials must be seeded separately

### Surgery Statuses & Fields
- **Status:** `'planned'` or `'urgent'` (stored in DB as enum)
- **Timestamps:** `createdAt`, `updatedAt` auto-managed by Mongoose
- **Duration:** `beginDateTime`, `endDateTime` set manually; `actualDuration` computed from end - begin (in minutes)
- **Fees Tracking:** `surgeonAmount`, `clinicAmount` calculated and saved on demand via `calculateFees` route

---

## Integration Points & External Dependencies

### Key Dependencies
- **express:** Web framework
- **mongoose:** MongoDB ODM (version 8.18.0)
- **passport + passport-local:** Authentication
- **ejs + ejs-mate:** Templating (ejs-mate for layout support)
- **moment.js:** Date formatting & calculations
- **bcrypt:** Password hashing
- **connect-mongo:** MongoDB session persistence

### Data Flows
1. **Surgery Creation:** Route validates, populates refs, saves to DB, returns view
2. **Fee Calculation:** Async POST route calls `calculateSurgeonFees()`, updates surgery doc, redirects with flash message
3. **Reports:** Aggregate queries with $match, $lookup, $group stages; filter by date range and contract type
4. **Role-Based Filtering:** Controllers check `req.user.privileges`, query constructor modifies `find()` filters (e.g., medecin sees own surgeries only)

### File Organization
- **Routes:** Import controllers and middlewares, define route handlers
- **Controllers:** Business logic; handle req/res, call models, render views
- **Models:** Mongoose schemas with references and methods
- **Middleware:** Auth checks, permission guards, locals injection
- **Views:** EJS templates organized by entity (patients/, surgeries/, reports/)
- **Config:** Environment-specific and framework configurations

---

## Common Pitfalls & Debugging Tips

1. **Missing Populate:** Surgery views fail if surgeon/prestation not populated → always chain `.populate()` in queries
2. **Fee Calculation Mismatch:** Allocation vs percentage calculations differ significantly; check `surgery.surgeon.contractType` before math
3. **Role Bypass:** Admin always bypasses role checks (by design) → test with non-admin user to verify RBAC
4. **Patient Materials:** Filter by `material.category === 'patient'` for net amount calc; mix-up causes clinic losses
5. **Async/Await:** Controllers must use `await` on Mongoose queries; wrap in `catchAsync()` to auto-catch errors
6. **Session Storage:** If session not persisting, verify `MONGODB_URI` and check `connect-mongo` configuration in `config/sessionConfig.js`

---

## Testing & QA Notes
- **No unit/integration tests configured** – manual testing only currently
- **Mock Data:** Pre-seeded users; add surgeries via UI to test calculations
- **Console Logging:** Extensive logging in `controller/report.controller.js` and `config/passportConfig.js` for debugging
