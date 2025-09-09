
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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty'
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
    if (this.arrivals.length === 0) return this.priceHT;
    
    let totalValue = 0;
    let totalQuantity = 0;
    
    this.arrivals.forEach(arrival => {
        totalValue += arrival.quantity * arrival.unitPrice;
        totalQuantity += arrival.quantity;
    });
    
    return totalQuantity > 0 ? totalValue / totalQuantity : this.priceHT;
});
materialSchema.pre('save', async function(next) {
  try {
    if (!this.code) {
      const Specialty = mongoose.model('Specialty');
      
      let specialtyCode = 'GEN';
      if (this.specialty) {
        try {
          const specialty = await Specialty.findById(this.specialty);
          if (specialty && specialty.code) {
            specialtyCode = specialty.code;
          }
        } catch (error) {
          // If specialty lookup fails, use default
          console.warn('Could not find specialty for code generation:', error.message);
        }
      }

      // Generate code: MAT-{specialtyCode}-{incremental number}
      const prefix = `MAT-${specialtyCode}-`;
      const lastMaterial = await this.constructor.findOne({ code: { $regex: `^${prefix}` } })
        .sort({ code: -1 })
        .limit(1);

      let nextNumber = 1;
      if (lastMaterial) {
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
    next(error);
  }
});

module.exports = mongoose.model('Material', materialSchema);