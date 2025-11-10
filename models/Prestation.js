
// models/Prestation.js
const mongoose = require("mongoose");
const prestationSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    designation: {
        type: String,
        required: true
    },
    specialty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Specialty',
        required: true
    },
    priceHT: {
        type: Number,
        required: true
    },
    tva: {
        type: Number,
        required: true,
        default: 0.09
    },
    duration: {
        type: Number, // en minutes
        required: true
    },
    exceededDurationUnit: {
        type: Number, // unité de dépassement en minutes
        default: 15
    },
    exceededDurationFee: {
        type: Number, // frais par unité de dépassement
        default: 0
    },
    urgentFeePercentage: {
        type: Number, // pourcentage des frais urgents (ex: 0.10 pour 10%)
        default: 0,
        min: 0,
        max: 1
    },
}, { timestamps: true });

module.exports = mongoose.model('Prestation', prestationSchema);