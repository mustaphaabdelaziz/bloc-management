# Custom Fees - User Guide

## What are Custom Fees?

Custom fees are special charges that can be added to a specific surgery. These are one-time fees that don't fit into the standard material or personnel categories. 

**Examples:**
- OVERNIGHT STAY (patient remained in hospital overnight)
- Specialized equipment rental
- Special facility fees
- Additional consultation fees
- Emergency response fees

## How to Add Custom Fees

### Step 1: Open Surgery Details
Navigate to the surgery you want to edit and open its details page.

### Step 2: Click "Add Fees"
Scroll to the **"Custom Fees"** section and click the **"Add Fees"** button in the header.

### Step 3: Enter Fee Details
A modal dialog will appear. For each fee you want to add:
- **Fee Name**: Enter a descriptive name (e.g., "OVERNIGHT STAY")
- **Amount**: Enter the fee amount in DA (e.g., 50000)

### Step 4: Add Multiple Fees (Optional)
Click **"Add another fee"** to add more fees to the same surgery.

### Step 5: Submit
Click **"Add the Fees"** button to save all fees.

## Viewing Custom Fees

Once fees are added, they appear in the **Custom Fees** section with:
- Fee name
- Amount in DZD format
- Date added
- Delete button (for removal if needed)
- **Total Custom Fees** at the bottom

## Impact on Calculations

### For Percentage Contracts
When a surgeon is on a percentage contract (e.g., 45%), custom fees are **deducted from surgeon and added to clinic**:

```
Surgeon's Base Amount:    100,000 DA
- Custom Fees:           -25,000 DA (OVERNIGHT + equipment)
= Surgeon Final Amount:    75,000 DA

Clinic's Base Amount:     150,000 DA
+ Custom Fees:           +25,000 DA
= Clinic Final Amount:    175,000 DA
```

### For Location Contracts
Location-based surgeons have fixed hourly rates, but custom fees still apply:
- Custom fees are still deducted from surgeon amount
- Custom fees are added to clinic amount

### Summary
- **Custom fees transfer revenue from surgeon to clinic**
- The surgeon pays for the special service/fee
- The clinic receives the custom fee amount

## Deleting Custom Fees

1. Find the fee in the Custom Fees section
2. Click the **trash icon** on the right
3. Confirm deletion
4. Fee is removed and surgeon amount is recalculated upward, clinic amount downward


## Important Notes

✓ Custom fees can only be added/removed while surgery status is **"editable"**
✓ Once a surgery is **closed**, no new fees can be added
✓ Fees are immediately visible to all users with access to the surgery
✓ Fees trigger automatic recalculation of surgeon and clinic amounts
✓ All fee amounts must be positive numbers

## Example Scenarios

### Scenario 1: Overnight Stay
- Surgery prestation: 200,000 DA
- Surgeon percentage: 50%
- Surgeon base amount: 100,000 DA
- Clinic base amount: 100,000 DA
- Add custom fee: OVERNIGHT STAY = 30,000 DA
- **Final surgeon amount: 70,000 DA** (reduced by fee)
- **Final clinic amount: 130,000 DA** (increased by fee)

### Scenario 2: Multiple Fees
- Surgery prestation: 500,000 DA
- Surgeon percentage: 40%
- Surgeon base amount: 200,000 DA
- Clinic base amount: 300,000 DA
- Add custom fees:
  - OVERNIGHT STAY = 40,000 DA
  - Specialized equipment = 25,000 DA
  - Extra consultation = 15,000 DA
  - Total fees: 80,000 DA
- **Final surgeon amount: 120,000 DA** (200,000 - 80,000)
- **Final clinic amount: 380,000 DA** (300,000 + 80,000)

## Troubleshooting

**Q: I can't see the "Add Fees" button**
A: Make sure:
- You have the necessary permissions (head department management)
- The surgery status is "editable" (not closed)
- You have access to view financial information

**Q: The fee didn't save**
A: Check:
- Fee name is not empty
- Fee amount is a positive number
- Surgery is still editable
- You have the required permissions

**Q: Where is the custom fee deducted from?**
A: Custom fees are deducted from the **surgeon's amount**, not the clinic's. The clinic receives the same amount regardless of custom fees.
