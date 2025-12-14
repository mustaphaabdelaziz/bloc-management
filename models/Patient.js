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
        required: false,
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
        type: Number,
        min: 0,
        max: 120
    },
    birthdatePresumed: {
        type: Date  // Stores Jan 1st of the presumed year
    },
    phone: {
        type: String
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

// Virtual for calculating current age
patientSchema.virtual('calculatedAge').get(function() {
    if (this.dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(this.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    } else if (this.birthdatePresumed) {
        const today = new Date();
        return today.getFullYear() - this.birthdatePresumed.getFullYear();
    } else if (this.presumedAge !== undefined && this.presumedAge !== null) {
        return this.presumedAge;
    }
    return null;
});

// Validation: ensure mutual exclusivity
patientSchema.pre('validate', function(next) {
    // If full birthdate is provided, clear presumed fields
    if (this.dateOfBirth) {
        this.presumedAge = undefined;
        this.birthdatePresumed = undefined;
    }
    // If no dateOfBirth but presumedAge or birthdatePresumed exists, ensure consistency
    else if ((this.presumedAge !== undefined && this.presumedAge !== null) || this.birthdatePresumed) {
        this.dateOfBirth = undefined;
    }
    next();
});

// Génération automatique du code patient
patientSchema.pre('save', async function(next) {
    // Skip code generation if already has one
    if (this.code && this.code.trim()) {
        return next();
    }
    
    console.log('Generating patient code...');
    let codeGenerated = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!codeGenerated && attempts < maxAttempts) {
        try {
            // Find the last patient code to get the next number
            const lastPatient = await this.constructor.findOne({}, { code: 1 })
                .sort({ code: -1 })
                .limit(1);
            
            let nextNumber = 1;
            if (lastPatient && lastPatient.code) {
                // Extract number from code like "CO-PAT-000003"
                const match = lastPatient.code.match(/CO-PAT-(\d+)/);
                if (match) {
                    nextNumber = parseInt(match[1]) + 1;
                }
            }
            
            this.code = 'CO-PAT-' + String(nextNumber).padStart(6, '0');
            codeGenerated = true;
        } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
                console.error('Failed to generate unique patient code:', error);
                return next(new Error('Impossible de générer un code patient unique après ' + maxAttempts + ' tentatives'));
            }
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
    next();
});

module.exports = mongoose.model('Patient', patientSchema);

// Ensure unique index but allow multiple documents without a NIN
patientSchema.index({ nin: 1 }, { unique: true, sparse: true });