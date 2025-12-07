# AI Coding Agent Instructions for Bloc Management

**Operating Room Management System**  Healthcare management for surgeries, patients, surgeons, staff, materials, and dynamic fee calculations (location vs. percentage contracts).

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
  # AI Coding Agent Instructions for Bloc Management (Consolidated)

  This file consolidates repository documentation and developer guidance. The long-form per-feature and implementation Markdown files in the repository have been merged into this single, focused reference. The originals were removed from the repository to reduce duplication; if you prefer them kept, I can restore or move them to an `archive/` folder.

  Quick reference (high level):

  - **Stack:** Node.js (Express), MongoDB (Mongoose), EJS / `ejs-mate`, Passport.js (local), SCSS for styles.

  - **RBAC:**
    - Roles recorded on `req.user.privileges` (array). `admin` bypasses checks.
    - Guard factories and checks live in `middleware/` (e.g., `auth.js`, `rbac.js`).
    - Use `res.locals.permissions` in views to gate UI elements and data.

  - **Fee Calculation (core behavior):**
    - Two contract types: `location` (hourly clinic rate) and `percentage` (surgeon revenue split).
    - Calculation function saves `surgeonAmount` and `clinicAmount` on the `Surgery` document.
    - Use frozen prices: `surgery.adjustedPrice || prestation.priceHT` and `consumedMaterials[].priceUsed`.
    - Patient-category materials are excluded from surgeon splits (assigned to clinic).
    - Extra fees apply only when `applyExtraFees` is true and actual duration exceeds expected duration.

  - **Surgery data model:**
    - Populate `patient`, `surgeon`, and `prestation` before running fee logic.
    - `consumedMaterials` should include a frozen `priceUsed` per item.
    - `medicalStaff` entries include `personalFee` used to compute staff-related charges.
    - Compute `actualDuration` from `beginDateTime` / `endDateTime` (minutes).

  - **Conventions:**
    - Models in `models/`, controllers in `controller/`, routes in `routes/`, views in `views/`.
    - Use Bootstrap modals for new/edit/delete UI (consistent with project patterns).
    - SCSS source files under `public/css/` and compile to `public/css/*.css` for deployment.

  - **Error handling & async:**
    - Wrap route handlers with `catchAsync()` and await Mongoose calls to avoid unhandled rejections.

  - **Running locally:**
    - `npm install` then `npm run dev` (nodemon) or `npm start`.
    - Ensure `DB_URL` and other env vars are set; sessions use `connect-mongo`.

  - **Money and rounding:**
    - Clamp monetary outputs to be non-negative and round to 2 decimals where appropriate.

  If you want a restored copy of any removed Markdown file, I can re-create it from the archive I used to produce this summary.

  --
  Generated: consolidated documentation and removal of per-feature `.md` files.