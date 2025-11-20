
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
                return [value];
            }
            // Filter out empty strings from array
            if (Array.isArray(value)) {
                return value.filter(v => v !== '' && v !== null);
            }
            return value;
        }
    },
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

// Calcul du prix moyen pondéré (Perpetual Weighted Average)
materialSchema.virtual('weightedPrice').get(function() {
    // Use perpetual inventory method: current stock value / current stock quantity
    // This ensures the weighted price reflects only the materials currently in stock,
    // not all historical arrivals including consumed quantities
    if (this.stock > 0 && this.stockValue > 0) {
        return this.stockValue / this.stock;
    }
    
    // Fallback to base price if no stock or no stock value recorded
    return this.priceHT;
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
      let specialtyCode = 'GEN';

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