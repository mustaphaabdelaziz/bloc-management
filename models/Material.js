
const mongoose = require("mongoose");
// models/Material.js
const materialSchema = new mongoose.Schema({
    code: {
        type: String,
        required: false,
        unique: true
    },
    designation: {
        type: String,
        required: true
    },
    reference: {
        type: String,
        required: false
    },
    // Base purchase price - can be used as manual override when priceMode='manual'
    // Otherwise serves as fallback when no purchase history exists
    priceHT: {
        type: Number,
        required: true
    },
    tva: {
        type: Number,
        required: true,
        default: 0.19
    },
    specialty: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Specialty'
        }],
        set: function(value) {
            // Handle empty strings, null, or empty arrays
            if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
                return undefined;
            }
            // If it's a single value, convert to array
            if (!Array.isArray(value) && value) {
                // Filter out 'all' sentinel value
                if (value === 'all') return undefined;
                return [value];
            }
            // Filter out empty strings and 'all' sentinel from array
            if (Array.isArray(value)) {
                const filtered = value.filter(v => v !== '' && v !== null && v !== 'all');
                return filtered.length > 0 ? filtered : undefined;
            }
            return value;
        }
    },
    // Flag indicating material applies to all specialties (shown in every specialty filter)
    appliesToAllSpecialties: {
        type: Boolean,
        default: false
    },
    // Legacy stock fields - kept for backward compatibility but no longer mutated on surgery consumption
    stock: {
        type: Number,
        default: 0
    },
    stockValue: {
        type: Number,
        default: 0
    },
    brand: {
        type: String,
        required: false
    },
    stockMinimum: {
        type: Number,
        default: 10
    },
    category: {
        type: String,
        enum: ['consumable', 'patient'],
        required: true
    },
    unitOfMeasure: {
        type: String,
        required: true
    },
    // Selling markup percentage to derive selling price from average purchase price
    // e.g., 20 means selling price = averagePrice * 1.20
    sellingMarkupPercent: {
        type: Number,
        default: 0,
        min: 0
    },
    // Price selection mode: 'average' (computed from purchases), 'manual' (use priceHT as override), 'last' (use last purchase price)
    priceMode: {
        type: String,
        enum: ['average', 'manual', 'last'],
        default: 'average'
    },
    // Purchase history - records each purchase with date and price (quantity optional, informational only)
    purchases: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            auto: true
        },
        date: {
            type: Date,
            required: true,
            default: Date.now
        },
        priceHT: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            default: 1  // Informational only, not used for stock tracking
        },
        supplier: {
            type: String,
            required: false
        },
        invoiceRef: {
            type: String,
            required: false
        },
        notes: {
            type: String,
            required: false
        }
    }],
    // Legacy arrivals - kept for backward compatibility with existing data
    arrivals: [{
        _id: {
            type: mongoose.Schema.Types.ObjectId,
            auto: true
        },
        date: Date,
        quantity: Number,
        unitPrice: Number,
        purchaseDate: Date
    }],
    alertLevel: {
        type: Number, // niveau d'alerte pour le stock
        default: 10
    },
    // Audit fields
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    // Unit tracking for patient-type materials
    units: [{
        arrivalId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false  // Allow existing units without arrivalId to remain
        },
        serialNumber: {
            type: String,
            required: false  // Allow temp/empty serial numbers during initial creation
        },
        barcode: {
            type: String,
            required: false
        },
        purchaseDate: {
            type: Date,
            required: true
        },
        expirationDate: {
            type: Date,
            required: false
        },
        unitPrice: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['in_stock', 'used', 'damaged', 'lost', 'expired'],
            default: 'in_stock'
        },
        usedInSurgery: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Surgery',
            required: false
        },
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Patient',
            required: false
        },
        notes: {
            type: String,
            required: false
        },
        batch: {
            type: String,
            required: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Calcul du prix moyen pondéré (from purchases array, or fallback to arrivals for legacy data)
materialSchema.virtual('weightedPrice').get(function() {
    // New system: calculate from purchases array
    if (this.purchases && this.purchases.length > 0) {
        // Calculate weighted average based on quantity (informational) or simple average if no quantities
        let totalValue = 0;
        let totalQuantity = 0;
        
        this.purchases.forEach(p => {
            const qty = p.quantity || 1;
            totalValue += p.priceHT * qty;
            totalQuantity += qty;
        });
        
        return totalQuantity > 0 ? totalValue / totalQuantity : this.priceHT;
    }
    
    // Legacy fallback: use perpetual inventory method from arrivals
    if (this.stock > 0 && this.stockValue > 0) {
        return this.stockValue / this.stock;
    }
    
    // Final fallback to base price
    return this.priceHT;
});

// Get the effective purchase price based on priceMode setting
materialSchema.virtual('effectivePurchasePrice').get(function() {
    switch (this.priceMode) {
        case 'manual':
            return this.priceHT;
        case 'last':
            if (this.purchases && this.purchases.length > 0) {
                // Get the most recent purchase
                const sorted = [...this.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
                return sorted[0].priceHT;
            }
            // Fallback to legacy arrivals
            if (this.arrivals && this.arrivals.length > 0) {
                const sorted = [...this.arrivals].sort((a, b) => new Date(b.date) - new Date(a.date));
                return sorted[0].unitPrice;
            }
            return this.priceHT;
        case 'average':
        default:
            return this.weightedPrice;
    }
});

// Calculate selling price: effectivePurchasePrice * (1 + sellingMarkupPercent/100)
materialSchema.virtual('sellingPriceHT').get(function() {
    const basePrice = this.effectivePurchasePrice;
    const markup = this.sellingMarkupPercent || 0;
    return basePrice * (1 + markup / 100);
});

// Selling price with TVA
materialSchema.virtual('sellingPriceTTC').get(function() {
    return this.sellingPriceHT * (1 + (this.tva || 0));
});

// Check if stock is at or below alert level
materialSchema.virtual('isLowStock').get(function() {
    return this.stock <= this.stockMinimum;
});

// Check if stock is critically low (at or below alertLevel)
materialSchema.virtual('isCriticalStock').get(function() {
    return this.stock <= this.alertLevel;
});

// Get count of units by status
materialSchema.virtual('unitsInStock').get(function() {
    if (!this.units || !Array.isArray(this.units)) return 0;
    return this.units.filter(u => u.status === 'in_stock').length;
});

materialSchema.virtual('unitsExpired').get(function() {
    if (!this.units || !Array.isArray(this.units)) return 0;
    return this.units.filter(u => u.status === 'expired' || (u.expirationDate && new Date() > new Date(u.expirationDate))).length;
});

materialSchema.virtual('unitsExpiringSoon').get(function() {
    if (!this.units || !Array.isArray(this.units)) return 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.units.filter(u => 
        u.expirationDate && 
        u.status === 'in_stock' &&
        new Date(u.expirationDate) <= thirtyDaysFromNow && 
        new Date(u.expirationDate) > now
    ).length;
});

materialSchema.virtual('unitsUsed').get(function() {
    if (!this.units || !Array.isArray(this.units)) return 0;
    return this.units.filter(u => u.status === 'used').length;
});
materialSchema.pre('save', async function(next) {
  try {
    if (!this.code) {
      let specialtyCode = this.appliesToAllSpecialties ? 'ALL' : 'GEN';

      if (this.specialty && Array.isArray(this.specialty) && this.specialty.length > 0) {
        if (this.specialty.length === 1) {
          // Single specialty
          try {
            const Specialty = mongoose.model('Specialty');
            const specialty = await Specialty.findById(this.specialty[0]);
            if (specialty && specialty.code) {
              specialtyCode = specialty.code;
            }
          } catch (error) {
            console.warn('Could not find specialty for code generation, using GEN:', error.message);
            specialtyCode = 'GEN';
          }
        } else {
          // Multiple specialties
          specialtyCode = 'MUL';
        }
      } else if (this.specialty && !Array.isArray(this.specialty)) {
        // Single specialty (backward compatibility)
        try {
          const Specialty = mongoose.model('Specialty');
          const specialty = await Specialty.findById(this.specialty);
          if (specialty && specialty.code) {
            specialtyCode = specialty.code;
          }
        } catch (error) {
          console.warn('Could not find specialty for code generation, using GEN:', error.message);
          specialtyCode = 'GEN';
        }
      }

      // Generate code: MAT-{specialtyCode}-{incremental number}
      const prefix = `MAT-${specialtyCode}-`;
      const lastMaterial = await this.constructor.findOne({ code: { $regex: `^${prefix}` } })
        .sort({ code: -1 })
        .limit(1);

      let nextNumber = 1;
      if (lastMaterial && lastMaterial.code) {
        const lastCode = lastMaterial.code;
        const parts = lastCode.split('-');
        if (parts.length >= 3) {
          const lastNumber = parseInt(parts[parts.length - 1]);
          if (!isNaN(lastNumber)) {
            nextNumber = lastNumber + 1;
          }
        }
      }

      this.code = `${prefix}${nextNumber.toString().padStart(3, '0')}`;
    }
    next();
  } catch (error) {
    console.error('Error in material pre-save hook:', error);
    next(error);
  }
});

module.exports = mongoose.model('Material', materialSchema);