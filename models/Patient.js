const mongoose = require("mongoose");
// models/Patient.js
const patientSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    nin: {
        type: String,
        required: true,
        unique: true
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    fatherName: {
        type: String
    },
    dateOfBirth: {
        type: Date
    },
    presumedAge: {
        type: Number
    },
    phone: {
        type: String
    }
}, { timestamps: true });

// Génération automatique du code patient
patientSchema.pre('save', async function(next) {
    if (!this.code) {
        console.log('Generating patient code...');
        const count = await this.constructor.countDocuments();
        this.code = 'CO-PAT-' + String(count + 1).padStart(6, '0');
    }
    next();
});

module.exports = mongoose.model('Patient', patientSchema);