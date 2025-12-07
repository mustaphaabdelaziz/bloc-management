// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    temporaryCode: {
      type: String,
      required: true,
      unique: true,
    },
    operatingRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OperatingRoom',
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    surgeon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Surgeon',
      required: true,
    },
    prestation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prestation',
      required: true,
    },
    scheduledStartTime: {
      type: Date,
      required: true,
    },
    scheduledEndTime: {
      type: Date,
      required: true,
    },
    reservationStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'converted', 'cancelled'],
      default: 'confirmed',
    },
    reservationNotes: {
      type: String,
      default: '',
    },
    convertedToSurgery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Surgery',
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Index for querying reservations by room and time
reservationSchema.index({ operatingRoom: 1, scheduledStartTime: 1, scheduledEndTime: 1 });
reservationSchema.index({ reservationStatus: 1 });
reservationSchema.index({ temporaryCode: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
