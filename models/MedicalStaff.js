
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
        required: false
    },
    phone: {
        type: String
    },
    fonctions: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fonction'
    }],
    personalFee: {
        type: Number, // frais personnels pour location horaire
        default: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, { timestamps: true });

module.exports = mongoose.model('MedicalStaff', medicalStaffSchema);