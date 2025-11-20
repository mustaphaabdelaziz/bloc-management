
// models/Prestation.js
const mongoose = require("mongoose");
const prestationSchema = new mongoose.Schema({
    code: {
        type: String,
        unique: true,
        sparse: true
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

// Auto-generate code based on specialty code pattern: CO-SPECIALITY_CODE-XXXX
prestationSchema.pre("save", async function (next) {
    if (!this.code) {
        try {
            // Populate specialty to get its code
            if (!this.populated('specialty')) {
                await this.populate('specialty');
            }
            
            if (!this.specialty) {
                return next(new Error("Specialty is required to generate code"));
            }
            
            const specialtyCode = this.specialty.code || 'UNK';
            // Count prestations for this specialty
            const count = await this.constructor.countDocuments({ specialty: this.specialty._id });
            this.code = `CO-${specialtyCode}-${String(count + 1).padStart(4, "0")}`;
        } catch (error) {
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Prestation', prestationSchema);