# Custom Surgery Fees Implementation

## Overview
This feature allows users to add ad-hoc custom fees to surgeries (e.g., OVERNIGHT STAY, specialized equipment rental) that are deducted from the surgeon's share during fee calculations.

## Changes Made

### 1. **Database Schema Update** (`models/Surgery.js`)
Added a `customFees` array field to store custom fees:
```javascript
customFees: [
  {
    feeName: {
      type: String,
      required: true,
      trim: true,
    },
    feeAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
]
```

### 2. **Controller Methods** (`controller/surgery.controller.js`)

#### `addCustomFeesToSurgery()`
- POST endpoint handler to add custom fees to a surgery
- Validates that surgery is editable (statusLifecycle !== 'closed')
- Accepts array of fees with `feeName` and `feeAmount`
- Validates fee name and amount before adding
- Triggers fee recalculation after adding fees
- Returns flash message with number of fees added

#### `removeCustomFee()`
- DELETE endpoint handler to remove custom fees
- Validates surgery is editable
- Removes fee by index from customFees array
- Triggers fee recalculation after removal
- Returns flash message

#### Updated `calculateSurgeonFees()`
- Calculates total custom fees from the surgery's customFees array
- **Deducts custom fees from the surgeon's amount**
- **Adds custom fees to the clinic's amount**
- Ensures both amounts don't go negative (clamped to 0)
- Custom fees effectively transfer revenue from surgeon to clinic

**Formula for Percentage Contracts:**
- Surgeon: `((Prix effectif - Matériaux patient) × Taux% - Frais dépassement - Custom fees`
- Clinic: `((Prix effectif - Matériaux patient) × (1 - Taux%) + Matériaux patient + Frais dépassement + Custom fees`

### 3. **Routes** (`routes/surgery.routes.js`)

Added two new routes:
- `POST /:id/add-custom-fees` - Add custom fees to a surgery
- `DELETE /:id/custom-fees/:feeIndex` - Remove a custom fee by index

Both routes require:
- User to be logged in
- User to have head department management privileges

### 4. **UI Implementation** (`views/surgeries/show.ejs`)

#### Added Materials Section Button
- Button added to materials section header to trigger add materials modal
- Button only visible when surgery is editable and user has financial view permissions

#### New Custom Fees Section
- Displays below materials and staff sections
- Shows table of all custom fees with:
  - Fee name
  - Amount in DZD currency format
  - Creation date
  - Delete button (if editable)
- Total custom fees calculated at bottom
- Display message when no custom fees present
- Info alert explaining that fees are deducted from surgeon's share

#### Add Custom Fees Modal (`#addCustomFeesModal`)
- Bootstrap modal with form
- Dynamic fee rows allowing multiple fees to be added at once
- Each row has:
  - Fee name input (required)
  - Amount input in DA (required, min 0)
  - Remove button
- "Add another fee" button to add more rows
- Form validation:
  - At least one fee with valid name and amount required
  - Prevents submission if validation fails
- JavaScript handles:
  - Adding/removing fee rows
  - Disabling remove button when only one row exists
  - Form submission validation

#### Financial Breakdown Update
- Updated rules summary to mention custom fees deduction for percentage contracts
- Notes that custom fees are deducted from surgeon's share

## How It Works

### User Flow
1. User views a surgery and clicks "Add Fees" button (only visible if editable and has permissions)
2. Modal opens with form to enter fee details
3. User enters fee name (e.g., "OVERNIGHT STAY") and amount (e.g., 50000 DA)
4. User can add multiple fees by clicking "Add another fee"
5. User clicks "Add Fees" to submit
6. System adds fees to surgery and recalculates honoraires
7. Custom fees appear in the Custom Fees section
8. User can delete individual fees using trash button

### Fee Calculation Logic
1. System calculates base surgeon and clinic amounts as usual
2. System sums all custom fees
3. **Surgeon amount is reduced by total custom fees**
4. **Clinic amount is increased by total custom fees**
5. Both amounts are clamped to ensure they don't go negative
6. Updated amounts are saved to the Surgery document

### Example Calculation (Percentage Contract at 45%)
- Base prestation price: 100,000 DA
- Patient materials: 10,000 DA
- Surgeon rate: 45%
- Custom fees: 25,000 DA (OVERNIGHT STAY + equipment)

**Calculation:**
1. Effective price = 100,000 × (1 + urgent%) = 100,000 DA
2. Base for split = 100,000 - 10,000 = 90,000 DA
3. Surgeon base = 90,000 × 45% = 40,500 DA
4. Clinic base = 90,000 × 55% + 10,000 = 59,500 DA
5. After custom fees:
   - **Surgeon final: 40,500 - 25,000 = 15,500 DA**
   - **Clinic final: 59,500 + 25,000 = 84,500 DA**

## Restrictions
- Custom fees can only be added/removed while surgery status is "editable"
- Once surgery is closed (statusLifecycle = 'closed'), no new fees can be added
- Only users with head department management role can add/remove custom fees
- Only users with financial info view permissions can see custom fees section

## Notes
- Custom fees are deducted from surgeon amount and added to clinic amount
- Custom fees trigger automatic fee recalculation
- Fees are recorded with timestamps and user who created them
- Fees persist even if materials or staff are changed
- For location contracts, custom fees are still deducted from surgeon (even though surgeon normally gets 0)

## Testing Checklist
- [ ] Add custom fee to editable surgery
- [ ] View custom fee in surgery details
- [ ] Delete custom fee
- [ ] Verify surgeon amount decreases by fee amount
- [ ] Verify clinic amount unchanged
- [ ] Try to add fees to closed surgery (should fail)
- [ ] Verify only proper roles can add fees
- [ ] Multiple fees can be added at once
- [ ] Fee amount doesn't go negative in calculations
