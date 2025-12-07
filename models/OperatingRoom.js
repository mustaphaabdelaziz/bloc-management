const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const OperatingRoomSchema = new Schema({
    code: {
        type: String,
        required: [true, 'Le code de la salle est requis'],
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, 'Le nom de la salle est requis'],
        trim: true
    },
    capacity: {
        type: Number,
        default: 1,
        min: [1, 'La capacité doit être au moins de 1']
    },
    equipment: [{
        type: String,
        trim: true
    }],
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    location: {
        type: String,
        trim: true
    },
    floor: {
        type: String,
        trim: true
    },
    activeHours: {
        enabled: {
            type: Boolean,
            default: false
        },
        is24_7: {
            type: Boolean,
            default: false
        },
        startTime: {
            type: String,
            default: '08:00'
        },
        endTime: {
            type: String,
            default: '20:00'
        }
    },
    slotDuration: {
        type: Number,
        default: 60,
        min: [15, 'La durée du créneau doit être au minimum 15 minutes'],
        max: [480, 'La durée du créneau doit être au maximum 480 minutes (8 heures)'],
        enum: [15, 30, 45, 60, 90, 120, 180, 240, 480]
    }
}, {
    timestamps: true
});

// Indexes for better query performance
OperatingRoomSchema.index({ code: 1 });
OperatingRoomSchema.index({ isActive: 1 });
OperatingRoomSchema.index({ name: 1 });

// Virtual for display name
OperatingRoomSchema.virtual('displayName').get(function() {
    return `${this.code} - ${this.name}`;
});

// Ensure virtuals are included in JSON
OperatingRoomSchema.set('toJSON', { virtuals: true });
OperatingRoomSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('OperatingRoom', OperatingRoomSchema);
