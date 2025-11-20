// models/Surgery.js
const mongoose = require("mongoose");
const surgerySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      sparse: true,
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
      enum: ["urgent", "planned"],
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
        priceUsed: {
          type: Number, // Price of the material at the time of surgery
          required: true,
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
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Auto-generate surgery code with pattern: YYYY/XXXXX (e.g., 2025/00001)
surgerySchema.pre("save", async function (next) {
  if (!this.code) {
    try {
      const currentYear = new Date().getFullYear();
      // Count surgeries created in the current year
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear + 1, 0, 1);
      const count = await this.constructor.countDocuments({
        createdAt: { $gte: startOfYear, $lt: endOfYear }
      });
      this.code = `${currentYear}/${String(count + 1).padStart(5, "0")}`;
    } catch (error) {
      return next(error);
    }
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
