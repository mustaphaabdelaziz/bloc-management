# Material Pricing Quick Reference Guide

## 🎯 Key Concepts

### Purchase Price vs Selling Price

| Field | Description | Usage |
|-------|-------------|-------|
| **Prix d'Achat HT** | What you pay suppliers | Used in fee calculations, clinic costs |
| **Marge de Vente (%)** | Markup percentage | Applied to purchase price |
| **Prix de Vente HT** | What you charge patients | Auto-calculated: Purchase × (1 + Margin%) |

---

## 📦 Adding Stock (Arrivals)

### Simple Purchase (New Workflow)
1. Click "Ajouter Stock" on material details page
2. Enter **Date d'arrivage** (required)
3. Enter **Prix d'Achat Unitaire** (required)
4. **Quantity is optional** - defaults to 1 if blank
5. Optionally add **Date d'achat** for record-keeping

### Bulk Purchase
- Enter quantity (e.g., 50 for a box of 50 gloves)
- System calculates weighted average price automatically

### Decimal Quantities Supported
- Surgical thread: 2.5 meters
- Solutions: 0.5 liters
- Any fractional unit

---

## 💰 How Prices Are Calculated

### Purchase Price (What System Uses)
System determines purchase price based on **Mode de prix**:

| Mode | Source | Use Case |
|------|--------|----------|
| **Moyenne** (Default) | Weighted average of all arrivals | Most accurate for fluctuating prices |
| **Dernier achat** | Most recent purchase | When prices are stable |
| **Manuel** | Fixed `Prix d'Achat HT` | Override when needed |

### Selling Price Formula
```
Prix de Vente HT = Prix d'Achat Effectif × (1 + Marge %)
```

**Example:**
- Purchase price: 1,000 DA
- Sales margin: 20%
- Selling price: 1,000 × 1.20 = **1,200 DA HT**

---

## 🏥 Surgery Material Consumption

### Important: Stock is Informational Only

✅ **Materials can ALWAYS be used in surgeries**  
✅ **Low stock shows alerts but doesn't block usage**  
✅ **Consumption is tracked for reporting only**

### How Prices Are Applied in Surgeries

| Material Type | Price Used | Reason |
|---------------|------------|--------|
| **Consumable** | Purchase Price | Clinic cost/expense |
| **Patient Material** | Selling Price | Patient billing (includes markup) |

### Price Freezing
- Prices are **frozen at surgery creation**
- Stored in `priceUsed` field
- Historical surgeries unaffected by future price changes

---

## 🛠️ Creating/Editing Materials

### Required Fields
- ✅ Designation (name)
- ✅ Prix d'Achat HT (purchase price)
- ✅ TVA (tax rate)
- ✅ Catégorie (consumable or patient)
- ✅ Unité de mesure (unit of measure)

### Optional But Recommended
- **Marge de Vente (%)**: For patient materials, typically 10-30%
- **Spécialité**: Links material to surgical specialties
- **Stock Minimum**: Alerts when stock falls below
- **Marque**: Supplier brand name

---

## 📊 Reading Material Details

### Price Information Display

When viewing a material, you'll see:

```
Mode de prix: Moyenne
Prix d'achat effectif: 1,250 DA    ← What you pay
Marge de vente: 20%                 ← Your markup
Prix de vente HT: 1,500 DA          ← What you charge
Prix de vente TTC: 1,785 DA         ← With 19% TVA
```

### Stock Indicators

| Badge | Meaning | Action |
|-------|---------|--------|
| 🟢 Green | Stock OK | None needed |
| 🟡 Yellow | Below minimum | Consider ordering |
| 🔴 Red | Critical level | Order urgently |

**Remember:** Alerts inform but never prevent usage!

---

## 🔐 Role-Based Access

### Who Can See Prices?
- ✅ **Admin**: Full pricing visibility
- ✅ **Direction**: Full pricing visibility
- ✅ **Buyer**: Full pricing visibility
- ❌ **Head of Department**: No pricing (quantities only)
- ❌ **Assistant**: No pricing (quantities only)

### Who Can Manage Stock?
- ✅ **Admin**: All actions
- ✅ **Buyer**: All actions
- ❌ **Others**: View-only

---

## 💡 Best Practices

### Setting Sales Margins
- **Consumables**: Usually 0% (clinic absorbs cost)
- **Patient Materials** (implants, prostheses): 15-25%
- **High-value devices**: 10-15%
- **Disposables billed to patient**: 20-30%

### Managing Arrivals
- ✅ **Do**: Enter arrivals as they occur for accurate averages
- ✅ **Do**: Use decimal quantities for fractional units
- ✅ **Do**: Add purchase date for audit trail
- ❌ **Don't**: Edit old arrivals (creates inconsistencies)

### Stock Tracking
- Set **Stock Minimum** = typical monthly usage
- Set **Alert Level** = 2 weeks of usage
- Review alerts weekly
- Remember: Stock is informational, not blocking

---

## 🔄 Workflow Examples

### Example 1: Simple Consumable (Gloves)
1. Create material:
   - Designation: "Gants Stériles Taille 7"
   - Prix d'Achat HT: 500 DA (per box)
   - Marge de Vente: 0% (clinic cost)
   - Catégorie: Consumable
2. Add arrival:
   - Date: Today
   - Quantity: 10 (boxes)
   - Prix: 500 DA
3. Use in surgery:
   - System tracks 1 box consumed
   - Uses purchase price (500 DA) in fee calculation
   - Stock remains 10 (informational)

### Example 2: Patient Material (Prosthesis)
1. Create material:
   - Designation: "Prothèse Hanche Ciment"
   - Prix d'Achat HT: 50,000 DA
   - Marge de Vente: 20%
   - Catégorie: Patient
2. Add arrival:
   - Date: Today
   - Quantity: (leave blank, defaults to 1)
   - Prix: 50,000 DA
3. Use in surgery:
   - System tracks 1 prosthesis consumed
   - Uses **selling price** (60,000 DA) for patient billing
   - Stock remains informational

---

## ❓ FAQ

**Q: What if I forget to enter quantity?**  
A: No problem! It defaults to 1, which works for most single-item purchases.

**Q: Can I change prices after surgeries used the material?**  
A: Yes! Old surgeries keep their frozen prices, new surgeries use current prices.

**Q: What happens if stock shows 0 but I need to use material?**  
A: You can still use it! Stock is informational—just add an arrival to update records.

**Q: Should I set sales margin for all materials?**  
A: Only for **patient materials** (implants, devices billed to patients). Consumables typically have 0% margin.

**Q: How do I switch from manual to average pricing?**  
A: Edit the material and change **Mode de prix** to "Moyenne".

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Selling price seems wrong | Check **Marge de Vente (%)** field |
| Average price not updating | Ensure arrivals are being recorded |
| Can't see prices | Check your role (only admin/direction/buyer can see) |
| Stock alerts annoying | Adjust **Stock Minimum** to higher threshold |
| Decimal quantity rejected | Update app—older versions may require integers |

---

**For technical details, see:** `MATERIAL_PRICING_ENHANCEMENT.md`
