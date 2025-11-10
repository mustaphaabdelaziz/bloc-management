
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
        date: Date,
        quantity: Number,
        unitPrice: Number
    }],
    alertLevel: {
        type: Number, // niveau d'alerte pour le stock
        default: 10
    }
}, { timestamps: true });

// Calcul du prix pondéré
materialSchema.virtual('weightedPrice').get(function() {
    // Vérifier si arrivals existe et est un tableau
    if (!this.arrivals || !Array.isArray(this.arrivals) || this.arrivals.length === 0) {
        return this.priceHT;
    }
    
    let totalValue = 0;
    let totalQuantity = 0;
    
    this.arrivals.forEach(arrival => {
        if (arrival.quantity && arrival.unitPrice) {
            totalValue += arrival.quantity * arrival.unitPrice;
            totalQuantity += arrival.quantity;
        }
    });
    
    return totalQuantity > 0 ? totalValue / totalQuantity : this.priceHT;
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