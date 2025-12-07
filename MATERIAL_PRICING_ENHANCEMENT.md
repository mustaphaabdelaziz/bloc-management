# Material Pricing Enhancement Implementation

**Implementation Date:** November 29, 2025  
**Status:** ✅ COMPLETE

## Overview

Enhanced the material pricing system to properly distinguish between **purchase prices** and **selling prices**, streamlined arrival/purchase workflows by making quantity optional, and clarified that stock tracking is informational—surgery consumption never blocks material usage.

---

## Key Changes

### 1. **Purchase Price vs Selling Price Clarity**

#### Schema Updates (`models/Material.js`)
- **`priceHT`**: Now explicitly documented as **base purchase price**
  - Used as manual override when `priceMode='manual'`
  - Serves as fallback when no purchase history exists
  - Comment added: *"Base purchase price - can be used as manual override when priceMode='manual'"*

- **`sellingMarkupPercent`**: Already existed, now prominently exposed in UI
  - Percentage markup applied to purchase price (e.g., 20 = 20% margin)
  - Used by `sellingPriceHT` virtual to compute selling price

#### Virtual Fields (Already Implemented)
- **`weightedPrice`**: Calculates average purchase price from `purchases[]` array
- **`effectivePurchasePrice`**: Returns actual purchase price based on `priceMode`:
  - `'manual'`: Returns `priceHT`
  - `'last'`: Returns most recent purchase price
  - `'average'`: Returns `weightedPrice`
- **`sellingPriceHT`**: Computed as `effectivePurchasePrice × (1 + sellingMarkupPercent/100)`
- **`sellingPriceTTC`**: Selling price with TVA included

### 2. **Quantity-Optional Arrivals**

#### Controller Changes (`controller/material.controller.js`)
- **`createMaterialArrival`**: Quantity now defaults to **1** if not provided
  ```javascript
  quantity: req.body.quantity ? parseFloat(req.body.quantity) : 1
  ```
- **`addPurchase`**: Same default behavior for API endpoint
- **Changed from `parseInt` to `parseFloat`**: Allows decimal quantities (e.g., 2.5 meters of surgical thread)

#### UI Changes (`views/materials/show.ejs`)
- **Arrival Modal**:
  - Quantity field no longer `required`
  - Default value set to `1`
  - Placeholder text: *"Laisser vide ou 1 pour un achat simple"*
  - Help text: *"Laisser vide ou 1 pour un achat simple"*
  - Label changed from "Prix unitaire" to **"Prix d'Achat Unitaire"**

### 3. **UI Label Updates**

#### Create Material Form (`views/materials/new.ejs`)
- **Purchase Price Field**:
  - Label: `Prix d'Achat HT (DA)` (was "Prix HT")
  - Help text: *"Prix d'achat de base (utilisé si pas d'historique)"*
- **Sales Margin Field**: Added next to purchase price
  - Label: `Marge de Vente (%)`
  - Help text: *"Pourcentage de marge appliqué au prix d'achat"*
  - Type: `number`, min: `0`, step: `0.1`

#### Edit Material Form (`views/materials/edit.ejs`)
- Same changes as create form
- Purchase price help text includes unit: *"Prix d'achat de base par <%= material.unitOfMeasure %>"*

#### Material Details Page (`views/materials/show.ejs`)
- Already displays:
  - **Mode de prix**: Manual | Dernier achat | Moyenne
  - **Prix d'achat effectif**: Computed purchase price
  - **Marge de vente**: Percentage
  - **Prix de vente HT**: Computed selling price
  - **Prix de vente TTC**: Selling price with TVA

---

## Surgery Consumption Tracking

### Current Behavior (Verified ✅)
**Location:** `controller/surgery.controller.js` lines 211-275

#### Key Points
1. **Informational Only**: Surgery consumption **NEVER reduces stock**
   ```javascript
   // Material consumption is now informational only - no stock reduction
   // Stock quantities are managed separately through arrivals/purchases
   ```

2. **Price Freezing**: Material prices are frozen at surgery creation
   - **Consumables**: Use `effectivePurchasePrice` (clinic cost)
   - **Patient materials**: Use `sellingPriceHT` (patient billing price with markup)
   - Stored in `consumedMaterials[].priceUsed`

3. **No Blocking**: Materials can always be used in surgeries, regardless of stock levels
   - Stock levels are informational/reporting only
   - Alerts appear when stock is low, but do NOT prevent usage

#### Code Reference
```javascript
// Get current material price to store it permanently
const materialDoc = await Material.findById(materialId);
if (materialDoc) {
  consumedMaterials.push({
    material: materialId,
    quantity: parseFloat(quantity),
    priceUsed: materialDoc.effectivePurchasePrice || materialDoc.weightedPrice || materialDoc.priceHT || 0,
  });
}
```

**Patient Materials** (use selling price for billing):
```javascript
consumedMaterials.push({
  material: material,
  quantity: parseFloat(qty),
  priceUsed: materialDoc.sellingPriceHT || materialDoc.effectivePurchasePrice || ...
});
```

---

## Benefits

### For Users
1. **Clear Terminology**: "Purchase Price" vs "Selling Price" eliminates confusion
2. **Faster Data Entry**: Quantity defaults to 1 for simple purchases
3. **Flexible Margins**: Can set custom markup percentage per material
4. **No Surgery Blocking**: Stock alerts inform but never prevent surgeries

### For System
1. **Accurate Costing**: Purchase prices feed into fee calculations
2. **Proper Billing**: Patient materials use selling price (with markup)
3. **Historical Integrity**: Frozen prices preserve financial records
4. **Decimal Precision**: `parseFloat` instead of `parseInt` for fractional units

---

## Backward Compatibility

### ✅ Maintained
- **Legacy `arrivals[]` array**: Still populated alongside `purchases[]`
- **Existing `priceHT` values**: Continue to work as base purchase price
- **`weightedPrice` fallback**: Uses legacy stock/stockValue if no purchases
- **Stock fields**: `stock`, `stockValue`, `stockMinimum` remain functional

### Migration Notes
- No database migration required
- Existing materials continue to function
- New materials benefit from clearer UI labels
- Users can gradually adopt quantity-optional workflow

---

## Testing Checklist

- [x] Create material with sales margin → verify selling price computed
- [x] Add arrival without quantity → defaults to 1
- [x] Add arrival with decimal quantity (e.g., 2.5) → accepted
- [x] Create surgery with materials → stock unchanged
- [x] Verify consumables use purchase price in `consumedMaterials[].priceUsed`
- [x] Verify patient materials use selling price in `consumedMaterials[].priceUsed`
- [x] Check material details page shows both purchase & selling prices
- [x] Confirm low stock alerts do NOT block surgery creation

---

## Files Modified

### Models
- `models/Material.js` - Added documentation for `priceHT` field

### Controllers
- `controller/material.controller.js` - Quantity defaults, `parseFloat` instead of `parseInt`

### Views
- `views/materials/new.ejs` - Added sales margin field, relabeled purchase price
- `views/materials/edit.ejs` - Same UI changes as new form
- `views/materials/show.ejs` - Quantity optional in arrival modal, relabeled prices

### Documentation
- `MATERIAL_PRICING_ENHANCEMENT.md` - This file

---

## Future Enhancements (Optional)

1. **Stock Enforcement Mode**: Add optional config to block surgeries if stock < 0
2. **Purchase History Report**: Dedicated view for `purchases[]` array
3. **Supplier Management**: Link purchases to supplier entities
4. **Auto-Reorder Alerts**: Email notifications when stock hits alert level
5. **Batch Import**: Excel import for bulk purchase records

---

## Related Documentation

- **RBAC_IMPLEMENTATION.md** - Role-based access to pricing data
- **Architecture Guide** - Material fee calculation integration
- **Surgery Lifecycle** - Material consumption workflow

---

**Implementation completed by GitHub Copilot (Claude Sonnet 4.5)**  
**All changes tested and verified ✅**
