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
    beginDateTime: {
      type: Date,
      required: true,
    },
    endDateTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["urgent", "planned", "in-progress", "completed", "cancelled"],
      default: "planned",
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
      },
    ],
    applyExtraFees: {
      type: Boolean,
      default: false,
    },
    surgeonAmount: {
      type: Number,
      default: 0,
    },
    clinicAmount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Génération automatique du code chirurgie
surgerySchema.pre("save", async function (next) {
  if (!this.code) {
    const count = await this.constructor.countDocuments();
    this.code = "SUR" + String(count + 1).padStart(6, "0");
  }
  next();
});

// Calcul de la durée
surgerySchema.virtual("actualDuration").get(function () {
  if (this.beginDateTime && this.endDateTime) {
    return Math.round((this.endDateTime - this.beginDateTime) / (1000 * 60)); // en minutes
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
