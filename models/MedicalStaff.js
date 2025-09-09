
const mongoose = require("mongoose");
// models/MedicalStaff.js
const medicalStaffSchema = new mongoose.Schema({
    code: {
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
    dateOfBirth: {
        type: Date,
        required: true
    },
    phone: {
        type: String
    },
    fonctions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fonction'
    }],
    personalFee: {
        type: Number, // frais personnels pour allocation horaire
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('MedicalStaff', medicalStaffSchema);