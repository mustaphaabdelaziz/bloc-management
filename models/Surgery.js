// models/Surgery.js
const mongoose = require("mongoose");
const surgerySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    surgeon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Surgeon",
      required: true,
    },
    prestation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prestation",
      required: true,
    },
    entreeBloc: {
      type: Date,
    },
    entreeSalle: {
      type: Date,
    },
    sortieSalle: {
      type: Date,
    },
    incisionTime: {
      type: Date,
      required: true,
    },
    closingIncisionTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["urgent", "planned"],
      default: "planned",
    },
    statusLifecycle: {
      type: String,
      enum: ["editable", "closed"],
      default: "editable",
    },
    closedAt: {
      type: Date,
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    medicalStaff: [
      {
        staff: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MedicalStaff",
        },
        rolePlayedId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Fonction",
        },
      },
    ],
    consumedMaterials: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material",
        },
        quantity: {
          type: Number,
          required: true,
        },
        priceUsed: {
          type: Number, // Price per unit of the material at the time of surgery
          required: true,
        },
        unitOfMeasure: {
          type: String, // Frozen unit of measure (e.g., 'mètre (m)', 'litre (L)', 'pièce (Pce)')
          required: false, // Optional for backward compatibility with existing data
        },
        patientReference: {
          type: String, // Reference/serial/lot number of the material consumed by this patient
          trim: true,
          required: false, // Optional for backward compatibility
        },
      },
    ],
    applyExtraFees: {
      type: Boolean,
      default: false,
    },
    adjustedPrice: {
      type: Number, // Prix ajusté pour cette chirurgie spécifique (si différent du prix de base)
      default: null,
    },
    surgeonAmount: {
      type: Number,
      default: 0,
    },
    clinicAmount: {
      type: Number,
      default: 0,
    },
    paymentTracking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment"
    },
    asaClass: {
      type: String,
      enum: ["I", "II", "III"],
      default: null,
    },
    asaUrgent: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
    },
    // Operating Room Reservation Fields
    operatingRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OperatingRoom',
      default: null
    },
    scheduledStartTime: {
      type: Date,
      default: null
    },
    scheduledEndTime: {
      type: Date,
      default: null
    },
    reservationStatus: {
      type: String,
      enum: ['reserved', 'confirmed', 'cancelled', 'completed'],
      default: null
    },
    reservationNotes: {
      type: String,
      trim: true
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
    },
  },
  { timestamps: true }
);

// Calcul de la durée
surgerySchema.virtual("actualDuration").get(function () {
  if (this.incisionTime && this.closingIncisionTime) {
    return Math.round((this.closingIncisionTime - this.incisionTime) / (1000 * 60)); // en minutes
  }
  return 0;
});

// Vérification du dépassement de durée
surgerySchema.virtual("isDurationExceeded").get(function () {
  return (
    this.populated("prestation") &&
    this.actualDuration > this.prestation.duration
  );
});

module.exports = mongoose.model("Surgery", surgerySchema);
