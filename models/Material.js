
const mongoose = require("mongoose");
// models/Material.js
const materialSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
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
    }]
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

module.exports = mongoose.model('Material', materialSchema);